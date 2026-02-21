import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { DmChannelsService } from './dm-channels.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { MessagesService } from '../messages/messages.service';

@Controller('dm-channels')
@UseGuards(JwtAuthGuard)
export class DmChannelsController {
  constructor(
    private dm: DmChannelsService,
    private messages: MessagesService,
  ) {}

  @Get()
  listMy(@CurrentUser() user: { id: string }) {
    return this.dm.listMy(user.id);
  }

  @Post()
  getOrCreate(@CurrentUser() user: { id: string }, @Body() body: { userId: string }) {
    return this.dm.getOrCreateDm(user.id, body.userId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: { id: string }) {
    return this.dm.findOne(id, user.id);
  }

  @Get(':id/messages')
  getMessages(
    @Param('id') id: string,
    @CurrentUser() user: { id: string },
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
  ) {
    this.dm.ensureMember(id, user.id);
    return this.messages.findManyForDm(id, user.id, cursor, limit ? parseInt(limit, 10) : undefined);
  }

  @Post(':id/messages')
  async sendMessage(
    @Param('id') id: string,
    @CurrentUser() user: { id: string },
    @Body() body: { content: string },
  ) {
    this.dm.ensureMember(id, user.id);
    return this.messages.createForDm(id, user.id, body.content ?? '');
  }
}
