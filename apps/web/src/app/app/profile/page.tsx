'use client';

import { useEffect, useState } from 'react';
import { api, getToken, resolveMediaUrl } from '@/lib/api';

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
  const [uploading, setUploading] = useState(false);
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
      setMessage('Profile saved');
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  async function uploadAvatar(file: File) {
    const token = getToken();
    if (!token) return;
    const form = new FormData();
    form.append('file', file);
    setUploading(true);
    setMessage(null);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: 'Upload failed' }));
        throw new Error(err.message || 'Upload failed');
      }
      const uploaded = (await res.json()) as { url?: string };
      if (uploaded.url) {
        setAvatarUrl(uploaded.url);
        setMessage('Avatar uploaded. Save profile to apply everywhere.');
      }
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="p-6 max-w-4xl">
      <h1 className="text-2xl font-semibold mb-4">My profile</h1>
      {!me ? (
        <p className="text-gray-400">Loading...</p>
      ) : (
        <div className="grid lg:grid-cols-[280px_1fr] gap-6">
          <div className="glass-subtle p-4 rounded-xl border border-white/10 h-fit">
            <div className="w-28 h-28 rounded-full overflow-hidden bg-space-600 mx-auto ring-2 ring-space-300/40">
              {avatarUrl ? (
                <img src={resolveMediaUrl(avatarUrl)} alt="avatar" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-3xl text-space-200 font-semibold">{(displayName || me.username)[0]?.toUpperCase()}</div>
              )}
            </div>
            <p className="text-center mt-3 font-medium text-gray-100">{displayName || me.username}</p>
            <p className="text-center text-xs text-gray-400">@{me.username}</p>
            <p className="text-center text-xs text-gray-500 mt-1">{me.email}</p>
          </div>

          <div className="glass-subtle p-4 rounded-xl border border-white/10 space-y-3">
            <label className="text-sm text-gray-300">Display name</label>
            <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Display name" className="w-full px-3 py-2 rounded-lg bg-space-900 border border-white/10" />

            <label className="text-sm text-gray-300">Bio</label>
            <textarea value={bio} onChange={(e) => setBio(e.target.value)} maxLength={280} placeholder="Tell people about you" className="w-full px-3 py-2 rounded-lg bg-space-900 border border-white/10 h-28" />

            <label className="text-sm text-gray-300">Avatar URL</label>
            <input value={avatarUrl} onChange={(e) => setAvatarUrl(e.target.value)} placeholder="https://... or /uploads/..." className="w-full px-3 py-2 rounded-lg bg-space-900 border border-white/10" />

            <div className="pt-1">
              <label className="text-sm text-gray-400">Or upload avatar image</label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) uploadAvatar(f);
                }}
                className="w-full mt-1 text-sm text-gray-300"
              />
            </div>

            <div className="pt-2 flex items-center gap-2">
              <button onClick={save} disabled={saving || uploading} className="px-4 py-2 rounded-lg bg-space-300 text-white disabled:opacity-50">
                {saving ? 'Saving...' : 'Save profile'}
              </button>
              {uploading ? <span className="text-xs text-gray-400">Uploading...</span> : null}
            </div>
            {message ? <p className="text-sm text-gray-300">{message}</p> : null}
          </div>
        </div>
      )}
    </div>
  );
}
