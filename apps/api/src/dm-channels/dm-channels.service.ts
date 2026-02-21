import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DmChannelsService {
  constructor(private prisma: PrismaService) {}

  async listMy(userId: string) {
    const members = await this.prisma.dmChannelMember.findMany({
      where: { userId },
      include: {
        channel: {
          include: {
            members: {
              include: {
                user: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
              },
            },
          },
        },
      },
    });
    return members.map((m) => m.channel);
  }

  async getOrCreateDm(userId: string, targetUserId: string) {
    if (userId === targetUserId) throw new ForbiddenException('Cannot DM yourself');
    const target = await this.prisma.user.findUnique({ where: { id: targetUserId } });
    if (!target) throw new NotFoundException('User not found');
    const myChannels = await this.prisma.dmChannelMember.findMany({
      where: { userId, channel: { type: 'dm' } },
      select: { channelId: true },
    });
    for (const { channelId } of myChannels) {
      const members = await this.prisma.dmChannelMember.findMany({
        where: { channelId },
        include: { user: { select: { id: true, username: true, displayName: true, avatarUrl: true } } },
      });
      if (members.length === 2 && members.some((m) => m.userId === targetUserId)) {
        return this.prisma.dmChannel.findUnique({
          where: { id: channelId },
          include: {
            members: { include: { user: { select: { id: true, username: true, displayName: true, avatarUrl: true } } } },
          },
        });
      }
    }
    const channel = await this.prisma.dmChannel.create({
      data: {
        type: 'dm',
        members: {
          create: [{ userId }, { userId: targetUserId }],
        },
      },
      include: {
        members: { include: { user: { select: { id: true, username: true, displayName: true, avatarUrl: true } } } },
      },
    });
    return channel;
  }

  async findOne(dmChannelId: string, userId: string) {
    const member = await this.prisma.dmChannelMember.findFirst({
      where: { channelId: dmChannelId, userId },
      include: {
        channel: {
          include: {
            members: { include: { user: { select: { id: true, username: true, displayName: true, avatarUrl: true } } } },
          },
        },
      },
    });
    if (!member) throw new NotFoundException('DM channel not found');
    return member.channel;
  }

  async ensureMember(dmChannelId: string, userId: string) {
    const m = await this.prisma.dmChannelMember.findFirst({
      where: { channelId: dmChannelId, userId },
    });
    if (!m) throw new ForbiddenException('Not in this DM');
    return m;
  }
}
