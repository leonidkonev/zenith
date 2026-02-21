import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateServerDto } from './dto/create-server.dto';

const DEFAULT_MEMBER_PERMISSIONS = (1n << 1n) | (1n << 2n) | (1n << 9n); // SEND_MESSAGES | READ_MESSAGES | ADD_REACTIONS

@Injectable()
export class ServersService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, dto: CreateServerDto) {
    const server = await this.prisma.server.create({
      data: {
        name: dto.name,
        ownerId: userId,
      },
    });
    const member = await this.prisma.member.create({
      data: { userId, serverId: server.id },
    });
    const defaultRole = await this.prisma.role.create({
      data: {
        serverId: server.id,
        name: 'Member',
        permissions: DEFAULT_MEMBER_PERMISSIONS,
        position: 0,
      },
    });
    await this.prisma.memberRole.create({
      data: { memberId: member.id, roleId: defaultRole.id },
    });
    await this.prisma.channel.create({
      data: {
        serverId: server.id,
        type: 'text',
        name: 'general',
        position: 0,
      },
    });
    return this.prisma.server.findUnique({
      where: { id: server.id },
      include: {
        channels: { orderBy: { position: 'asc' } },
        owner: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
      },
    });
  }

  async findMyServers(userId: string) {
    const members = await this.prisma.member.findMany({
      where: { userId },
      include: {
        server: {
          include: {
            channels: { orderBy: { position: 'asc' }, take: 10 },
            owner: { select: { id: true, username: true } },
          },
        },
      },
    });
    return members.map((m: (typeof members)[number]) => m.server);
  }

  async findOne(serverId: string, userId: string) {
    const member = await this.prisma.member.findUnique({
      where: { userId_serverId: { userId, serverId } },
      include: {
        server: {
          include: {
            channels: { orderBy: { position: 'asc' } },
            roles: { orderBy: { position: 'desc' } },
            owner: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
          },
        },
      },
    });
    if (!member) throw new NotFoundException('Server not found');
    return member.server;
  }

  async ensureMember(serverId: string, userId: string) {
    const m = await this.prisma.member.findUnique({
      where: { userId_serverId: { userId, serverId } },
    });
    if (!m) throw new ForbiddenException('Not a member of this server');
    return m;
  }
}
