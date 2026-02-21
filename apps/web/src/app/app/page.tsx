'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

type Server = {
  id: string;
  name: string;
  channels?: { id: string; name: string; type: string }[];
};

export default function AppPage() {
  const router = useRouter();
  const [servers, setServers] = useState<Server[]>([]);

  useEffect(() => {
    api<Server[]>('/servers')
      .then(setServers)
      .catch(() => setServers([]));
  }, []);

  useEffect(() => {
    const first = servers[0];
    if (first?.channels?.length) {
      const textChannel = first.channels.find((c) => c.type === 'text');
      if (textChannel) {
        router.replace(`/app/channel/${textChannel.id}`);
      }
    }
  }, [servers, router]);

  return (
    <div className="flex-1 flex items-center justify-center bg-cosmic">
      <div className="text-center">
        <p className="text-gray-500 mb-2">No channel selected</p>
        <p className="text-gray-600 text-sm">Select a channel from the sidebar</p>
      </div>
    </div>
  );
}
