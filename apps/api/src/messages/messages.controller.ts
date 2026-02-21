import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { MessagesService } from './messages.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { CreateMessageDto } from './dto/create-message.dto';
import { EventsGateway } from '../gateway/events.gateway';

@Controller('channels/:channelId/messages')
@UseGuards(JwtAuthGuard)
export class MessagesController {
  constructor(
    private messages: MessagesService,
    private gateway: EventsGateway,
  ) {}

  @Post()
  async create(
    @Param('channelId') channelId: string,
    @CurrentUser() user: { id: string },
    @Body() dto: CreateMessageDto,
  ) {
    const message = await this.messages.create(channelId, user.id, dto);
    this.gateway.broadcastToChannel(channelId, 'new_message', message);
    return message;
  }

  @Get()
  findMany(
    @Param('channelId') channelId: string,
    @CurrentUser() user: { id: string },
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
  ) {
    return this.messages.findMany(channelId, user.id, cursor, limit ? parseInt(limit, 10) : undefined);
  }

}
