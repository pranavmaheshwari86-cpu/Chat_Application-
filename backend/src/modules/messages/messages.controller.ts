import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  BadRequestException,
} from '@nestjs/common';
import type { AuthUser } from '@chat/shared';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { MessagesService } from './messages.service';
import { SendMessageDto } from './dto/send-message.dto';
import { EditMessageDto } from './dto/edit-message.dto';
import { MessageQueryDto } from './dto/message-query.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Messages')
@ApiBearerAuth()
@Controller('messages')
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  @Get('preview/link')
  @ApiOperation({ summary: 'Get link preview metadata' })
  getLinkPreview(@Query('url') url: string) {
    return this.messagesService.getLinkPreview(url);
  }

  @Get(':conversationId')
  @ApiOperation({ summary: 'Get messages for a conversation' })
  getMessages(
    @Param('conversationId') conversationId: string,
    @CurrentUser() user: AuthUser,
    @Query() query: MessageQueryDto,
  ) {
    return this.messagesService.getMessages(conversationId, user.userId, query);
  }

  @Post(':conversationId/read')
  @ApiOperation({ summary: 'Mark all messages in conversation as read' })
  markAsRead(
    @Param('conversationId') conversationId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.messagesService.markAsRead(conversationId, user.userId);
  }

  @Post(':conversationId')
  @ApiOperation({ summary: 'Send a message (REST fallback)' })
  sendMessage(
    @Param('conversationId') conversationId: string,
    @CurrentUser() user: AuthUser,
    @Body() sendMessageDto: SendMessageDto,
  ) {
    return this.messagesService.sendMessage(
      conversationId,
      user.userId,
      sendMessageDto,
    );
  }

  @Patch(':conversationId/:messageId')
  @ApiOperation({ summary: 'Edit a message' })
  editMessage(
    @Param('conversationId') conversationId: string,
    @Param('messageId') messageId: string,
    @CurrentUser() user: AuthUser,
    @Body() editMessageDto: EditMessageDto,
  ) {
    return this.messagesService.editMessage(
      messageId,
      conversationId,
      user.userId,
      editMessageDto,
    );
  }

  @Post(':conversationId/:messageId/react')
  @ApiOperation({ summary: 'React to a message' })
  reactToMessage(
    @Param('conversationId') conversationId: string,
    @Param('messageId') messageId: string,
    @CurrentUser() user: AuthUser,
    @Body('emoji') emoji: string,
  ) {
    if (!emoji) throw new BadRequestException('Emoji is required');
    return this.messagesService.reactToMessage(
      messageId,
      conversationId,
      user.userId,
      emoji,
    );
  }

  @Delete(':conversationId/:messageId')
  @ApiOperation({ summary: 'Delete a message' })
  deleteMessage(
    @Param('conversationId') conversationId: string,
    @Param('messageId') messageId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.messagesService.deleteMessage(
      messageId,
      conversationId,
      user.userId,
    );
  }
}
