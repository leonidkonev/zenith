'use client';

import { useParams } from 'next/navigation';
import { useState, useEffect, useRef, useCallback } from 'react';
import { api } from '@/lib/api';
import { getSocket } from '@/lib/socket';

type User = { id: string; username: string; displayName: string | null; avatarUrl: string | null };
type Message = {
  id: string;
  content: string;
  createdAt: string;
  author: User;
  attachments?: { id: string; url: string; filename: string }[];
};

type Channel = {
  id: string;
  name: string;
  type: string;
  serverId: string | null;
};

export default function ChannelPage() {
  const params = useParams();
  const channelId = params.channelId as string;
  const [channel, setChannel] = useState<Channel | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [typingUserIds, setTypingUserIds] = useState<Set<string>>(new Set());
  const typingTimeoutRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!channelId) return;
    api<Channel>(`/channels/${channelId}`)
      .then(setChannel)
      .catch(() => setChannel(null));
  }, [channelId]);

  const loadMessages = useCallback(
    (cursor?: string) => {
      if (!channelId) return;
      const url = cursor
        ? `/channels/${channelId}/messages?cursor=${cursor}&limit=50`
        : `/channels/${channelId}/messages?limit=50`;
      api<{ messages: Message[]; nextCursor: string | null }>(url).then((data) => {
        setMessages((prev) => (cursor ? [...data.messages, ...prev] : data.messages));
        setNextCursor(data.nextCursor);
        setLoading(false);
      });
    },
    [channelId],
  );

  useEffect(() => {
    if (!channelId) return;
    loadMessages();
  }, [channelId, loadMessages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (!channelId) return;
    const socket = getSocket();
    socket?.emit('join_channel', { channelId });
    const onMessage = (msg: Message) => {
      setMessages((prev) => {
        if (prev.some((m) => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
    };
    socket?.on('new_message', (payload: Message & { channelId?: string }) => {
      if (payload.channelId && payload.channelId !== channelId) return;
      onMessage(payload);
    });
    socket?.on('typing', (payload: { channelId: string; userId: string }) => {
      if (payload.channelId !== channelId) return;
      setTypingUserIds((prev) => new Set(prev).add(payload.userId));
      clearTimeout(typingTimeoutRef.current[payload.userId]);
      typingTimeoutRef.current[payload.userId] = setTimeout(() => {
        setTypingUserIds((p) => {
          const next = new Set(p);
          next.delete(payload.userId);
          return next;
        });
      }, 5000);
    });
    socket?.on('typing_stop', (payload: { channelId: string; userId: string }) => {
      if (payload.channelId !== channelId) return;
      setTypingUserIds((p) => {
        const next = new Set(p);
        next.delete(payload.userId);
        return next;
      });
    });
    return () => {
      socket?.emit('leave_channel', { channelId });
      socket?.off('new_message');
      socket?.off('typing');
      socket?.off('typing_stop');
    };
  }, [channelId]);

  function emitTypingStart() {
    const s = getSocket();
    s?.emit('typing_start', { channelId });
  }
  function emitTypingStop() {
    const s = getSocket();
    s?.emit('typing_stop', { channelId });
  }

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    const text = content.trim();
    if (!text || !channelId || sending) return;
    setSending(true);
    setContent('');
    try {
      const msg = await api<Message>(`/channels/${channelId}/messages`, {
        method: 'POST',
        body: JSON.stringify({ content: text }),
      });
      setMessages((prev) => [...prev, msg]);
    } catch {
      setContent(text);
    } finally {
      setSending(false);
    }
  }

  if (!channel) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-500">
        Loading channel…
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-space-950/50">
      <header className="h-12 px-4 flex items-center border-b border-white/5 flex-shrink-0 bg-space-900/50">
        <span className="text-gray-500 mr-2">#</span>
        <h1 className="font-semibold text-gray-100">{channel.name}</h1>
      </header>

      <div ref={listRef} className="flex-1 overflow-y-auto p-4 space-y-4">
        {loading ? (
          <p className="text-gray-500 text-sm">Loading messages…</p>
        ) : messages.length === 0 ? (
          <p className="text-gray-500 text-sm">No messages yet. Say something!</p>
        ) : (
          <>
            {typingUserIds.size > 0 && (
              <p className="text-sm text-gray-500 italic animate-fade-in">
                Someone is typing…
              </p>
            )}
            {messages.map((msg) => (
              <div key={msg.id} className="flex gap-3 animate-fade-in group">
                <div className="w-10 h-10 rounded-full bg-space-600 flex-shrink-0 flex items-center justify-center text-space-200 font-semibold ring-1 ring-white/5">
                  {msg.author.avatarUrl ? (
                    <img src={msg.author.avatarUrl} alt="" className="w-full h-full rounded-full object-cover" />
                  ) : (
                    (msg.author.displayName || msg.author.username)?.[0]?.toUpperCase() ?? '?'
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-2">
                    <span className="font-medium text-space-200">
                      {msg.author.displayName || msg.author.username}
                    </span>
                    <span className="text-xs text-gray-500">
                      {new Date(msg.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-gray-200 whitespace-pre-wrap break-words">{msg.content}</p>
                  {msg.attachments?.length ? (
                    <div className="mt-1 flex flex-wrap gap-2">
                      {msg.attachments.map((a) => (
                        <a
                          key={a.id}
                          href={a.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-space-200 hover:underline"
                        >
                          {a.filename}
                        </a>
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>
            ))}
          </>
        )}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={sendMessage} className="p-4 border-t border-white/5 flex-shrink-0 bg-space-900/30">
        <div className="glass-subtle rounded-xl px-4 py-2 border border-white/5 focus-within:border-space-300/30 transition-colors duration-200">
          <textarea
            value={content}
            onChange={(e) => { setContent(e.target.value); emitTypingStart(); }}
            onBlur={emitTypingStop}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage(e);
              }
            }}
            placeholder={`Message #${channel.name}`}
            rows={1}
            className="w-full bg-transparent text-gray-100 placeholder-gray-500 resize-none focus:outline-none min-h-[24px] max-h-[200px]"
          />
        </div>
        <p className="text-xs text-gray-500 mt-1">Press Enter to send, Shift+Enter for new line.</p>
      </form>
    </div>
  );
}
