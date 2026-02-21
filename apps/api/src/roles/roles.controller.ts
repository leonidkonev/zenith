import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { RolesService } from './roles.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';

@Controller('servers/:serverId/roles')
@UseGuards(JwtAuthGuard)
export class RolesController {
  constructor(private roles: RolesService) {}

  @Post()
  create(
    @Param('serverId') serverId: string,
    @CurrentUser() user: { id: string },
    @Body() dto: CreateRoleDto,
  ) {
    return this.roles.create(serverId, user.id, dto);
  }

  @Get()
  findAll(@Param('serverId') serverId: string, @CurrentUser() user: { id: string }) {
    return this.roles.findAll(serverId, user.id);
  }

  @Patch(':roleId')
  update(
    @Param('serverId') serverId: string,
    @Param('roleId') roleId: string,
    @CurrentUser() user: { id: string },
    @Body() dto: UpdateRoleDto,
  ) {
    return this.roles.update(roleId, user.id, dto);
  }

  @Delete(':roleId')
  remove(
    @Param('serverId') serverId: string,
    @Param('roleId') roleId: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.roles.remove(roleId, user.id);
  }

  @Post(':roleId/members/:memberId')
  assign(
    @Param('serverId') serverId: string,
    @Param('roleId') roleId: string,
    @Param('memberId') memberId: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.roles.assignToMember(serverId, roleId, memberId, user.id);
  }

  @Delete(':roleId/members/:memberId')
  unassign(
    @Param('serverId') serverId: string,
    @Param('roleId') roleId: string,
    @Param('memberId') memberId: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.roles.removeFromMember(serverId, roleId, memberId, user.id);
  }
}
