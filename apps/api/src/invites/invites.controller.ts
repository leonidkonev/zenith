import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { InvitesService } from './invites.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { CreateInviteDto } from './dto/create-invite.dto';

@Controller('invites')
export class InvitesController {
  constructor(private invites: InvitesService) {}

  @Get('resolve/:code')
  resolve(@Param('code') code: string) {
    return this.invites.resolve(code);
  }

  @Post('accept')
  @UseGuards(JwtAuthGuard)
  accept(@Body() body: { code: string }, @CurrentUser() user: { id: string }) {
    return this.invites.accept(body.code, user.id);
  }

  @Post('servers/:serverId/channels/:channelId')
  @UseGuards(JwtAuthGuard)
  create(
    @Param('serverId') serverId: string,
    @Param('channelId') channelId: string,
    @CurrentUser() user: { id: string },
    @Body() dto: CreateInviteDto,
  ) {
    return this.invites.create(serverId, channelId, user.id, dto);
  }

  @Get('servers/:serverId')
  @UseGuards(JwtAuthGuard)
  listByServer(@Param('serverId') serverId: string, @CurrentUser() user: { id: string }) {
    return this.invites.listByServer(serverId, user.id);
  }
}
