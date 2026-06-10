import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import type { AuthenticatedRequest } from '@chat/shared';
import { MemoryService } from './memory.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';

@ApiTags('Memory')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('memory')
export class MemoryController {
  constructor(private readonly memoryService: MemoryService) {}

  @Get('search')
  @ApiOperation({
    summary: 'Semantic search over memories and extracted knowledge',
  })
  @ApiQuery({ name: 'q', required: true, description: 'Search query' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async searchMemories(
    @Query('q') query: string,
    @Query('limit') limit: number = 10,
    @Req() req: AuthenticatedRequest,
  ) {
    const memories = await this.memoryService.semanticSearch(
      query,
      req.user.id,
      limit,
    );
    return { data: memories };
  }
}
