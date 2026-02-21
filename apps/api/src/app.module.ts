import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ServersModule } from './servers/servers.module';
import { ChannelsModule } from './channels/channels.module';
import { MessagesModule } from './messages/messages.module';
import { GatewayModule } from './gateway/gateway.module';
import { RolesModule } from './roles/roles.module';
import { ThreadsModule } from './threads/threads.module';
import { ReactionsModule } from './reactions/reactions.module';
import { InvitesModule } from './invites/invites.module';
import { DmChannelsModule } from './dm-channels/dm-channels.module';
import { ModerationModule } from './moderation/moderation.module';
import { SearchModule } from './search/search.module';
import { UploadsModule } from './uploads/uploads.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    UsersModule,
    ServersModule,
    ChannelsModule,
    MessagesModule,
    GatewayModule,
    RolesModule,
    ThreadsModule,
    ReactionsModule,
    InvitesModule,
    DmChannelsModule,
    ModerationModule,
    SearchModule,
    UploadsModule,
  ],
})
export class AppModule {}
