import {
  Controller,
  Post,
  Delete,
  Get,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import type { AuthenticatedRequest } from '@chat/shared';
import { FollowsService } from './follows.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@Controller('follows')
@UseGuards(JwtAuthGuard)
export class FollowsController {
  constructor(private readonly followsService: FollowsService) {}

  @Post(':id')
  follow(@Request() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.followsService.followUser(req.user.userId, id);
  }

  @Delete(':id')
  unfollow(@Request() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.followsService.unfollowUser(req.user.userId, id);
  }

  @Get('status/:id')
  checkStatus(@Request() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.followsService.checkFollowStatus(req.user.userId, id);
  }
}
