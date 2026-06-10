import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { AuthenticatedRequest } from '@chat/shared';
import { CommunitiesService } from './communities.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('Communities')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('communities')
export class CommunitiesController {
  constructor(private readonly communitiesService: CommunitiesService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new community' })
  async createCommunity(
    @Req() req: AuthenticatedRequest,
    @Body() body: { name: string; description?: string },
  ) {
    const result = await this.communitiesService.createCommunity(
      req.user.id,
      body.name,
      body.description,
    );
    return { data: result };
  }

  @Get()
  @ApiOperation({ summary: 'Get user communities' })
  async getCommunities(@Req() req: AuthenticatedRequest) {
    const communities = await this.communitiesService.getCommunitiesForUser(
      req.user.id,
    );
    return { data: communities };
  }

  @Get(':id/channels')
  @ApiOperation({ summary: 'Get channels for a community' })
  async getChannels(@Param('id') id: string) {
    const channels = await this.communitiesService.getChannelsForCommunity(id);
    return { data: channels };
  }

  @Post(':id/channels')
  @ApiOperation({ summary: 'Create a new channel' })
  async createChannel(
    @Param('id') id: string,
    @Body() body: { name: string; type?: string },
  ) {
    const channel = await this.communitiesService.createChannel(
      id,
      body.name,
      body.type,
    );
    return { data: channel };
  }
}
