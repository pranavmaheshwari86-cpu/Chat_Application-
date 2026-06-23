import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { AuthenticatedRequest } from '@chat/shared';
import { StoriesService } from './stories.service';
import { FollowsService } from '../follows/follows.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsArray,
  IsNumber,
  Min,
} from 'class-validator';

export class CreateStoryDto {
  @IsString()
  @IsNotEmpty()
  type: string;

  @IsString()
  @IsOptional()
  mediaUrl?: string;

  @IsString()
  @IsOptional()
  thumbnailUrl?: string;

  @IsString()
  @IsOptional()
  text?: string;

  @IsString()
  @IsOptional()
  backgroundColor?: string;

  @IsString()
  @IsOptional()
  fontStyle?: string;

  @IsString()
  @IsOptional()
  visibility?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  allowedUserIds?: string[];

  @IsArray()
  @IsOptional()
  pollOptions?: Array<{ text: string }>;

  @IsString()
  @IsOptional()
  communityId?: string;
}

export class StoryReactionDto {
  @IsString()
  @IsNotEmpty()
  emoji: string;
}

export class StoryVoteDto {
  @IsNumber()
  @Min(0)
  optionIndex: number;
}

export class StoryHighlightDto {
  @IsString()
  @IsNotEmpty()
  groupName: string;
}

@ApiTags('Stories')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('stories')
export class StoriesController {
  constructor(
    private readonly storiesService: StoriesService,
    private readonly followsService: FollowsService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a new story (image, video, text, poll)' })
  async create(@Req() req: AuthenticatedRequest, @Body() body: CreateStoryDto) {
    const story = await this.storiesService.createStory(req.user.userId, body);
    return { data: story };
  }

  @Get('feed')
  @ApiOperation({
    summary: 'Get story feed (stories from followed users, grouped by author)',
  })
  async getFeed(@Req() req: AuthenticatedRequest) {
    const ids = await this.followsService.getFollowingIds(req.user.userId);
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
    await this.storiesService.markViewed(id, req.user.userId);
    return { success: true };
  }

  @Post(':id/react')
  @ApiOperation({ summary: 'React to a story with an emoji' })
  async react(
    @Param('id') id: string,
    @Req() req: AuthenticatedRequest,
    @Body() body: StoryReactionDto,
  ) {
    await this.storiesService.reactToStory(id, req.user.userId, body.emoji);
    return { success: true };
  }

  @Post(':id/vote')
  @ApiOperation({ summary: 'Vote on a poll story' })
  async vote(
    @Param('id') id: string,
    @Req() req: AuthenticatedRequest,
    @Body() body: StoryVoteDto,
  ) {
    const story = await this.storiesService.votePoll(
      id,
      req.user.userId,
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
    @Body() body: StoryHighlightDto,
  ) {
    const story = await this.storiesService.saveToHighlight(
      id,
      req.user.userId,
      body.groupName,
    );
    return { data: story };
  }
}
