import { Body, Controller, Delete, Param, Post, UseGuards } from '@nestjs/common';
import { ReactionsService } from './reactions.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';

@Controller('messages/:messageId/reactions')
@UseGuards(JwtAuthGuard)
export class ReactionsController {
  constructor(
    private reactions: ReactionsService,
  ) {}

  @Post()
  async add(
    @Param('messageId') messageId: string,
    @CurrentUser() user: { id: string },
    @Body() body: { emoji?: string },
  ) {
    const emoji = body?.emoji ?? '👍';
    const counts = await this.reactions.add(messageId, user.id, emoji);
    return { emoji, counts };
  }

  @Delete(':emoji')
  async remove(
    @Param('messageId') messageId: string,
    @Param('emoji') emoji: string,
    @CurrentUser() user: { id: string },
  ) {
    const counts = await this.reactions.remove(messageId, user.id, decodeURIComponent(emoji));
    return { counts };
  }
}
