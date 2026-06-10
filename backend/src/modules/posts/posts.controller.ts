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
import { PostsService } from './posts.service';
import { CreatePostDto } from './dto/create-post.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@Controller('posts')
@UseGuards(JwtAuthGuard)
export class PostsController {
  constructor(private readonly postsService: PostsService) {}

  @Post()
  create(
    @Request() req: AuthenticatedRequest,
    @Body() createPostDto: CreatePostDto,
  ) {
    return this.postsService.create(req.user.userId, createPostDto);
  }

  @Get('user/:userId')
  getUserPosts(
    @Param('userId') userId: string,
    @Query('limit') limit?: string,
    @Query('skip') skip?: string,
  ) {
    return this.postsService.getUserPosts(
      userId,
      limit ? parseInt(limit) : 12,
      skip ? parseInt(skip) : 0,
    );
  }

  @Get(':id')
  getPostById(@Param('id') id: string) {
    return this.postsService.getPostById(id);
  }

  @Post(':id/like')
  likePost(@Request() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.postsService.likePost(req.user.userId, id);
  }

  @Post(':id/unlike')
  unlikePost(@Request() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.postsService.unlikePost(req.user.userId, id);
  }
}
