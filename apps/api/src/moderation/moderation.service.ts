import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RolesService } from '../roles/roles.service';

@Injectable()
export class ModerationService {
  constructor(
    private prisma: PrismaService,
    private roles: RolesService,
  ) {}

  async kick(serverId: string, userId: string, targetUserId: string) {
    await this.roles.ensureCan(serverId, userId, 'KICK_MEMBERS');
    const server = await this.prisma.server.findUnique({ where: { id: serverId } });
    if (!server) throw new NotFoundException('Server not found');
    if (server.ownerId === targetUserId) throw new ForbiddenException('Cannot kick owner');
    const member = await this.prisma.member.findUnique({
      where: { userId_serverId: { userId: targetUserId, serverId } },
    });
    if (!member) throw new NotFoundException('Member not found');
    await this.prisma.memberRole.deleteMany({ where: { memberId: member.id } });
    await this.prisma.member.delete({ where: { id: member.id } });
    return { ok: true };
  }

  async ban(serverId: string, userId: string, targetUserId: string, reason?: string) {
    await this.roles.ensureCan(serverId, userId, 'BAN_MEMBERS');
    const server = await this.prisma.server.findUnique({ where: { id: serverId } });
    if (!server) throw new NotFoundException('Server not found');
    if (server.ownerId === targetUserId) throw new ForbiddenException('Cannot ban owner');
    const existing = await this.prisma.ban.findFirst({
      where: { serverId, userId: targetUserId },
    });
    if (existing) throw new ForbiddenException('User already banned');
    const member = await this.prisma.member.findUnique({
      where: { userId_serverId: { userId: targetUserId, serverId } },
    });
    if (member) {
      await this.prisma.memberRole.deleteMany({ where: { memberId: member.id } });
      await this.prisma.member.delete({ where: { id: member.id } });
    }
    await this.prisma.ban.create({
      data: {
        serverId,
        userId: targetUserId,
        bannedById: userId,
        reason: reason ?? null,
      },
    });
    return { ok: true };
  }

  async unban(serverId: string, userId: string, targetUserId: string) {
    await this.roles.ensureCan(serverId, userId, 'BAN_MEMBERS');
    await this.prisma.ban.deleteMany({
      where: { serverId, userId: targetUserId },
    });
    return { ok: true };
  }

  async mute(serverId: string, userId: string, targetUserId: string, expiresInSeconds: number) {
    await this.roles.ensureCan(serverId, userId, 'KICK_MEMBERS');
    const server = await this.prisma.server.findUnique({ where: { id: serverId } });
    if (!server) throw new NotFoundException('Server not found');
    if (server.ownerId === targetUserId) throw new ForbiddenException('Cannot mute owner');
    const expiresAt = new Date(Date.now() + expiresInSeconds * 1000);
    await this.prisma.mute.deleteMany({
      where: { serverId, userId: targetUserId },
    });
    await this.prisma.mute.create({
      data: { serverId, userId: targetUserId, expiresAt },
    });
    return { ok: true, expiresAt };
  }
}
