import { Controller, Get, UseGuards, Request, Query } from '@nestjs/common';
import type { AuthenticatedRequest } from '@chat/shared';
import { FeedService } from './feed.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@Controller('feed')
@UseGuards(JwtAuthGuard)
export class FeedController {
  constructor(private readonly feedService: FeedService) {}

  @Get()
  getFeed(
    @Request() req: AuthenticatedRequest,
    @Query('limit') limit?: string,
    @Query('skip') skip?: string,
  ) {
    return this.feedService.getFeed(
      req.user.userId,
      limit ? parseInt(limit) : 10,
      skip ? parseInt(skip) : 0,
    );
  }
}
