'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

type Server = { id: string; name: string; iconUrl: string | null };

export default function ServerSettingsPage() {
  const { id } = useParams<{ id: string }>();
  const [server, setServer] = useState<Server | null>(null);
  const [name, setName] = useState('');
  const [iconUrl, setIconUrl] = useState('');
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    api<Server>(`/servers/${id}`).then((s) => {
      setServer(s);
      setName(s.name);
      setIconUrl(s.iconUrl || '');
    }).catch(() => setServer(null));
  }, [id]);

  async function save() {
    try {
      const updated = await api<Server>(`/servers/${id}`, { method: 'PATCH', body: JSON.stringify({ name, iconUrl }) });
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
      {msg ? <p className="text-sm text-gray-300">{msg}</p> : null}
    </div>
  );
}
