import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import type { AuthenticatedRequest } from '@chat/shared';
import { DiscoveryService } from './discovery.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';

@ApiTags('Discovery')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('discovery')
export class DiscoveryController {
  constructor(private readonly discoveryService: DiscoveryService) {}

  @Get('people')
  @ApiOperation({
    summary: 'Discover people based on shared interests and skills',
  })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async discoverPeople(
    @Req() req: AuthenticatedRequest,
    @Query('limit') limit?: number,
  ) {
    const people = await this.discoveryService.discoverPeople(
      req.user.id,
      limit,
    );
    return { data: people };
  }

  @Get('communities')
  @ApiOperation({ summary: 'Discover public communities' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async discoverCommunities(@Query('limit') limit?: number) {
    const communities = await this.discoveryService.discoverCommunities(limit);
    return { data: communities };
  }

  @Get('search')
  @ApiOperation({ summary: 'Global search across users and communities' })
  @ApiQuery({ name: 'q', required: true })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async globalSearch(@Query('q') q: string, @Query('limit') limit?: number) {
    const results = await this.discoveryService.globalSearch(q, limit);
    return { data: results };
  }
}
