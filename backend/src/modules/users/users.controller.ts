import {
  Controller,
  Get,
  Param,
  UseGuards,
  Patch,
  Body,
  Request,
  Query,
} from '@nestjs/common';
import type { AuthenticatedRequest } from '@chat/shared';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { UsersService } from './users.service';
import { UpdateProfileDto } from './dto/update-profile.dto';

@ApiTags('Users')
@ApiBearerAuth()
@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  /**
   * GET /users/me — authenticated user's own full profile.
   * Placed BEFORE the :id route so "me" is not treated as an ObjectId.
   */
  @Get('me')
  @ApiOperation({ summary: 'Get own profile' })
  async getMe(@Request() req: AuthenticatedRequest) {
    return this.usersService.getFullProfile(req.user.userId);
  }

  /**
   * PATCH /users/me — update own profile (new identity fields + legacy fields).
   */
  @Patch('me')
  @ApiOperation({ summary: 'Update own profile' })
  async updateMe(
    @Request() req: AuthenticatedRequest,
    @Body() dto: UpdateProfileDto,
  ) {
    return this.usersService.updateProfile(req.user.userId, dto);
  }

  /**
   * GET /users/search?q=term&limit=20 — text search across users.
   */
  @Get('search')
  @ApiOperation({ summary: 'Search users by username / display name' })
  @ApiQuery({ name: 'q', required: true, description: 'Search query' })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Max results (default 20, max 50)',
  })
  async searchUsers(@Query('q') query: string, @Query('limit') limit?: string) {
    const parsedLimit = limit ? parseInt(limit, 10) : 20;
    return this.usersService.searchUsers(query, parsedLimit);
  }

  /**
   * GET /users/:id — public profile by ID.
   */
  @Get(':id')
  @ApiOperation({ summary: 'Get user profile by ID' })
  async getUserProfile(@Param('id') id: string) {
    return this.usersService.getPublicProfile(id);
  }

  /**
   * PATCH /users/profile — legacy endpoint for backward compat.
   * Delegates to the same service method as PATCH /users/me.
   */
  @Patch('profile')
  @ApiOperation({ summary: 'Update profile (legacy)' })
  async updateProfile(
    @Request() req: AuthenticatedRequest,
    @Body() dto: UpdateProfileDto,
  ) {
    return this.usersService.updateProfile(req.user.userId, dto);
  }
}
