import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@WebSocketGateway({
  cors: { origin: process.env.WS_CORS_ORIGIN || 'http://localhost:3000' },
})
@Injectable()
export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private socketToUser = new Map<string, string>();

  constructor(
    private jwt: JwtService,
    private prisma: PrismaService,
  ) {}

  async handleConnection(client: { id: string; handshake: { auth?: { token?: string }; headers?: { authorization?: string } }; join?: (r: string) => void }) {
    try {
      const token =
        client.handshake?.auth?.token ||
        (client.handshake?.headers?.authorization?.startsWith('Bearer ')
          ? client.handshake.headers.authorization.slice(7)
          : null);
      if (!token) {
        (client as { disconnect?: () => void }).disconnect?.();
        return;
      }
      const payload = this.jwt.verify(token) as { sub: string };
      const userId = payload.sub;
      this.socketToUser.set(client.id, userId);
      if (client.join) await client.join(`user:${userId}`);
      await this.prisma.user.update({
        where: { id: userId },
        data: { status: 'online', lastSeen: new Date() },
      });
      this.server.emit('presence', { userId, status: 'online' });
    } catch {
      (client as { disconnect?: () => void }).disconnect?.();
    }
  }

  async handleDisconnect(client: { id: string }) {
    const userId = this.socketToUser.get(client.id);
    this.socketToUser.delete(client.id);
    if (userId) {
      await this.prisma.user.update({
        where: { id: userId },
        data: { status: 'offline', lastSeen: new Date() },
      });
      this.server.emit('presence', { userId, status: 'offline' });
    }
  }

  @SubscribeMessage('join_channel')
  handleJoinChannel(
    client: { id: string; join: (room: string) => void },
    payload: { channelId: string },
  ) {
    if (payload?.channelId) {
      client.join(`channel:${payload.channelId}`);
    }
  }

  @SubscribeMessage('leave_channel')
  handleLeaveChannel(
    client: { id: string; leave: (room: string) => void },
    payload: { channelId: string },
  ) {
    if (payload?.channelId) {
      client.leave(`channel:${payload.channelId}`);
    }
  }

  @SubscribeMessage('typing_start')
  handleTypingStart(
    client: { id: string },
    payload: { channelId: string; userId: string },
  ) {
    const userId = this.socketToUser.get(client.id) || payload?.userId;
    if (payload?.channelId && userId) {
      this.server.to(`channel:${payload.channelId}`).emit('typing', {
        channelId: payload.channelId,
        userId,
      });
    }
  }

  @SubscribeMessage('typing_stop')
  handleTypingStop(
    client: { id: string },
    payload: { channelId: string; userId: string },
  ) {
    const userId = this.socketToUser.get(client.id) || payload?.userId;
    if (payload?.channelId && userId) {
      this.server.to(`channel:${payload.channelId}`).emit('typing_stop', {
        channelId: payload.channelId,
        userId,
      });
    }
  }

  @SubscribeMessage('presence_update')
  async handlePresenceUpdate(
    client: { id: string },
    payload: { status: 'online' | 'idle' | 'dnd' | 'offline' },
  ) {
    const userId = this.socketToUser.get(client.id);
    if (!userId || !payload?.status) return;
    await this.prisma.user.update({
      where: { id: userId },
      data: { status: payload.status, lastSeen: new Date() },
    });
    this.server.emit('presence', { userId, status: payload.status });
  }

  broadcastToChannel(channelId: string, event: string, data: unknown) {
    this.server.to(`channel:${channelId}`).emit(event, data);
  }
}
