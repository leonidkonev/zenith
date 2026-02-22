'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { api, clearToken } from '@/lib/api';
import { disconnectSocket } from '@/lib/socket';

type Server = {
  id: string;
  name: string;
  iconUrl: string | null;
  channels?: { id: string; name: string; type: string }[];
};

export function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [servers, setServers] = useState<Server[]>([]);
  const [selectedServerId, setSelectedServerId] = useState<string | null>(null);
  const [selectedChannelId, setSelectedChannelId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [joinOpen, setJoinOpen] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [createName, setCreateName] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [channelName, setChannelName] = useState('');
  const [creatingChannel, setCreatingChannel] = useState(false);
  const [channelError, setChannelError] = useState<string | null>(null);
  const manuallySelectedServerRef = useRef<string | null>(null);

  const loadServers = () => {
    api<Server[]>('/servers')
      .then(setServers)
      .catch(() => setServers([]));
  };

  useEffect(() => {
    loadServers();
  }, []);

  // Sync selected server/channel from URL (e.g. /app/channel/xyz)
  // URL is the source of truth - state syncs from URL only
  const channelIdFromPath = pathname?.startsWith('/app/channel/')
    ? pathname.replace(/^\/app\/channel\//, '').split('/')[0]
    : null;

  useEffect(() => {
    if (!servers.length) return;
    
    if (channelIdFromPath) {
      // Find which server owns this channel and sync state
      const server = servers.find((s) =>
        s.channels?.some((c) => c.id === channelIdFromPath)
      );
      if (server) {
        setSelectedServerId(server.id);
        setSelectedChannelId(channelIdFromPath);
        manuallySelectedServerRef.current = null; // Clear manual selection
      } else {
        // Channel in URL doesn't exist - navigate to first available channel
        const firstServer = servers[0];
        const firstText = firstServer?.channels?.find((c) => c.type === 'text');
        if (firstText) {
          router.replace(`/app/channel/${firstText.id}`);
        } else {
          setSelectedServerId(firstServer?.id ?? null);
          setSelectedChannelId(null);
        }
      }
    } else {
      // No channel in URL (/app route)
      const manualServerId = manuallySelectedServerRef.current;
      
      if (manualServerId) {
        // Server was manually selected (clicked) - sync state and clear ref
        setSelectedServerId(manualServerId);
        setSelectedChannelId(null);
        manuallySelectedServerRef.current = null;
      } else if (!selectedServerId && servers.length > 0) {
        // Initial load: navigate to first server's first channel
        const firstServer = servers[0];
        setSelectedServerId(firstServer.id);
        const firstText = firstServer.channels?.find((c) => c.type === 'text');
        if (firstText) {
          router.replace(`/app/channel/${firstText.id}`);
        } else {
          setSelectedChannelId(null);
        }
      } else if (selectedServerId) {
        // Already have a selected server but no channel in URL
        // Clear channel selection to show empty state
        setSelectedChannelId(null);
      }
    }
  }, [servers, channelIdFromPath, router, selectedServerId]);

  const currentServer = servers.find((s) => s.id === selectedServerId);
  const channels = currentServer?.channels ?? [];

  function handleLogout() {
    clearToken();
    disconnectSocket();
    router.replace('/');
    router.refresh();
  }

  return (
    <div className="flex h-screen bg-space-950 text-gray-100">
      {/* Server list */}
      <aside className="w-[72px] flex flex-col items-center py-3 bg-space-900/90 backdrop-blur-sm border-r border-white/5 flex-shrink-0">
        <Link
          href="/"
          className="w-12 h-12 rounded-2xl bg-space-600 flex items-center justify-center text-space-200 font-bold mb-2 hover:rounded-xl hover:bg-space-300 hover:glow-soft transition-all duration-200"
        >
          Z
        </Link>
        <div className="w-8 h-px bg-white/10 my-2" />
        {servers.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => {
              const firstText = s.channels?.find((c) => c.type === 'text');
              if (firstText) {
                // Navigate to first text channel - URL change will sync state
                router.push(`/app/channel/${firstText.id}`);
              } else {
                // Server has no text channels - navigate to /app
                // Use ref to track manual selection so useEffect can sync state
                manuallySelectedServerRef.current = s.id;
                router.push('/app');
              }
            }}
            className={`w-12 h-12 rounded-2xl flex items-center justify-center font-semibold mb-2 transition-all duration-200 ${
              selectedServerId === s.id
                ? 'bg-space-300 text-white rounded-xl'
                : 'bg-space-600 text-gray-300 hover:rounded-xl hover:bg-space-500'
            }`}
          >
            {s.iconUrl ? <img src={s.iconUrl} alt="" className="w-full h-full rounded-xl object-cover" /> : s.name[0].toUpperCase()}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setCreateOpen(true)}
          className="w-12 h-12 rounded-2xl bg-space-600 text-gray-400 hover:bg-space-500 hover:text-white flex items-center justify-center text-xl transition-all duration-200"
          title="Create server"
        >
          +
        </button>
        <button
          type="button"
          onClick={() => setJoinOpen(true)}
          className="w-12 h-12 rounded-2xl bg-space-600 text-gray-400 hover:bg-space-500 hover:text-white flex items-center justify-center text-base transition-all duration-200"
          title="Join server"
        >
          #
        </button>
      </aside>
      {createOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setCreateOpen(false)}>
          <div className="glass p-6 rounded-2xl w-full max-w-sm animate-slide-up" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-semibold mb-4">Create server</h2>
            <input
              value={createName}
              onChange={(e) => setCreateName(e.target.value)}
              placeholder="Server name"
              className="w-full px-3 py-2 rounded-lg bg-space-900/80 border border-white/10 text-gray-100 mb-4"
            />
            <div className="flex gap-2 justify-end">
              <button type="button" onClick={() => setCreateOpen(false)} className="px-4 py-2 rounded-lg text-gray-400 hover:bg-white/5">Cancel</button>
              <button
                type="button"
                disabled={creating || !createName.trim()}
                onClick={async () => {
                  setCreating(true);
                  setCreateError(null);
                  try {
                    const s = await api<Server>('/servers', { method: 'POST', body: JSON.stringify({ name: createName.trim() }) });
                    setCreateOpen(false);
                    setCreateName('');
                    loadServers();
                    const ch = s.channels?.find((c) => c.type === 'text');
                    if (ch) router.push(`/app/channel/${ch.id}`);
                  } catch (e) {
                    setCreateError(e instanceof Error ? e.message : 'Could not create server');
                  } finally {
                    setCreating(false);
                  }
                }}
                className="px-4 py-2 rounded-lg bg-space-300 text-white hover:bg-space-200 disabled:opacity-50"
              >
                Create
              </button>
            </div>
            {createError ? <p className="text-sm text-red-400 mt-3">{createError}</p> : null}
          </div>
        </div>
      )}
      {joinOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setJoinOpen(false)}>
          <div className="glass p-6 rounded-2xl w-full max-w-sm animate-slide-up" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-semibold mb-4">Join server by invite</h2>
            <input
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value)}
              placeholder="Invite code"
              className="w-full px-3 py-2 rounded-lg bg-space-900/80 border border-white/10 text-gray-100 mb-4"
            />
            <div className="flex gap-2 justify-end">
              <button type="button" onClick={() => setJoinOpen(false)} className="px-4 py-2 rounded-lg text-gray-400 hover:bg-white/5">Cancel</button>
              <button
                type="button"
                disabled={joining || !joinCode.trim()}
                onClick={async () => {
                  setJoining(true);
                  setJoinError(null);
                  try {
                    const res = await api<{ channel?: { id: string } }>('/invites/accept', {
                      method: 'POST',
                      body: JSON.stringify({ code: joinCode.trim() }),
                    });
                    setJoinOpen(false);
                    setJoinCode('');
                    loadServers();
                    if (res.channel?.id) router.push(`/app/channel/${res.channel.id}`);
                  } catch (e) {
                    setJoinError(e instanceof Error ? e.message : 'Could not join server');
                  } finally {
                    setJoining(false);
                  }
                }}
                className="px-4 py-2 rounded-lg bg-space-300 text-white hover:bg-space-200 disabled:opacity-50"
              >
                Join
              </button>
            </div>
            {joinError ? <p className="text-sm text-red-400 mt-3">{joinError}</p> : null}
          </div>
        </div>
      )}

      {/* Channel list */}
      <aside className="w-60 bg-space-900/80 backdrop-blur-sm flex flex-col flex-shrink-0 border-r border-white/5">
        <header className="h-12 px-4 flex items-center border-b border-white/5">
          <h2 className="font-semibold truncate text-gray-100">{currentServer?.name ?? 'Servers'}</h2>
          {currentServer ? (
            <div className="ml-auto flex items-center gap-2">
              <button
                type="button"
                onClick={async () => {
                  if (!selectedServerId || !channelName.trim() || creatingChannel) return;
                  setCreatingChannel(true);
                  setChannelError(null);
                  try {
                    const c = await api<{ id: string }>(`/servers/${selectedServerId}/channels`, {
                      method: 'POST',
                      body: JSON.stringify({ type: 'text', name: channelName.trim() }),
                    });
                    setChannelName('');
                    loadServers();
                    router.push(`/app/channel/${c.id}`);
                  } catch (e) {
                    setChannelError(e instanceof Error ? e.message : 'Failed to create channel');
                  } finally {
                    setCreatingChannel(false);
                  }
                }}
                className="text-xs text-gray-400 hover:text-gray-200"
                title="Create text channel"
              >
                + channel
              </button>
              <Link href={`/app/server/${currentServer.id}/settings`} className="text-xs text-gray-400 hover:text-gray-200">
                Settings
              </Link>
            </div>
          ) : null}
        </header>
        {currentServer ? (
          <div className="px-2 pt-2">
            <input
              value={channelName}
              onChange={(e) => setChannelName(e.target.value)}
              placeholder="Create channel"
              className="w-full px-2 py-1.5 rounded bg-space-900/70 border border-white/10 text-sm"
            />
            {channelError ? <p className="text-xs text-red-400 mt-1">{channelError}</p> : null}
          </div>
        ) : null}
        <nav className="flex-1 overflow-y-auto p-2">
          {channels.filter((c) => c.type === 'text').length === 0 ? (
            <div className="px-2 py-4 text-center text-gray-500 text-sm">
              No text channels yet
            </div>
          ) : (
            channels.filter((c) => c.type === 'text').map((c) => (
              <Link
                key={c.id}
                href={`/app/channel/${c.id}`}
                className={`block px-2 py-1.5 rounded-md text-gray-300 hover:bg-white/5 hover:text-gray-100 transition-colors duration-200 ${
                  selectedChannelId === c.id ? 'bg-white/10 text-white' : ''
                }`}
              >
                <span className="text-gray-500 mr-2">#</span>
                {c.name}
              </Link>
            ))
          )}
        </nav>
        <div className="p-2 border-t border-white/5">
          <Link
            href="/app/profile"
            className="block w-full px-2 py-1.5 rounded-md text-gray-400 hover:bg-white/5 hover:text-gray-200 text-sm transition-colors duration-200 mb-1"
          >
            My profile
          </Link>
          <button
            type="button"
            onClick={handleLogout}
            className="w-full px-2 py-1.5 rounded-md text-gray-400 hover:bg-white/5 hover:text-gray-200 text-sm transition-colors duration-200"
          >
            Log out
          </button>
        </div>
      </aside>

      {/* Main area */}
      <main className="flex-1 flex flex-col min-w-0">
        {children}
      </main>
    </div>
  );
}
