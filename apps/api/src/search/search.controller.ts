import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { SearchService } from './search.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';

@Controller('search')
@UseGuards(JwtAuthGuard)
export class SearchController {
  constructor(private search: SearchService) {}

  @Get('messages')
  searchMessages(
    @CurrentUser() user: { id: string },
    @Query('q') q: string,
    @Query('serverId') serverId?: string,
    @Query('limit') limit?: string,
  ) {
    return this.search.searchMessages(user.id, q ?? '', serverId, limit ? parseInt(limit, 10) : undefined);
  }
}
