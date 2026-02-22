'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

type Me = {
  id: string;
  email: string;
  username: string;
  displayName: string | null;
  bio?: string | null;
  avatarUrl: string | null;
  status: string;
};

export default function ProfilePage() {
  const [me, setMe] = useState<Me | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    api<Me>('/users/me').then((u) => {
      setMe(u);
      setDisplayName(u.displayName || '');
      setBio(u.bio || '');
      setAvatarUrl(u.avatarUrl || '');
    });
  }, []);

  async function save() {
    setSaving(true);
    setMessage(null);
    try {
      const updated = await api<Me>('/users/me/profile', {
        method: 'PATCH',
        body: JSON.stringify({ displayName, bio, avatarUrl }),
      });
      setMe(updated);
      setMessage('Saved');
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-6 max-w-2xl">
      <h1 className="text-2xl font-semibold mb-4">My profile</h1>
      {!me ? (
        <p className="text-gray-400">Loading...</p>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-gray-400">@{me.username} · {me.email}</p>
          <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Display name" className="w-full px-3 py-2 rounded bg-space-900 border border-white/10" />
          <textarea value={bio} onChange={(e) => setBio(e.target.value)} maxLength={280} placeholder="Bio" className="w-full px-3 py-2 rounded bg-space-900 border border-white/10 h-24" />
          <input value={avatarUrl} onChange={(e) => setAvatarUrl(e.target.value)} placeholder="Avatar URL (optional)" className="w-full px-3 py-2 rounded bg-space-900 border border-white/10" />
          <button onClick={save} disabled={saving} className="px-4 py-2 rounded bg-space-300 text-white disabled:opacity-50">{saving ? 'Saving...' : 'Save profile'}</button>
          {message ? <p className="text-sm text-gray-300">{message}</p> : null}
        </div>
      )}
    </div>
  );
}
