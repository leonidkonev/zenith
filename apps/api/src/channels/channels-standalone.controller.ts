import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ChannelsService } from './channels.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';

@Controller('channels')
@UseGuards(JwtAuthGuard)
export class ChannelsStandaloneController {
  constructor(private channels: ChannelsService) {}

  @Get(':channelId')
  findOne(@Param('channelId') channelId: string, @CurrentUser() user: { id: string }) {
    return this.channels.findOne(channelId, user.id);
  }
}
