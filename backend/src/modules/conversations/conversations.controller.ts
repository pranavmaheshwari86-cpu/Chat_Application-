import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Query,
} from '@nestjs/common';
import type { AuthUser } from '@chat/shared';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ConversationsService } from './conversations.service';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { CreateGroupDto } from './dto/create-group.dto';
import { UpdateGroupDto } from './dto/update-group.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Conversations')
@ApiBearerAuth()
@Controller('conversations')
export class ConversationsController {
  constructor(private readonly conversationsService: ConversationsService) {}

  @Get()
  @ApiOperation({ summary: 'Get user conversations (paginated)' })
  getUserConversations(
    @CurrentUser() user: AuthUser,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: number,
  ) {
    return this.conversationsService.getUserConversations(user.userId, {
      cursor,
      limit,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get conversation details' })
  getConversation(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.conversationsService.getConversation(id, user.userId);
  }

  @Post()
  @ApiOperation({ summary: 'Create direct conversation' })
  createDirectConversation(
    @CurrentUser() user: AuthUser,
    @Body() createConversationDto: CreateConversationDto,
  ) {
    return this.conversationsService.createDirectConversation(
      user.userId,
      createConversationDto,
    );
  }

  @Post('group')
  @ApiOperation({ summary: 'Create group conversation' })
  createGroup(
    @CurrentUser() user: AuthUser,
    @Body() createGroupDto: CreateGroupDto,
  ) {
    return this.conversationsService.createGroup(user.userId, createGroupDto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update group settings (admins only)' })
  updateGroup(
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
    @Body() updateGroupDto: UpdateGroupDto,
  ) {
    return this.conversationsService.updateGroup(
      id,
      user.userId,
      updateGroupDto,
    );
  }
}
