'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { api, resolveMediaUrl } from '@/lib/api';

type PublicProfile = {
  id: string;
  username: string;
  displayName: string | null;
  bio: string | null;
  avatarUrl: string | null;
  status: string;
};

export default function UserProfilePage() {
  const { id } = useParams<{ id: string }>();
  const [profile, setProfile] = useState<PublicProfile | null>(null);

  useEffect(() => {
    if (!id) return;
    api<PublicProfile>(`/users/${id}`).then(setProfile).catch(() => setProfile(null));
  }, [id]);

  if (!profile) return <div className="p-6 text-gray-400">Profile not found</div>;

  return (
    <div className="p-6 max-w-3xl">
      <div className="glass-subtle rounded-xl border border-white/10 p-6">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-20 h-20 rounded-full overflow-hidden bg-space-600 ring-2 ring-space-300/30">
            {profile.avatarUrl ? (
              <img src={resolveMediaUrl(profile.avatarUrl)} alt="avatar" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-2xl text-space-200 font-semibold">
                {(profile.displayName || profile.username)[0]?.toUpperCase()}
              </div>
            )}
          </div>
          <div>
            <h1 className="text-2xl font-semibold">{profile.displayName || profile.username}</h1>
            <p className="text-sm text-gray-400">@{profile.username} · {profile.status}</p>
          </div>
        </div>
        <p className="text-gray-300 whitespace-pre-wrap leading-relaxed">{profile.bio || 'No bio yet.'}</p>
      </div>
    </div>
  );
}
