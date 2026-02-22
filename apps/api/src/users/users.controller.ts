import { Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private users: UsersService) {}

  @Get('me')
  me(@CurrentUser() user: { id: string }) {
    return this.users.getProfile(user.id);
  }

  @Patch('me')
  updateMe(@CurrentUser() user: { id: string }, @Body() body: { status?: string }) {
    return this.users.updateStatus(user.id, body.status);
  }

  @Patch('me/profile')
  updateProfile(@CurrentUser() user: { id: string }, @Body() body: { displayName?: string; bio?: string; avatarUrl?: string }) {
    return this.users.updateProfile(user.id, body);
  }

  @Get(':id')
  profile(@Param('id') id: string) {
    return this.users.getPublicProfile(id);
  }
}
