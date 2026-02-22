import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async getProfile(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, username: true, displayName: true, bio: true, avatarUrl: true, status: true, lastSeen: true, createdAt: true },
    });
  }

  async getPublicProfile(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, username: true, displayName: true, bio: true, avatarUrl: true, status: true, lastSeen: true, createdAt: true },
    });
  }

  async updateStatus(userId: string, status?: string) {
    const allowed = ['online', 'idle', 'dnd', 'offline'];
    if (status && allowed.includes(status)) {
      await this.prisma.user.update({
        where: { id: userId },
        data: { status, lastSeen: new Date() },
      });
    }
    return this.getProfile(userId);
  }

  async updateProfile(userId: string, body: { displayName?: string; bio?: string; avatarUrl?: string }) {
    const data: { displayName?: string | null; bio?: string | null; avatarUrl?: string | null } = {};
    if (body.displayName !== undefined) data.displayName = body.displayName?.trim().slice(0, 64) || null;
    if (body.bio !== undefined) data.bio = body.bio?.trim().slice(0, 280) || null;
    if (body.avatarUrl !== undefined) data.avatarUrl = body.avatarUrl || null;
    await this.prisma.user.update({ where: { id: userId }, data });
    return this.getProfile(userId);
  }
}
