import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ChannelsService } from '../channels/channels.service';
import { CreateThreadDto } from './dto/create-thread.dto';

@Injectable()
export class ThreadsService {
  constructor(
    private prisma: PrismaService,
    private channels: ChannelsService,
  ) {}

  async create(channelId: string, rootMessageId: string, userId: string, dto: CreateThreadDto) {
    await this.channels.findOne(channelId, userId);
    const root = await this.prisma.message.findUnique({
      where: { id: rootMessageId, channelId, deletedAt: null },
    });
    if (!root) throw new NotFoundException('Message not found');
    const existing = await this.prisma.thread.findUnique({
      where: { rootMessageId },
    });
    if (existing) throw new ForbiddenException('Thread already exists for this message');
    const thread = await this.prisma.thread.create({
      data: {
        channelId,
        rootMessageId,
        title: dto.title,
      },
      include: {
        rootMessage: {
          include: {
            author: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
          },
        },
      },
    });
    await this.prisma.message.update({
      where: { id: rootMessageId },
      data: { threadId: thread.id, type: 'thread_starter' },
    });
    return thread;
  }

  async listByChannel(channelId: string, userId: string) {
    await this.channels.findOne(channelId, userId);
    return this.prisma.thread.findMany({
      where: { channelId },
      orderBy: { createdAt: 'desc' },
      include: {
        rootMessage: {
          include: {
            author: { select: { id: true, username: true, displayName: true } },
          },
        },
      },
    });
  }

  async findOne(threadId: string, userId: string) {
    const thread = await this.prisma.thread.findUnique({
      where: { id: threadId },
      include: {
        channel: true,
        rootMessage: {
          include: {
            author: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
          },
        },
      },
    });
    if (!thread) throw new NotFoundException('Thread not found');
    if (thread.channel.serverId) await this.channels.findOne(thread.channelId, userId);
    return thread;
  }

  async listMessages(threadId: string, userId: string, cursor?: string, limit = 50) {
    await this.findOne(threadId, userId);
    const take = Math.min(limit, 100);
    const messages = await this.prisma.message.findMany({
      where: { threadId, deletedAt: null },
      take: take + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      orderBy: { createdAt: 'asc' },
      include: {
        author: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
        reactions: true,
        attachments: true,
      },
    });
    const hasMore = messages.length > take;
    const list = hasMore ? messages.slice(0, take) : messages;
    return { messages: list, nextCursor: hasMore ? list[list.length - 1]?.id : null };
  }
}
