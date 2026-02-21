import { Module } from '@nestjs/common';
import { DmChannelsController } from './dm-channels.controller';
import { DmChannelsService } from './dm-channels.service';
import { MessagesModule } from '../messages/messages.module';

@Module({
  imports: [MessagesModule],
  controllers: [DmChannelsController],
  providers: [DmChannelsService],
  exports: [DmChannelsService],
})
export class DmChannelsModule {}
