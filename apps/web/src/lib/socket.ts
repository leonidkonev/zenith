import { io } from 'socket.io-client';
import { getToken } from './api';

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:4000';

let socket: ReturnType<typeof io> | null = null;

export function getSocket() {
  if (typeof window === 'undefined') return null;
  if (!socket) {
    const token = getToken();
    socket = io(WS_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
    });
  }
  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
