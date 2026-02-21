import { Body, Controller, Delete, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { MessagesService } from './messages.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { UpdateMessageDto } from './dto/update-message.dto';

@Controller('messages')
@UseGuards(JwtAuthGuard)
export class MessagesStandaloneController {
  constructor(private messages: MessagesService) {}

  @Get(':messageId')
  findOne(@Param('messageId') messageId: string, @CurrentUser() user: { id: string }) {
    return this.messages.findOne(messageId, user.id);
  }

  @Patch(':messageId')
  update(
    @Param('messageId') messageId: string,
    @CurrentUser() user: { id: string },
    @Body() dto: UpdateMessageDto,
  ) {
    return this.messages.update(messageId, user.id, dto);
  }

  @Delete(':messageId')
  remove(@Param('messageId') messageId: string, @CurrentUser() user: { id: string }) {
    return this.messages.remove(messageId, user.id);
  }
}
