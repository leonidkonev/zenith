'use client';

import { useParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api';

type Server = { id: string; name: string; iconUrl: string | null };
type Member = { id: string; user: { id: string; username: string; displayName: string | null } };
type Channel = { id: string; name: string; type: string };
type Invite = {
  id: string;
  code: string;
  maxUses: number | null;
  useCount: number;
  expiresAt: string | null;
  channel: { id: string; name: string };
  inviter: { id: string; username: string };
};
type ServerFull = Server & { owner?: { id: string }; members?: Member[]; channels?: Channel[] };

export default function ServerSettingsPage() {
  const { id } = useParams<{ id: string }>();
  const [server, setServer] = useState<ServerFull | null>(null);
  const [name, setName] = useState('');
  const [iconUrl, setIconUrl] = useState('');
  const [msg, setMsg] = useState<string | null>(null);

  const [invites, setInvites] = useState<Invite[]>([]);
  const [inviteChannelId, setInviteChannelId] = useState('');
  const [inviteExpiresIn, setInviteExpiresIn] = useState<number>(86400);
  const [inviteMaxUses, setInviteMaxUses] = useState<number>(0);
  const [creatingInvite, setCreatingInvite] = useState(false);
  const [origin, setOrigin] = useState('');

  async function loadServer() {
    if (!id) return;
    try {
      const s = await api<ServerFull>(`/servers/${id}`);
      setServer(s);
      setName(s.name);
      setIconUrl(s.iconUrl || '');
      const firstText = s.channels?.find((c) => c.type === 'text');
      setInviteChannelId((prev) => prev || firstText?.id || '');
    } catch {
      setServer(null);
    }
  }

  async function loadInvites() {
    if (!id) return;
    try {
      const list = await api<Invite[]>(`/invites/servers/${id}`);
      setInvites(list);
    } catch (e) {
      setInvites([]);
      setMsg(e instanceof Error ? e.message : 'Failed to load invites');
    }
  }

  useEffect(() => {
    loadServer();
    if (typeof window !== 'undefined') setOrigin(window.location.origin);
  }, [id]);

  useEffect(() => {
    if (server) loadInvites();
  }, [server?.id]);

  const textChannels = useMemo(() => (server?.channels ?? []).filter((c) => c.type === 'text'), [server]);

  async function save() {
    try {
      const updated = await api<ServerFull>(`/servers/${id}`, { method: 'PATCH', body: JSON.stringify({ name, iconUrl }) });
      setServer(updated);
      setMsg('Server settings saved');
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Failed to save');
    }
  }

  async function createInvite() {
    if (!inviteChannelId || creatingInvite) return;
    setCreatingInvite(true);
    setMsg(null);
    try {
      await api<Invite>(`/invites/servers/${id}/channels/${inviteChannelId}`, {
        method: 'POST',
        body: JSON.stringify({
          expiresIn: inviteExpiresIn > 0 ? inviteExpiresIn : undefined,
          maxUses: inviteMaxUses > 0 ? inviteMaxUses : undefined,
        }),
      });
      await loadInvites();
      setMsg('Invite created');
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Failed to create invite');
    } finally {
      setCreatingInvite(false);
    }
  }

  async function copyInvite(code: string) {
    const url = `${origin}/invite/${code}`;
    await navigator.clipboard.writeText(url);
    setMsg('Invite link copied');
  }

  if (!server) return <div className="p-6 text-gray-400">Server not found or no permission</div>;

  return (
    <div className="p-6 max-w-5xl space-y-6">
      <h1 className="text-2xl font-semibold">Server settings</h1>

      <section className="glass-subtle rounded-xl border border-white/10 p-4 space-y-3">
        <h2 className="text-lg font-semibold">General</h2>
        <input value={name} onChange={(e) => setName(e.target.value)} className="w-full px-3 py-2 rounded bg-space-900 border border-white/10" />
        <input value={iconUrl} onChange={(e) => setIconUrl(e.target.value)} placeholder="Icon URL" className="w-full px-3 py-2 rounded bg-space-900 border border-white/10" />
        <button onClick={save} className="px-4 py-2 rounded bg-space-300 text-white">Save</button>
      </section>

      <section className="glass-subtle rounded-xl border border-white/10 p-4 space-y-3">
        <h2 className="text-lg font-semibold">Invites</h2>
        <p className="text-xs text-gray-400">Create and share invite links for this server.</p>
        <div className="grid md:grid-cols-4 gap-2 items-end">
          <div className="md:col-span-2">
            <label className="text-xs text-gray-400">Channel</label>
            <select value={inviteChannelId} onChange={(e) => setInviteChannelId(e.target.value)} className="w-full px-3 py-2 rounded bg-space-900 border border-white/10">
              {textChannels.map((c) => <option key={c.id} value={c.id}>#{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-400">Expires (seconds, 0 = never)</label>
            <input type="number" min={0} value={inviteExpiresIn} onChange={(e) => setInviteExpiresIn(Number(e.target.value || 0))} className="w-full px-3 py-2 rounded bg-space-900 border border-white/10" />
          </div>
          <div>
            <label className="text-xs text-gray-400">Max uses (0 = unlimited)</label>
            <input type="number" min={0} value={inviteMaxUses} onChange={(e) => setInviteMaxUses(Number(e.target.value || 0))} className="w-full px-3 py-2 rounded bg-space-900 border border-white/10" />
          </div>
        </div>
        <button disabled={creatingInvite || !inviteChannelId} onClick={createInvite} className="px-4 py-2 rounded bg-space-300 text-white disabled:opacity-50">{creatingInvite ? 'Creating...' : 'Create invite'}</button>

        <div className="space-y-2 pt-2">
          {invites.length === 0 ? <p className="text-sm text-gray-500">No invites yet.</p> : invites.map((inv) => (
            <div key={inv.id} className="flex items-center gap-2 bg-space-900/40 px-3 py-2 rounded">
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-100 truncate">{origin}/invite/{inv.code}</p>
                <p className="text-xs text-gray-500">#{inv.channel.name} · uses {inv.useCount}{inv.maxUses ? `/${inv.maxUses}` : ''} · {inv.expiresAt ? `expires ${new Date(inv.expiresAt).toLocaleString()}` : 'never expires'}</p>
              </div>
              <button onClick={() => copyInvite(inv.code)} className="text-xs px-2 py-1 rounded bg-space-700 hover:bg-space-600">Copy</button>
            </div>
          ))}
        </div>
      </section>

      <section className="glass-subtle rounded-xl border border-white/10 p-4">
        <h2 className="text-lg font-semibold mb-2">Moderation</h2>
        <p className="text-xs text-gray-400 mb-3">Kick / ban / mute members (requires permissions).</p>
        <div className="space-y-2">
          {(server.members ?? []).map((m) => (
            <div key={m.id} className="flex items-center gap-2 bg-space-900/40 px-2 py-2 rounded">
              <span className="flex-1 text-sm">{m.user.displayName || m.user.username}</span>
              <button className="text-xs px-2 py-1 rounded bg-red-700/70" onClick={() => api(`/servers/${id}/moderation/kick/${m.user.id}`, { method: 'POST' }).then(() => setMsg('User kicked')).catch((e) => setMsg(e instanceof Error ? e.message : 'Failed'))}>Kick</button>
              <button className="text-xs px-2 py-1 rounded bg-red-900/70" onClick={() => api(`/servers/${id}/moderation/ban/${m.user.id}`, { method: 'POST', body: JSON.stringify({ reason: 'moderation action' }) }).then(() => setMsg('User banned')).catch((e) => setMsg(e instanceof Error ? e.message : 'Failed'))}>Ban</button>
              <button className="text-xs px-2 py-1 rounded bg-yellow-700/70" onClick={() => api(`/servers/${id}/moderation/mute/${m.user.id}`, { method: 'POST', body: JSON.stringify({ seconds: 600 }) }).then(() => setMsg('User muted (10m)')).catch((e) => setMsg(e instanceof Error ? e.message : 'Failed'))}>Mute</button>
            </div>
          ))}
        </div>
      </section>

      {msg ? <p className="text-sm text-gray-300">{msg}</p> : null}
    </div>
  );
}
