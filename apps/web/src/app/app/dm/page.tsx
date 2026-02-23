'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';

type Dm = { id: string };

export default function DmHomePage() {
  const router = useRouter();
  useEffect(() => {
    api<Dm[]>('/dm-channels').then((list) => {
      if (list[0]) router.replace(`/app/dm/${list[0].id}`);
    }).catch(() => {});
  }, [router]);
  return <div className="flex-1 flex items-center justify-center text-gray-500">Select a DM</div>;
}
