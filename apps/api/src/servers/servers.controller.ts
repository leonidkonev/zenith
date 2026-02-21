import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ServersService } from './servers.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { CreateServerDto } from './dto/create-server.dto';

@Controller('servers')
@UseGuards(JwtAuthGuard)
export class ServersController {
  constructor(private servers: ServersService) {}

  @Post()
  create(@CurrentUser() user: { id: string }, @Body() dto: CreateServerDto) {
    return this.servers.create(user.id, dto);
  }

  @Get()
  findMy(@CurrentUser() user: { id: string }) {
    return this.servers.findMyServers(user.id);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: { id: string }) {
    return this.servers.findOne(id, user.id);
  }
}
