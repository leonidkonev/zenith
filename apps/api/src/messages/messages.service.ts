import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ServersService } from '../servers/servers.service';
import { ChannelsService } from '../channels/channels.service';
import { RolesService } from '../roles/roles.service';
import { CreateMessageDto } from './dto/create-message.dto';
import { UpdateMessageDto } from './dto/update-message.dto';

@Injectable()
export class MessagesService {
  constructor(
    private prisma: PrismaService,
    private servers: ServersService,
    private channels: ChannelsService,
    private roles: RolesService,
  ) {}

  async create(channelId: string, userId: string, dto: CreateMessageDto) {
    const channel = await this.channels.findOne(channelId, userId) as { id: string; serverId: string | null };
    if (!channel) throw new NotFoundException('Channel not found');
    if (channel.serverId) await this.roles.ensureCan(channel.serverId, userId, 'SEND_MESSAGES', channelId);
    const type = dto.threadId ? 'default' : dto.replyToId ? 'reply' : 'default';
    const content = dto.content.trim();
    const message = await this.prisma.message.create({
      data: {
        channelId,
        authorId: userId,
        content,
        type,
        replyToId: dto.replyToId || null,
        threadId: dto.threadId || null,
      },
      include: {
        author: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
        attachments: true,
      },
    });
    if (dto.attachments?.length) {
      await this.prisma.messageAttachment.createMany({
        data: dto.attachments.map((a) => ({
          messageId: message.id,
          url: a.url,
          filename: a.filename,
          size: a.size ?? null,
          mimeType: a.mimeType ?? null,
        })),
      });
    }
    if (channel.serverId) {
      const memberUserIds = await this.prisma.member.findMany({
        where: { serverId: channel.serverId },
        select: { userId: true },
      }).then((m: Array<{ userId: string }>) => m.map((x: { userId: string }) => x.userId));
      const users = await this.prisma.user.findMany({
        where: { id: { in: memberUserIds } },
        select: { id: true, username: true },
      });
      const mentionRegex = /@(\w{2,32})/g;
      let match: RegExpExecArray | null;
      const seen = new Set<string>();
      while ((match = mentionRegex.exec(content)) !== null) {
        const tag = match[1];
        const user = users.find((u: (typeof users)[number]) => u.username.toLowerCase() === tag.toLowerCase() || u.id === tag);
        if (user && !seen.has(user.id)) {
          seen.add(user.id);
          await this.prisma.mention.create({
            data: { messageId: message.id, userId: user.id, type: 'user' },
          });
        }
      }
    }
    const full = await this.prisma.message.findUnique({
      where: { id: message.id },
      include: {
        author: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
        attachments: true,
        mentions: { include: { user: { select: { id: true, username: true, displayName: true } } } },
      },
    });
    if (!full) throw new NotFoundException('Message not found');
    return full;
  }

  async findMany(channelId: string, userId: string, cursor?: string, limit = 50) {
    const channel = await this.channels.findOne(channelId, userId) as { id: string; serverId: string | null };
    if (channel.serverId) await this.roles.ensureCan(channel.serverId, userId, 'READ_MESSAGES', channelId);
    const take = Math.min(limit, 100);
    const messages = await this.prisma.message.findMany({
      where: { channelId, threadId: null, deletedAt: null },
      take: take + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      orderBy: { createdAt: 'desc' },
      include: {
        author: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
        reactions: true,
        attachments: true,
        mentions: { include: { user: { select: { id: true, username: true, displayName: true } } } },
      },
    });
    const hasMore = messages.length > take;
    const list = hasMore ? messages.slice(0, take) : messages;
    return { messages: list.reverse(), nextCursor: hasMore ? list[0]?.id : null };
  }

  async createForDm(dmChannelId: string, userId: string, content: string) {
    const message = await this.prisma.message.create({
      data: {
        dmChannelId,
        authorId: userId,
        content: content.trim(),
        type: 'default',
      },
      include: {
        author: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
        attachments: true,
      },
    });
    return this.prisma.message.findUnique({
      where: { id: message.id },
      include: {
        author: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
        attachments: true,
      },
    });
  }

  async findManyForDm(dmChannelId: string, userId: string, cursor?: string, limit = 50) {
    const take = Math.min(limit, 100);
    const messages = await this.prisma.message.findMany({
      where: { dmChannelId, deletedAt: null },
      take: take + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      orderBy: { createdAt: 'desc' },
      include: {
        author: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
        reactions: true,
        attachments: true,
      },
    });
    const hasMore = messages.length > take;
    const list = hasMore ? messages.slice(0, take) : messages;
    return { messages: list.reverse(), nextCursor: hasMore ? list[0]?.id : null };
  }

  async findOne(messageId: string, userId: string) {
    const msg = await this.prisma.message.findUnique({
      where: { id: messageId },
      include: {
        channel: true,
        author: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
        reactions: true,
        attachments: true,
        mentions: { include: { user: { select: { id: true, username: true, displayName: true } } } },
      },
    });
    if (!msg || msg.deletedAt) throw new NotFoundException('Message not found');
    if (msg.channel?.serverId) await this.servers.ensureMember(msg.channel.serverId, userId);
    return msg;
  }

  async update(messageId: string, userId: string, dto: UpdateMessageDto) {
    const msg = await this.prisma.message.findUnique({ where: { id: messageId }, include: { channel: true } });
    if (!msg || msg.deletedAt) throw new NotFoundException('Message not found');
    if (msg.authorId !== userId) {
      if (msg.channel?.serverId) await this.roles.ensureCan(msg.channel.serverId, userId, 'MANAGE_MESSAGES');
      else throw new ForbiddenException('Cannot edit this message');
    }
    return this.prisma.message.update({
      where: { id: messageId },
      data: { content: dto.content.trim(), editedAt: new Date() },
      include: {
        author: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
        attachments: true,
      },
    });
  }

  async remove(messageId: string, userId: string) {
    const msg = await this.prisma.message.findUnique({
      where: { id: messageId },
      include: { channel: true },
    });
    if (!msg || msg.deletedAt) throw new NotFoundException('Message not found');
    if (msg.authorId !== userId && msg.channel?.serverId) {
      await this.roles.ensureCan(msg.channel.serverId, userId, 'MANAGE_MESSAGES');
    }
    await this.prisma.message.update({
      where: { id: messageId },
      data: { deletedAt: new Date(), content: '' },
    });
    return { ok: true };
  }
}
