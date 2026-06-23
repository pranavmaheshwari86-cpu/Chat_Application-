import { Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import type { AuthenticatedRequest } from '@chat/shared';
import { RelationshipsService } from './relationships.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('Relationships')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('relationships')
export class RelationshipsController {
  constructor(private readonly relationshipsService: RelationshipsService) {}

  @Get()
  @ApiOperation({
    summary: 'Get all relationships sorted by relationship score and priority',
  })
  async getRelationships(@Req() req: AuthenticatedRequest) {
    const relationships = await this.relationshipsService.getRelationships(
      req.user.userId,
    );
    return { data: relationships };
  }

  @Post('drift-detect')
  @ApiOperation({
    summary: 'Trigger relationship drift detection (Admin/System only)',
  })
  async triggerDriftDetection() {
    await this.relationshipsService.detectDrift();
    return { message: 'Drift detection completed' };
  }
}
