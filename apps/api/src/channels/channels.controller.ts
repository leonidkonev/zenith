import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ChannelsService } from './channels.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { CreateChannelDto } from './dto/create-channel.dto';
import { UpdateChannelDto } from './dto/update-channel.dto';

@Controller('servers/:serverId/channels')
@UseGuards(JwtAuthGuard)
export class ChannelsController {
  constructor(private channels: ChannelsService) {}

  @Get()
  list(@Param('serverId') serverId: string, @CurrentUser() user: { id: string }) {
    return this.channels.listByServer(serverId, user.id);
  }

  @Post()
  create(
    @Param('serverId') serverId: string,
    @CurrentUser() user: { id: string },
    @Body() dto: CreateChannelDto,
  ) {
    return this.channels.create(serverId, user.id, dto);
  }

  @Get(':channelId')
  getChannel(@Param('channelId') channelId: string, @CurrentUser() user: { id: string }) {
    return this.channels.findOne(channelId, user.id);
  }

  @Patch(':channelId')
  update(
    @Param('channelId') channelId: string,
    @CurrentUser() user: { id: string },
    @Body() dto: UpdateChannelDto,
  ) {
    return this.channels.update(channelId, user.id, dto);
  }

  @Delete(':channelId')
  remove(@Param('channelId') channelId: string, @CurrentUser() user: { id: string }) {
    return this.channels.remove(channelId, user.id);
  }
}
