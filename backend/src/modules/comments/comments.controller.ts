import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  UseGuards,
  Request,
  Query,
} from '@nestjs/common';
import type { AuthenticatedRequest } from '@chat/shared';
import { CommentsService } from './comments.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@Controller('comments')
@UseGuards(JwtAuthGuard)
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  @Post(':postId')
  create(
    @Request() req: AuthenticatedRequest,
    @Param('postId') postId: string,
    @Body('content') content: string,
  ) {
    return this.commentsService.create(req.user.userId, postId, content);
  }

  @Get(':postId')
  getComments(
    @Param('postId') postId: string,
    @Query('limit') limit?: string,
    @Query('skip') skip?: string,
  ) {
    return this.commentsService.getCommentsByPost(
      postId,
      limit ? parseInt(limit) : 20,
      skip ? parseInt(skip) : 0,
    );
  }
}
