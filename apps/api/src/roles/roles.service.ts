import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ServersService } from '../servers/servers.service';
import { getOwnerPermissions, mergeAllowDeny, hasPermission, PERMISSIONS } from './permissions';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';

@Injectable()
export class RolesService {
  constructor(
    private prisma: PrismaService,
    private servers: ServersService,
  ) {}

  async resolveMemberPermissions(serverId: string, userId: string, channelId?: string): Promise<bigint> {
    const server = await this.prisma.server.findUnique({ where: { id: serverId } });
    if (!server) throw new NotFoundException('Server not found');
    if (server.ownerId === userId) return getOwnerPermissions();

    const member = await this.prisma.member.findUnique({
      where: { userId_serverId: { userId, serverId } },
      include: { roles: { include: { role: true } } },
    });
    if (!member) return 0n;

    let base = 0n;
    for (const mr of member.roles) {
      base = base | mr.role.permissions;
    }

    if (channelId) {
      const overrides = await this.prisma.channelPermissionOverride.findMany({
        where: {
          channelId,
          OR: [
            { roleId: { in: member.roles.map((r) => r.roleId) } },
            { userId },
          ],
        },
      });
      let allow = 0n;
      let deny = 0n;
      for (const o of overrides) {
        allow = allow | o.allow;
        deny = deny | o.deny;
      }
      base = mergeAllowDeny(base, allow, deny);
    }
    return base;
  }

  async ensureCan(serverId: string, userId: string, permission: keyof typeof PERMISSIONS, channelId?: string) {
    const perms = await this.resolveMemberPermissions(serverId, userId, channelId);
    if (!hasPermission(perms, permission)) throw new ForbiddenException('Missing permission: ' + permission);
  }

  async create(serverId: string, userId: string, dto: CreateRoleDto) {
    await this.ensureCan(serverId, userId, 'MANAGE_ROLES');
    const maxPos = await this.prisma.role.findFirst({
      where: { serverId },
      orderBy: { position: 'desc' },
      select: { position: true },
    });
    const position = dto.position ?? (maxPos ? maxPos.position + 1 : 0);
    const permissions = dto.permissions ? BigInt(dto.permissions) : 0n;
    return this.prisma.role.create({
      data: {
        serverId,
        name: dto.name,
        color: dto.color ?? '#99aab5',
        position,
        mentionable: dto.mentionable ?? false,
        permissions,
      },
    });
  }

  async findAll(serverId: string, userId: string) {
    await this.servers.ensureMember(serverId, userId);
    return this.prisma.role.findMany({
      where: { serverId },
      orderBy: { position: 'desc' },
    });
  }

  async update(roleId: string, userId: string, dto: UpdateRoleDto) {
    const role = await this.prisma.role.findUnique({ where: { id: roleId } });
    if (!role) throw new NotFoundException('Role not found');
    await this.ensureCan(role.serverId, userId, 'MANAGE_ROLES');
    const data: { name?: string; color?: string; position?: number; mentionable?: boolean; permissions?: bigint } = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.color !== undefined) data.color = dto.color;
    if (dto.position !== undefined) data.position = dto.position;
    if (dto.mentionable !== undefined) data.mentionable = dto.mentionable;
    if (dto.permissions !== undefined) data.permissions = BigInt(dto.permissions);
    return this.prisma.role.update({
      where: { id: roleId },
      data,
    });
  }

  async remove(roleId: string, userId: string) {
    const role = await this.prisma.role.findUnique({ where: { id: roleId } });
    if (!role) throw new NotFoundException('Role not found');
    await this.ensureCan(role.serverId, userId, 'MANAGE_ROLES');
    await this.prisma.role.delete({ where: { id: roleId } });
    return { ok: true };
  }

  async assignToMember(serverId: string, roleId: string, memberId: string, userId: string) {
    await this.ensureCan(serverId, userId, 'MANAGE_ROLES');
    const role = await this.prisma.role.findFirst({ where: { id: roleId, serverId } });
    const member = await this.prisma.member.findFirst({ where: { id: memberId, serverId } });
    if (!role || !member) throw new NotFoundException('Role or member not found');
    await this.prisma.memberRole.upsert({
      where: { memberId_roleId: { memberId, roleId } },
      create: { memberId, roleId },
      update: {},
    });
    return { ok: true };
  }

  async removeFromMember(serverId: string, roleId: string, memberId: string, userId: string) {
    await this.ensureCan(serverId, userId, 'MANAGE_ROLES');
    await this.prisma.memberRole.deleteMany({
      where: { memberId, roleId },
    });
    return { ok: true };
  }
}
