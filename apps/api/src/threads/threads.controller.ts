import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ThreadsService } from './threads.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { CreateThreadDto } from './dto/create-thread.dto';

@Controller('channels/:channelId/threads')
@UseGuards(JwtAuthGuard)
export class ThreadsController {
  constructor(private threads: ThreadsService) {}

  @Post()
  create(
    @Param('channelId') channelId: string,
    @Body() dto: CreateThreadDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.threads.create(channelId, dto.rootMessageId, user.id, dto);
  }

  @Get()
  list(@Param('channelId') channelId: string, @CurrentUser() user: { id: string }) {
    return this.threads.listByChannel(channelId, user.id);
  }

  @Get(':threadId')
  findOne(@Param('threadId') threadId: string, @CurrentUser() user: { id: string }) {
    return this.threads.findOne(threadId, user.id);
  }

  @Get(':threadId/messages')
  listMessages(
    @Param('threadId') threadId: string,
    @CurrentUser() user: { id: string },
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
  ) {
    return this.threads.listMessages(threadId, user.id, cursor, limit ? parseInt(limit, 10) : undefined);
  }
}
