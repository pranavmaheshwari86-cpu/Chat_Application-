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
import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class CreateCommunityDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;
}

export class CreateChannelDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  type?: string;
}

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
    @Body() body: CreateCommunityDto,
  ) {
    const result = await this.communitiesService.createCommunity(
      req.user.userId,
      body.name,
      body.description,
    );
    return { data: result };
  }

  @Get()
  @ApiOperation({ summary: 'Get user communities' })
  async getCommunities(@Req() req: AuthenticatedRequest) {
    const communities = await this.communitiesService.getCommunitiesForUser(
      req.user.userId,
    );
    return { data: communities };
  }

  @Get(':id/channels')
  @ApiOperation({ summary: 'Get channels for a community' })
  async getChannels(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    const userId = String(req.user.userId || (req.user as any).id || '');
    const channels = await this.communitiesService.getChannelsForCommunity(
      userId,
      id,
    );
    return { data: channels };
  }

  @Post(':id/channels')
  @ApiOperation({ summary: 'Create a new channel' })
  async createChannel(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() body: CreateChannelDto,
  ) {
    const userId = String(req.user.userId || (req.user as any).id || '');
    const channel = await this.communitiesService.createChannel(
      userId,
      id,
      body.name,
      body.type,
    );
    return { data: channel };
  }
}
