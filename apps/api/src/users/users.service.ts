import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async getProfile(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, username: true, displayName: true, avatarUrl: true, status: true, lastSeen: true, createdAt: true },
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
}
