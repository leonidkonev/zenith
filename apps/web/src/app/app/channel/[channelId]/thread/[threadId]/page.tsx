'use client';

import { useParams, useRouter } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';
import { api } from '@/lib/api';

type User = { id: string; username: string; displayName: string | null; avatarUrl: string | null };
type Message = {
  id: string;
  content: string;
  createdAt: string;
  author: User;
};

type Thread = {
  id: string;
  title: string;
  rootMessage: { id: string; content: string; author: User };
};

export default function ThreadPage() {
  const params = useParams();
  const router = useRouter();
  const channelId = params.channelId as string;
  const threadId = params.threadId as string;
  const [thread, setThread] = useState<Thread | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [content, setContent] = useState('');
  const [sending, setSending] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!threadId) return;
    api<Thread>(`/channels/${channelId}/threads/${threadId}`)
      .then(setThread)
      .catch(() => setThread(null));
  }, [channelId, threadId]);

  useEffect(() => {
    if (!threadId) return;
    api<{ messages: Message[] }>(`/channels/${channelId}/threads/${threadId}/messages`)
      .then((d) => setMessages(d.messages));
  }, [channelId, threadId]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    const text = content.trim();
    if (!text || !channelId || sending) return;
    setSending(true);
    setContent('');
    try {
      const msg = await api<Message>(`/channels/${channelId}/messages`, {
        method: 'POST',
        body: JSON.stringify({ content: text, threadId }),
      });
      setMessages((prev) => [...prev, msg]);
    } catch {
      setContent(text);
    } finally {
      setSending(false);
    }
  }

  if (!thread) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-500">
        Loading thread…
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 border-l border-white/5">
      <header className="h-12 px-4 flex items-center border-b border-white/5 flex-shrink-0">
        <button
          type="button"
          onClick={() => router.back()}
          className="text-gray-500 hover:text-gray-300 mr-2"
        >
          ←
        </button>
        <h1 className="font-semibold truncate">{thread.title}</h1>
      </header>
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div className="glass-subtle rounded-lg p-3">
          <p className="text-sm text-gray-400">
            {(thread.rootMessage.author.displayName || thread.rootMessage.author.username)} · thread starter
          </p>
          <p className="text-gray-200 mt-1">{thread.rootMessage.content}</p>
        </div>
        {messages.map((msg) => (
          <div key={msg.id} className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-space-600 flex-shrink-0 flex items-center justify-center text-sm text-space-200 font-semibold">
              {(msg.author.displayName || msg.author.username)?.[0] ?? '?'}
            </div>
            <div>
              <span className="font-medium text-space-200 text-sm">
                {msg.author.displayName || msg.author.username}
              </span>
              <span className="text-xs text-gray-500 ml-2">
                {new Date(msg.createdAt).toLocaleString()}
              </span>
              <p className="text-gray-200 text-sm mt-0.5 whitespace-pre-wrap">{msg.content}</p>
            </div>
          </div>
        ))}
        <div ref={endRef} />
      </div>
      <form onSubmit={sendMessage} className="p-4 border-t border-white/5">
        <input
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={`Reply in ${thread.title}`}
          className="w-full px-3 py-2 rounded-lg bg-space-900/80 border border-white/10 text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-space-300/50"
        />
      </form>
    </div>
  );
}
