import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import type { AuthenticatedRequest } from '@chat/shared';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { SearchService } from './search.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@ApiTags('Search')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get()
  @ApiOperation({
    summary:
      'Unified search across messages, users, communities, and knowledge',
  })
  @ApiQuery({ name: 'q', required: true })
  @ApiQuery({
    name: 'types',
    required: false,
    description: 'Comma-separated: messages,users,communities,knowledge',
  })
  @ApiQuery({ name: 'conversationId', required: false })
  @ApiQuery({ name: 'communityId', required: false })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async unifiedSearch(
    @Req() req: AuthenticatedRequest,
    @Query('q') q: string,
    @Query('types') types?: string,
    @Query('conversationId') conversationId?: string,
    @Query('communityId') communityId?: string,
    @Query('limit') limit?: number,
  ) {
    const results = await this.searchService.unifiedSearch(q, req.user.userId, {
      types: types ? types.split(',').map((t) => t.trim()) : undefined,
      conversationId,
      communityId,
      limit: limit ? Number(limit) : 20,
    });
    return results;
  }

  @Get('messages')
  @ApiOperation({ summary: 'Search messages' })
  @ApiQuery({ name: 'q', required: true })
  @ApiQuery({ name: 'conversationId', required: false })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async searchMessages(
    @Query('q') query: string,
    @Query('conversationId') conversationId?: string,
    @Query('limit') limit?: number,
  ) {
    const data = await this.searchService.searchMessages(
      query,
      conversationId,
      limit ? Number(limit) : 20,
    );
    return data;
  }

  @Get('users')
  @ApiOperation({ summary: 'Search users' })
  @ApiQuery({ name: 'q', required: true })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async searchUsers(
    @Req() req: AuthenticatedRequest,
    @Query('q') query: string,
    @Query('limit') limit?: number,
  ) {
    const data = await this.searchService.searchUsers(
      query,
      req.user.userId,
      limit ? Number(limit) : 20,
    );
    return data;
  }

  @Get('communities')
  @ApiOperation({ summary: 'Search public communities' })
  @ApiQuery({ name: 'q', required: true })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async searchCommunities(
    @Query('q') query: string,
    @Query('limit') limit?: number,
  ) {
    const data = await this.searchService.searchCommunities(
      query,
      limit ? Number(limit) : 20,
    );
    return data;
  }

  @Get('knowledge')
  @ApiOperation({ summary: 'Search knowledge documents' })
  @ApiQuery({ name: 'q', required: true })
  @ApiQuery({ name: 'communityId', required: false })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async searchKnowledge(
    @Req() req: AuthenticatedRequest,
    @Query('q') query: string,
    @Query('communityId') communityId?: string,
    @Query('limit') limit?: number,
  ) {
    const data = await this.searchService.searchKnowledge(
      query,
      req.user.userId,
      communityId,
      limit ? Number(limit) : 20,
    );
    return data;
  }
}
