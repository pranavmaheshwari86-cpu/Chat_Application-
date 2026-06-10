import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { AuthenticatedRequest } from '@chat/shared';
import { StoriesService } from './stories.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('Stories')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('stories')
export class StoriesController {
  constructor(private readonly storiesService: StoriesService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new story (image, video, text, poll)' })
  async create(
    @Req() req: AuthenticatedRequest,
    @Body()
    body: {
      type: string;
      mediaUrl?: string;
      thumbnailUrl?: string;
      text?: string;
      backgroundColor?: string;
      fontStyle?: string;
      visibility?: string;
      allowedUserIds?: string[];
      pollOptions?: Array<{ text: string }>;
      communityId?: string;
    },
  ) {
    const story = await this.storiesService.createStory(req.user.id, body);
    return { data: story };
  }

  @Get('feed')
  @ApiOperation({
    summary: 'Get story feed (stories from followed users, grouped by author)',
  })
  async getFeed(
    @Req() req: AuthenticatedRequest,
    @Query('followedIds') followedIds: string,
  ) {
    // Client sends comma-separated followed user IDs
    const ids = followedIds ? followedIds.split(',').filter(Boolean) : [];
    const feed = await this.storiesService.getStoryFeed(ids);
    return { data: feed };
  }

  @Get('user/:userId')
  @ApiOperation({ summary: 'Get active stories for a specific user' })
  async getUserStories(@Param('userId') userId: string) {
    const stories = await this.storiesService.getUserStories(userId);
    return { data: stories };
  }

  @Get('highlights/:userId')
  @ApiOperation({ summary: 'Get story highlights for a user' })
  async getHighlights(@Param('userId') userId: string) {
    const highlights = await this.storiesService.getHighlights(userId);
    return { data: highlights };
  }

  @Post(':id/view')
  @ApiOperation({ summary: 'Mark a story as viewed' })
  async markViewed(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    await this.storiesService.markViewed(id, req.user.id);
    return { success: true };
  }

  @Post(':id/react')
  @ApiOperation({ summary: 'React to a story with an emoji' })
  async react(
    @Param('id') id: string,
    @Req() req: AuthenticatedRequest,
    @Body() body: { emoji: string },
  ) {
    await this.storiesService.reactToStory(id, req.user.id, body.emoji);
    return { success: true };
  }

  @Post(':id/vote')
  @ApiOperation({ summary: 'Vote on a poll story' })
  async vote(
    @Param('id') id: string,
    @Req() req: AuthenticatedRequest,
    @Body() body: { optionIndex: number },
  ) {
    const story = await this.storiesService.votePoll(
      id,
      req.user.id,
      body.optionIndex,
    );
    return { data: story };
  }

  @Patch(':id/highlight')
  @ApiOperation({
    summary: 'Save story to highlights (persists past 24h expiry)',
  })
  async saveHighlight(
    @Param('id') id: string,
    @Req() req: AuthenticatedRequest,
    @Body() body: { groupName: string },
  ) {
    const story = await this.storiesService.saveToHighlight(
      id,
      req.user.id,
      body.groupName,
    );
    return { data: story };
  }
}
