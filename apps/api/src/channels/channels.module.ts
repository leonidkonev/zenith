import { Module } from '@nestjs/common';
import { ChannelsController } from './channels.controller';
import { ChannelsStandaloneController } from './channels-standalone.controller';
import { ChannelsService } from './channels.service';
import { RolesModule } from '../roles/roles.module';

@Module({
  imports: [RolesModule],
  controllers: [ChannelsController, ChannelsStandaloneController],
  providers: [ChannelsService],
  exports: [ChannelsService],
})
export class ChannelsModule {}
