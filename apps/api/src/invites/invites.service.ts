import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RolesService } from '../roles/roles.service';
import { CreateInviteDto } from './dto/create-invite.dto';

function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

@Injectable()
export class InvitesService {
  constructor(
    private prisma: PrismaService,
    private roles: RolesService,
  ) {}

  async create(serverId: string, channelId: string, userId: string, dto: CreateInviteDto) {
    await this.roles.ensureCan(serverId, userId, 'CREATE_INVITE');
    const channel = await this.prisma.channel.findFirst({
      where: { id: channelId, serverId },
    });
    if (!channel) throw new NotFoundException('Channel not found');
    let code = generateCode();
    while (await this.prisma.invite.findUnique({ where: { code } })) {
      code = generateCode();
    }
    const expiresAt = dto.expiresIn
      ? new Date(Date.now() + dto.expiresIn * 1000)
      : null;
    return this.prisma.invite.create({
      data: {
        code,
        serverId,
        channelId,
        inviterId: userId,
        maxUses: dto.maxUses ?? null,
        expiresAt,
      },
      include: {
        server: { select: { id: true, name: true, iconUrl: true } },
        channel: { select: { id: true, name: true } },
      },
    });
  }

  async resolve(code: string) {
    const invite = await this.prisma.invite.findUnique({
      where: { code },
      include: {
        server: { select: { id: true, name: true, iconUrl: true } },
        channel: { select: { id: true, name: true } },
      },
    });
    if (!invite) throw new NotFoundException('Invite not found');
    if (invite.expiresAt && invite.expiresAt < new Date()) {
      throw new ForbiddenException('Invite expired');
    }
    if (invite.maxUses != null && invite.useCount >= invite.maxUses) {
      throw new ForbiddenException('Invite has reached max uses');
    }
    return invite;
  }

  async accept(code: string, userId: string) {
    const invite = await this.resolve(code);
    const banned = await this.prisma.ban.findFirst({
      where: { serverId: invite.serverId, userId },
    });
    if (banned) throw new ForbiddenException('You are banned from this server');
    const existing = await this.prisma.member.findUnique({
      where: { userId_serverId: { userId, serverId: invite.serverId } },
    });
    if (existing) {
      return { server: invite.server, channel: invite.channel, alreadyMember: true };
    }
    const defaultRole = await this.prisma.role.findFirst({
      where: { serverId: invite.serverId, name: 'Member' },
    });
    const member = await this.prisma.member.create({
      data: { userId, serverId: invite.serverId },
    });
    if (defaultRole) {
      await this.prisma.memberRole.create({
        data: { memberId: member.id, roleId: defaultRole.id },
      });
    }
    await this.prisma.invite.update({
      where: { id: invite.id },
      data: { useCount: { increment: 1 } },
    });
    return { server: invite.server, channel: invite.channel, alreadyMember: false };
  }

  async listByServer(serverId: string, userId: string) {
    await this.roles.ensureCan(serverId, userId, 'CREATE_INVITE');
    return this.prisma.invite.findMany({
      where: { serverId },
      orderBy: { createdAt: 'desc' },
      include: {
        channel: { select: { id: true, name: true } },
        inviter: { select: { id: true, username: true } },
      },
    });
  }
}
