import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SearchService {
  constructor(private prisma: PrismaService) {}

  async searchMessages(userId: string, query: string, serverId?: string, limit = 20) {
    const q = query.trim();
    if (!q || q.length < 2) return { results: [] };
    const memberServerIds = await this.prisma.member.findMany({
      where: { userId },
      select: { serverId: true },
    }).then((m: Array<{ serverId: string }>) => m.map((x: { serverId: string }) => x.serverId));
    const serverIds = serverId
      ? (memberServerIds.includes(serverId) ? [serverId] : [])
      : memberServerIds;
    if (serverIds.length === 0) return { results: [] };
    const messages = await this.prisma.message.findMany({
      where: {
        deletedAt: null,
        channel: { serverId: { in: serverIds } },
        content: { contains: q },
      },
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        author: { select: { id: true, username: true, displayName: true } },
        channel: { select: { id: true, name: true, serverId: true } },
      },
    });
    return { results: messages };
  }
}
