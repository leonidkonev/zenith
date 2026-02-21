import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MessagesService } from '../messages/messages.service';

@Injectable()
export class ReactionsService {
  constructor(
    private prisma: PrismaService,
    private messages: MessagesService,
  ) {}

  async add(messageId: string, userId: string, emoji: string) {
    await this.messages.findOne(messageId, userId);
    const msg = await this.prisma.message.findUnique({
      where: { id: messageId },
      include: { channel: true, reactions: true },
    });
    if (!msg || msg.deletedAt) throw new NotFoundException('Message not found');
    const normalized = String(emoji).trim().slice(0, 100);
    if (!normalized) throw new ForbiddenException('Invalid emoji');
    await this.prisma.reaction.upsert({
      where: {
        messageId_userId_emoji: { messageId, userId, emoji: normalized },
      },
      create: { messageId, userId, emoji: normalized },
      update: {},
    });
    return this.getReactionCounts(messageId);
  }

  async remove(messageId: string, userId: string, emoji: string) {
    await this.messages.findOne(messageId, userId);
    const normalized = String(emoji).trim().slice(0, 100);
    await this.prisma.reaction.deleteMany({
      where: { messageId, userId, emoji: normalized },
    });
    return this.getReactionCounts(messageId);
  }

  async getReactionCounts(messageId: string) {
    const reactions = await this.prisma.reaction.groupBy({
      by: ['emoji'],
      where: { messageId },
      _count: { emoji: true },
    });
    return reactions.map((r) => ({ emoji: r.emoji, count: r._count.emoji }));
  }
}
