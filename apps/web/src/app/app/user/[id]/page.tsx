'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

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
    <div className="p-6 max-w-2xl">
      <h1 className="text-2xl font-semibold mb-3">{profile.displayName || profile.username}</h1>
      <p className="text-sm text-gray-400 mb-2">@{profile.username} · {profile.status}</p>
      <p className="text-gray-300 whitespace-pre-wrap">{profile.bio || 'No bio yet.'}</p>
    </div>
  );
}
