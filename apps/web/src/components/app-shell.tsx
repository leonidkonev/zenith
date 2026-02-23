'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { api, clearToken, resolveMediaUrl } from '@/lib/api';
import { disconnectSocket, getSocket } from '@/lib/socket';

type Server = {
  id: string;
  name: string;
  iconUrl: string | null;
  channels?: { id: string; name: string; type: string; position?: number }[];
  members?: { user: { status?: string } }[];
};

type DmChannel = { id: string; users: { id: string; username: string; displayName: string | null; avatarUrl: string | null; status?: string }[] };

export function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [servers, setServers] = useState<Server[]>([]);
  const [dmChannels, setDmChannels] = useState<DmChannel[]>([]);
  const [selectedServerId, setSelectedServerId] = useState<string | null>(null);
  const [selectedChannelId, setSelectedChannelId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [joinOpen, setJoinOpen] = useState(false);
  const [modeOpen, setModeOpen] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [createName, setCreateName] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [channelName, setChannelName] = useState('');
  const [creatingChannel, setCreatingChannel] = useState(false);
  const [channelError, setChannelError] = useState<string | null>(null);
  const [serverMenu, setServerMenu] = useState<{ serverId: string; x: number; y: number } | null>(null);
  const [channelDragId, setChannelDragId] = useState<string | null>(null);
  const manuallySelectedServerRef = useRef<string | null>(null);

  const isDmView = pathname?.startsWith('/app/dm');

  const mutedServers = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('zenith_muted_servers') || '[]') as string[] : [];

  const loadServers = () => api<Server[]>('/servers').then(setServers).catch(() => setServers([]));
  const loadDms = () => api<DmChannel[]>('/dm-channels').then(setDmChannels).catch(() => setDmChannels([]));

  useEffect(() => {
    loadServers();
    loadDms();
  }, []);

  useEffect(() => {
    const s = getSocket();
    if (!s) return;
    const onPresence = (p: { userId: string; status: string }) => {
      setServers((prev) => prev.map((sv) => ({
        ...sv,
        members: sv.members?.map((m) => m),
      })));
      setDmChannels((prev) => prev.map((dm) => ({
        ...dm,
        users: dm.users.map((u) => (u.id === p.userId ? { ...u, status: p.status } : u)),
      })));
    };
    s.on('presence', onPresence);
    return () => { s.off('presence', onPresence); };
  }, []);

  useEffect(() => {
    const close = () => setServerMenu(null);
    window.addEventListener('click', close);
    return () => window.removeEventListener('click', close);
  }, []);

  const channelIdFromPath = pathname?.startsWith('/app/channel/')
    ? pathname.replace(/^\/app\/channel\//, '').split('/')[0]
    : null;

  useEffect(() => {
    if (isDmView) return;
    if (!servers.length) return;
    if (channelIdFromPath) {
      const server = servers.find((s) => s.channels?.some((c) => c.id === channelIdFromPath));
      if (server) {
        setSelectedServerId(server.id);
        setSelectedChannelId(channelIdFromPath);
        manuallySelectedServerRef.current = null;
      }
      return;
    }
    const manualServerId = manuallySelectedServerRef.current;
    if (manualServerId) {
      setSelectedServerId(manualServerId);
      setSelectedChannelId(null);
      manuallySelectedServerRef.current = null;
    } else if (!selectedServerId && servers.length > 0) {
      const firstServer = servers[0];
      setSelectedServerId(firstServer.id);
      const firstText = firstServer.channels?.find((c) => c.type === 'text');
      if (firstText) router.replace(`/app/channel/${firstText.id}`);
    }
  }, [servers, channelIdFromPath, router, selectedServerId, isDmView]);

  const currentServer = servers.find((s) => s.id === selectedServerId);
  const channels = (currentServer?.channels ?? []).filter((c) => c.type === 'text').sort((a, b) => (a.position ?? 0) - (b.position ?? 0));

  function handleLogout() {
    clearToken();
    disconnectSocket();
    router.replace('/');
    router.refresh();
  }

  async function createInviteForServer(serverId: string) {
    try {
      const server = servers.find((s) => s.id === serverId);
      const channel = server?.channels?.find((c) => c.type === 'text');
      if (!channel) throw new Error('No text channel found');
      const inv = await api<{ code: string }>(`/invites/servers/${serverId}/channels/${channel.id}`, { method: 'POST', body: JSON.stringify({ expiresIn: 86400 }) });
      await navigator.clipboard.writeText(`${window.location.origin}/invite/${inv.code}`);
      alert('Invite link copied');
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to create invite');
    }
  }

  function toggleMuteServer(serverId: string) {
    const current = new Set(JSON.parse(localStorage.getItem('zenith_muted_servers') || '[]') as string[]);
    if (current.has(serverId)) current.delete(serverId); else current.add(serverId);
    localStorage.setItem('zenith_muted_servers', JSON.stringify(Array.from(current)));
    loadServers();
  }

  async function leaveServer(serverId: string) {
    if (!confirm('Leave this server?')) return;
    try {
      await api(`/servers/${serverId}/members/me`, { method: 'DELETE' });
      await loadServers();
      router.push('/app');
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to leave server');
    }
  }

  async function reorderChannel(targetId: string) {
    if (!channelDragId || !selectedServerId || channelDragId === targetId) return;
    const ordered = [...channels];
    const from = ordered.findIndex((c) => c.id === channelDragId);
    const to = ordered.findIndex((c) => c.id === targetId);
    if (from < 0 || to < 0) return;
    const [item] = ordered.splice(from, 1);
    ordered.splice(to, 0, item);
    for (let i = 0; i < ordered.length; i++) {
      await api(`/servers/${selectedServerId}/channels/${ordered[i].id}`, { method: 'PATCH', body: JSON.stringify({ position: i }) });
    }
    loadServers();
  }

  return (
    <div className="flex h-screen bg-space-950 text-gray-100">
      <aside className="w-[72px] flex flex-col items-center py-3 bg-space-900/90 backdrop-blur-sm border-r border-white/5 flex-shrink-0">
        <Link href="/app/dm" className="w-12 h-12 rounded-2xl bg-space-600 flex items-center justify-center text-space-200 font-bold mb-2 hover:rounded-xl hover:bg-space-300 transition-all duration-200">Z</Link>
        <div className="w-8 h-px bg-white/10 my-2" />
        {servers.map((s) => {
          const muted = mutedServers.includes(s.id);
          const hasOnline = Boolean(s.members?.some((m) => m.user.status === 'online'));
          return (
            <button
              key={s.id}
              type="button"
              onContextMenu={(e) => { e.preventDefault(); setServerMenu({ serverId: s.id, x: e.clientX, y: e.clientY }); }}
              onClick={() => {
                const firstText = s.channels?.find((c) => c.type === 'text');
                if (firstText) router.push(`/app/channel/${firstText.id}`);
                else { manuallySelectedServerRef.current = s.id; router.push('/app'); }
              }}
              className={`relative w-12 h-12 rounded-2xl flex items-center justify-center font-semibold mb-2 transition-all duration-200 ${selectedServerId === s.id ? 'bg-space-300 text-white rounded-xl' : 'bg-space-600 text-gray-300 hover:rounded-xl hover:bg-space-500'}`}
            >
              {s.iconUrl ? <img src={resolveMediaUrl(s.iconUrl)} alt="" className="w-full h-full rounded-xl object-cover" /> : s.name[0].toUpperCase()}
              <span className={`absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full ${hasOnline ? 'bg-green-400' : 'bg-gray-600'}`} />
              {muted ? <span className="absolute -bottom-1 -right-1 text-[9px] bg-black/70 rounded px-1">M</span> : null}
            </button>
          );
        })}
        <button type="button" onClick={() => setModeOpen(true)} className="w-12 h-12 rounded-2xl bg-space-600 text-gray-400 hover:bg-space-500 hover:text-white flex items-center justify-center text-xl transition-all duration-200" title="Create / Join">+</button>
      </aside>

      {serverMenu && (
        <div className="fixed z-50 bg-space-900 border border-white/10 rounded-lg shadow-xl p-1" style={{ left: serverMenu.x, top: serverMenu.y }}>
          <button className="block w-full text-left px-3 py-1.5 text-sm hover:bg-white/10 rounded" onClick={() => { createInviteForServer(serverMenu.serverId); setServerMenu(null); }}>Quick invite</button>
          <button className="block w-full text-left px-3 py-1.5 text-sm hover:bg-white/10 rounded" onClick={() => { toggleMuteServer(serverMenu.serverId); setServerMenu(null); }}>Mute / unmute</button>
          <button className="block w-full text-left px-3 py-1.5 text-sm hover:bg-white/10 rounded text-red-300" onClick={() => { leaveServer(serverMenu.serverId); setServerMenu(null); }}>Leave server</button>
        </div>
      )}

      {modeOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setModeOpen(false)}>
          <div className="glass p-6 rounded-2xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-semibold mb-4">Create or join server</h2>
            <div className="grid grid-cols-2 gap-2 mb-4">
              <button className="px-3 py-2 rounded bg-space-300" onClick={() => { setCreateOpen(true); setModeOpen(false); }}>Create new</button>
              <button className="px-3 py-2 rounded bg-space-700" onClick={() => { setJoinOpen(true); setModeOpen(false); }}>Join by invite</button>
            </div>
          </div>
        </div>
      )}

      {createOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setCreateOpen(false)}>
          <div className="glass p-6 rounded-2xl w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-semibold mb-4">Create server</h2>
            <input value={createName} onChange={(e) => setCreateName(e.target.value)} placeholder="Server name" className="w-full px-3 py-2 rounded-lg bg-space-900/80 border border-white/10 text-gray-100 mb-4" />
            <div className="flex gap-2 justify-end">
              <button type="button" onClick={() => setCreateOpen(false)} className="px-4 py-2 rounded-lg text-gray-400 hover:bg-white/5">Cancel</button>
              <button
                type="button"
                disabled={creating || !createName.trim()}
                onClick={async () => {
                  setCreating(true); setCreateError(null);
                  try {
                    const s = await api<Server>('/servers', { method: 'POST', body: JSON.stringify({ name: createName.trim() }) });
                    setCreateOpen(false); setCreateName(''); loadServers();
                    const ch = s.channels?.find((c) => c.type === 'text');
                    if (ch) router.push(`/app/channel/${ch.id}`);
                  } catch (e) { setCreateError(e instanceof Error ? e.message : 'Could not create server'); }
                  finally { setCreating(false); }
                }}
                className="px-4 py-2 rounded-lg bg-space-300 text-white disabled:opacity-50"
              >Create</button>
            </div>
            {createError ? <p className="text-sm text-red-400 mt-3">{createError}</p> : null}
          </div>
        </div>
      )}

      {joinOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setJoinOpen(false)}>
          <div className="glass p-6 rounded-2xl w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-semibold mb-4">Join server by invite</h2>
            <input value={joinCode} onChange={(e) => setJoinCode(e.target.value)} placeholder="Invite code" className="w-full px-3 py-2 rounded-lg bg-space-900/80 border border-white/10 text-gray-100 mb-4" />
            <div className="flex gap-2 justify-end">
              <button type="button" onClick={() => setJoinOpen(false)} className="px-4 py-2 rounded-lg text-gray-400 hover:bg-white/5">Cancel</button>
              <button type="button" disabled={joining || !joinCode.trim()} onClick={async () => {
                setJoining(true); setJoinError(null);
                try {
                  const res = await api<{ channel?: { id: string } }>('/invites/accept', { method: 'POST', body: JSON.stringify({ code: joinCode.trim() }) });
                  setJoinOpen(false); setJoinCode(''); loadServers(); if (res.channel?.id) router.push(`/app/channel/${res.channel.id}`);
                } catch (e) { setJoinError(e instanceof Error ? e.message : 'Could not join server'); }
                finally { setJoining(false); }
              }} className="px-4 py-2 rounded-lg bg-space-300 text-white disabled:opacity-50">Join</button>
            </div>
            {joinError ? <p className="text-sm text-red-400 mt-3">{joinError}</p> : null}
          </div>
        </div>
      )}

      <aside className="w-64 bg-space-900/80 backdrop-blur-sm flex flex-col flex-shrink-0 border-r border-white/5">
        <header className="h-12 px-4 flex items-center border-b border-white/5">
          <h2 className="font-semibold truncate text-gray-100">{isDmView ? 'Direct messages' : currentServer?.name ?? 'Servers'}</h2>
          {!isDmView && currentServer ? <Link href={`/app/server/${currentServer.id}/settings`} className="ml-auto text-xs text-gray-400 hover:text-gray-200">Settings</Link> : null}
        </header>

        {isDmView ? (
          <nav className="flex-1 overflow-y-auto p-2 space-y-1">
            {dmChannels.map((dm) => {
              const other = dm.users[0];
              return (
                <Link key={dm.id} href={`/app/dm/${dm.id}`} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-white/10">
                  <div className="w-7 h-7 rounded-full bg-space-600 overflow-hidden">{other?.avatarUrl ? <img src={resolveMediaUrl(other.avatarUrl)} alt="" className="w-full h-full object-cover"/> : null}</div>
                  <span className="text-sm truncate">{other?.displayName || other?.username || 'DM'}</span>
                  <span className={`ml-auto w-2 h-2 rounded-full ${other?.status === 'online' ? 'bg-green-400' : 'bg-gray-500'}`} />
                </Link>
              );
            })}
          </nav>
        ) : (
          <>
            {currentServer ? (
              <div className="px-2 pt-2">
                <div className="flex gap-1">
                  <input value={channelName} onChange={(e) => setChannelName(e.target.value)} placeholder="Create channel" className="w-full px-2 py-1.5 rounded bg-space-900/70 border border-white/10 text-sm" />
                  <button
                    type="button"
                    onClick={async () => {
                      if (!selectedServerId || !channelName.trim() || creatingChannel) return;
                      setCreatingChannel(true); setChannelError(null);
                      try {
                        const c = await api<{ id: string }>(`/servers/${selectedServerId}/channels`, { method: 'POST', body: JSON.stringify({ type: 'text', name: channelName.trim() }) });
                        setChannelName(''); loadServers(); router.push(`/app/channel/${c.id}`);
                      } catch (e) { setChannelError(e instanceof Error ? e.message : 'Failed to create channel'); }
                      finally { setCreatingChannel(false); }
                    }}
                    className="px-2 rounded bg-space-700 text-xs"
                  >+</button>
                </div>
                {channelError ? <p className="text-xs text-red-400 mt-1">{channelError}</p> : null}
              </div>
            ) : null}
            <nav className="flex-1 overflow-y-auto p-2">
              {channels.length === 0 ? <div className="px-2 py-4 text-center text-gray-500 text-sm">No text channels yet</div> : channels.map((c) => (
                <div key={c.id} draggable onDragStart={() => setChannelDragId(c.id)} onDragOver={(e) => e.preventDefault()} onDrop={() => reorderChannel(c.id)} className="group flex items-center gap-1">
                  <Link href={`/app/channel/${c.id}`} className={`block flex-1 px-2 py-1.5 rounded-md text-gray-300 hover:bg-white/5 hover:text-gray-100 ${selectedChannelId === c.id ? 'bg-white/10 text-white' : ''}`}><span className="text-gray-500 mr-2">#</span>{c.name}</Link>
                  {currentServer ? (
                    <button className="opacity-0 group-hover:opacity-100 text-red-300 text-xs px-1" title="Delete channel" onClick={async () => { if (!confirm(`Delete #${c.name}?`)) return; try { await api(`/servers/${currentServer.id}/channels/${c.id}`, { method: 'DELETE' }); loadServers(); } catch (e) { alert(e instanceof Error ? e.message : 'Cannot delete channel'); } }}>✕</button>
                  ) : null}
                </div>
              ))}
            </nav>
          </>
        )}
        <div className="p-2 border-t border-white/5 flex gap-1">
          <Link href="/app/profile" className="flex-1 px-2 py-1.5 rounded-md text-gray-300 hover:bg-white/5 text-sm text-center">Profile</Link>
          <button type="button" onClick={handleLogout} className="flex-1 px-2 py-1.5 rounded-md text-gray-300 hover:bg-white/5 text-sm">Log out</button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0">{children}</main>
    </div>
  );
}
