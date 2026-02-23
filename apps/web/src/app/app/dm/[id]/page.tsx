'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { api, resolveMediaUrl } from '@/lib/api';

type User = { id: string; username: string; displayName: string | null; avatarUrl: string | null };
type Message = { id: string; content: string; createdAt: string; author: User };

export default function DmPage() {
  const { id } = useParams<{ id: string }>();
  const [messages, setMessages] = useState<Message[]>([]);
  const [content, setContent] = useState('');

  useEffect(() => {
    if (!id) return;
    api<{ messages: Message[] }>(`/dm-channels/${id}/messages`).then((d) => setMessages(d.messages)).catch(() => setMessages([]));
  }, [id]);

  useEffect(() => {
    if (!id) return;
    const t = setInterval(() => {
      api<{ messages: Message[] }>(`/dm-channels/${id}/messages`)
        .then((d) => {
          setMessages((prev) => {
            const map = new Map(prev.map((m) => [m.id, m] as const));
            for (const m of d.messages) map.set(m.id, m);
            return Array.from(map.values()).sort((a, b) => +new Date(a.createdAt) - +new Date(b.createdAt));
          });
        })
        .catch(() => {});
    }, 3000);
    return () => clearInterval(t);
  }, [id]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const txt = content.trim();
    if (!txt) return;
    setContent('');
    try {
      const m = await api<Message>(`/dm-channels/${id}/messages`, { method: 'POST', body: JSON.stringify({ content: txt }) });
      setMessages((prev) => [...prev, m]);
    } catch {
      setContent(txt);
    }
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((m, idx) => {
          const prev = idx > 0 ? messages[idx - 1] : null;
          const compact = Boolean(prev && prev.author.id === m.author.id && (new Date(m.createdAt).getTime() - new Date(prev.createdAt).getTime()) < 5 * 60 * 1000);
          return (
            <div key={m.id} className="flex gap-2">
              {!compact ? (
                <div className="w-8 h-8 rounded-full bg-space-600 overflow-hidden">{m.author.avatarUrl ? <img src={resolveMediaUrl(m.author.avatarUrl)} alt="" className="w-full h-full object-cover"/> : null}</div>
              ) : <div className="w-8" />}
              <div>
                {!compact ? <p className="text-sm text-space-200">{m.author.displayName || m.author.username} <span className="text-gray-500 text-xs">{new Date(m.createdAt).toLocaleTimeString()}</span></p> : null}
                <p className="text-sm text-gray-200">{m.content}</p>
              </div>
            </div>
          );
        })}
      </div>
      <form onSubmit={send} className="p-3 border-t border-white/10">
        <input value={content} onChange={(e) => setContent(e.target.value)} placeholder="Message" className="w-full px-3 py-2 rounded bg-space-900 border border-white/10" />
      </form>
    </div>
  );
}
