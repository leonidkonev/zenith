import { Module } from '@nestjs/common';
import { MessagesController } from './messages.controller';
import { MessagesStandaloneController } from './messages-standalone.controller';
import { MessagesService } from './messages.service';
import { GatewayModule } from '../gateway/gateway.module';
import { RolesModule } from '../roles/roles.module';

@Module({
  imports: [GatewayModule, RolesModule],
  controllers: [MessagesController, MessagesStandaloneController],
  providers: [MessagesService],
  exports: [MessagesService],
})
export class MessagesModule {}
