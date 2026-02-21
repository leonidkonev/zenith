import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ServersService } from '../servers/servers.service';
import { RolesService } from '../roles/roles.service';
import { CreateChannelDto } from './dto/create-channel.dto';
import { UpdateChannelDto } from './dto/update-channel.dto';

@Injectable()
export class ChannelsService {
  constructor(
    private prisma: PrismaService,
    private servers: ServersService,
    private roles: RolesService,
  ) {}

  async listByServer(serverId: string, userId: string) {
    await this.servers.ensureMember(serverId, userId);
    return this.prisma.channel.findMany({
      where: { serverId },
      orderBy: [{ position: 'asc' }, { createdAt: 'asc' }],
    });
  }

  async create(serverId: string, userId: string, dto: CreateChannelDto) {
    await this.roles.ensureCan(serverId, userId, 'MANAGE_CHANNELS');
    const maxPos = await this.prisma.channel.findFirst({
      where: { serverId, parentId: dto.parentId || null },
      orderBy: { position: 'desc' },
      select: { position: true },
    });
    const position = dto.position ?? (maxPos ? maxPos.position + 1 : 0);
    return this.prisma.channel.create({
      data: {
        serverId,
        type: dto.type,
        name: dto.name.trim(),
        parentId: dto.parentId || null,
        position,
      },
    });
  }

  async findOne(channelId: string, userId: string) {
    const ch = await this.prisma.channel.findUnique({
      where: { id: channelId },
      include: { server: true },
    });
    if (!ch) throw new NotFoundException('Channel not found');
    if (ch.serverId) await this.servers.ensureMember(ch.serverId, userId);
    return ch;
  }

  async update(channelId: string, userId: string, dto: UpdateChannelDto) {
    const ch = await this.findOne(channelId, userId);
    if (!ch.serverId) throw new ForbiddenException('Cannot update DM channel');
    await this.roles.ensureCan(ch.serverId, userId, 'MANAGE_CHANNELS');
    return this.prisma.channel.update({
      where: { id: channelId },
      data: {
        ...(dto.name !== undefined && { name: dto.name.trim() }),
        ...(dto.position !== undefined && { position: dto.position }),
        ...(dto.parentId !== undefined && { parentId: dto.parentId }),
      },
    });
  }

  async remove(channelId: string, userId: string) {
    const ch = await this.findOne(channelId, userId);
    if (!ch.serverId) throw new ForbiddenException('Cannot delete DM channel');
    await this.roles.ensureCan(ch.serverId, userId, 'MANAGE_CHANNELS');
    await this.prisma.channel.delete({ where: { id: channelId } });
    return { ok: true };
  }
}
