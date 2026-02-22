'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

type Invite = {
  code: string;
  server: { id: string; name: string; iconUrl: string | null };
  channel: { id: string; name: string };
  maxUses: number | null;
  useCount: number;
  expiresAt: string | null;
};

export default function InvitePage() {
  const { code } = useParams<{ code: string }>();
  const router = useRouter();
  const [invite, setInvite] = useState<Invite | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    if (!code) return;
    api<Invite>(`/invites/resolve/${code}`).then(setInvite).catch((e) => setError(e instanceof Error ? e.message : 'Invite invalid'));
  }, [code]);

  async function acceptInvite() {
    setJoining(true);
    setError(null);
    try {
      const result = await api<{ channel?: { id: string } }>('/invites/accept', {
        method: 'POST',
        body: JSON.stringify({ code }),
      });
      if (result.channel?.id) router.replace(`/app/channel/${result.channel.id}`);
      else router.replace('/app');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not accept invite');
      setJoining(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-6 bg-cosmic">
      <div className="glass w-full max-w-md p-6 rounded-2xl border border-white/10">
        {!invite ? (
          <>
            <h1 className="text-xl font-semibold mb-2">Server Invite</h1>
            <p className="text-sm text-gray-400">{error || 'Loading invite...'}</p>
          </>
        ) : (
          <>
            <p className="text-xs uppercase tracking-wide text-gray-400 mb-2">You were invited to join</p>
            <h1 className="text-2xl font-semibold text-gray-100">{invite.server.name}</h1>
            <p className="text-sm text-gray-400 mt-1">Channel: #{invite.channel.name}</p>
            <p className="text-xs text-gray-500 mt-2">Uses: {invite.useCount}{invite.maxUses ? `/${invite.maxUses}` : ''}</p>
            <div className="mt-5 flex gap-2">
              <button onClick={() => router.replace('/login')} className="px-4 py-2 rounded-lg text-gray-300 hover:bg-white/5">Log in</button>
              <button onClick={acceptInvite} disabled={joining} className="ml-auto px-4 py-2 rounded-lg bg-space-300 hover:bg-space-200 text-white disabled:opacity-50">
                {joining ? 'Joining...' : 'Accept invite'}
              </button>
            </div>
            {error ? <p className="text-sm text-red-400 mt-3">{error}</p> : null}
          </>
        )}
      </div>
    </main>
  );
}
