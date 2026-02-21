import { Body, Controller, Delete, Param, Post, UseGuards } from '@nestjs/common';
import { ModerationService } from './moderation.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';

@Controller('servers/:serverId/moderation')
@UseGuards(JwtAuthGuard)
export class ModerationController {
  constructor(private moderation: ModerationService) {}

  @Post('kick/:userId')
  kick(
    @Param('serverId') serverId: string,
    @Param('userId') userId: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.moderation.kick(serverId, user.id, userId);
  }

  @Post('ban/:userId')
  ban(
    @Param('serverId') serverId: string,
    @Param('userId') userId: string,
    @CurrentUser() user: { id: string },
    @Body() body: { reason?: string },
  ) {
    return this.moderation.ban(serverId, user.id, userId, body?.reason);
  }

  @Delete('ban/:userId')
  unban(
    @Param('serverId') serverId: string,
    @Param('userId') userId: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.moderation.unban(serverId, user.id, userId);
  }

  @Post('mute/:userId')
  mute(
    @Param('serverId') serverId: string,
    @Param('userId') userId: string,
    @CurrentUser() user: { id: string },
    @Body() body: { expiresInSeconds: number },
  ) {
    const sec = body?.expiresInSeconds ?? 3600;
    return this.moderation.mute(serverId, user.id, userId, sec);
  }
}
