'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

type Server = { id: string; name: string; iconUrl: string | null };
type Member = { id: string; user: { id: string; username: string; displayName: string | null } };
type ServerFull = Server & { owner?: { id: string }; members?: Member[] };

export default function ServerSettingsPage() {
  const { id } = useParams<{ id: string }>();
  const [server, setServer] = useState<ServerFull | null>(null);
  const [name, setName] = useState('');
  const [iconUrl, setIconUrl] = useState('');
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    api<ServerFull>(`/servers/${id}`).then((s) => {
      setServer(s);
      setName(s.name);
      setIconUrl(s.iconUrl || '');
    }).catch(() => setServer(null));
  }, [id]);

  async function save() {
    try {
      const updated = await api<ServerFull>(`/servers/${id}`, { method: 'PATCH', body: JSON.stringify({ name, iconUrl }) });
      setServer(updated);
      setMsg('Saved');
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Failed to save');
    }
  }

  if (!server) return <div className="p-6 text-gray-400">Server not found or no permission</div>;

  return (
    <div className="p-6 max-w-2xl space-y-3">
      <h1 className="text-2xl font-semibold">Server settings</h1>
      <input value={name} onChange={(e) => setName(e.target.value)} className="w-full px-3 py-2 rounded bg-space-900 border border-white/10" />
      <input value={iconUrl} onChange={(e) => setIconUrl(e.target.value)} placeholder="Icon URL" className="w-full px-3 py-2 rounded bg-space-900 border border-white/10" />
      <button onClick={save} className="px-4 py-2 rounded bg-space-300 text-white">Save</button>
      <div className="pt-4 border-t border-white/10 mt-4">
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
      </div>
      {msg ? <p className="text-sm text-gray-300">{msg}</p> : null}
    </div>
  );
}
