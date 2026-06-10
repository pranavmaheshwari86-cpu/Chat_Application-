import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  OnModuleInit,
} from '@nestjs/common';
import { InjectModel, InjectConnection } from '@nestjs/mongoose';
import { Model, Types, Connection } from 'mongoose';
import { Message, MessageDocument } from './schemas/message.schema';
import { SendMessageDto, MessageType } from './dto/send-message.dto';
import { EditMessageDto } from './dto/edit-message.dto';
import { MessageQueryDto } from './dto/message-query.dto';
import {
  buildCursorQuery,
  buildPaginatedResponse,
} from '../../common/utils/pagination.util';
import { APP_CONSTANTS } from '../../common/constants/app.constants';
import {
  Conversation,
  ConversationDocument,
} from '../conversations/schemas/conversation.schema';
import { ChatGateway } from '../../gateway/chat.gateway';
import { ServerEvents } from '../../common/constants/socket-events';
import * as cheerio from 'cheerio';
import axios from 'axios';
import { GoogleGenAI } from '@google/genai';

@Injectable()
export class MessagesService implements OnModuleInit {
  constructor(
    @InjectModel(Message.name) private messageModel: Model<MessageDocument>,
    @InjectModel(Conversation.name)
    private conversationModel: Model<ConversationDocument>,
    private chatGateway: ChatGateway,
    @InjectConnection() private connection: Connection,
  ) {}

  private ai: GoogleGenAI | null = null;

  // Wire this service into ChatGateway to resolve circular dependency
  onModuleInit() {
    this.chatGateway.setMessagesService(this);
    if (process.env.GEMINI_API_KEY) {
      try {
        this.ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      } catch (e) {
        console.warn('Could not initialize Google Gen AI');
      }
    }
  }

  private async checkToxicity(content: string): Promise<boolean> {
    if (!this.ai || !content) return false;
    try {
      const response = await this.ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `Analyze the following message for toxicity, harassment, hate speech, or severe profanity. Return ONLY the word "TOXIC" if it violates these rules, or "SAFE" if it is acceptable. Do not return anything else.\n\nMessage: "${content}"`,
      });
      const text = response.text?.trim().toUpperCase();
      return text === 'TOXIC';
    } catch (error) {
      console.error('Toxicity check failed', error);
      return false;
    }
  }

  async getLinkPreview(url: string) {
    if (!url) {
      throw new BadRequestException('URL is required');
    }

    try {
      new URL(url); // Validate URL

      const response = await axios.get(url, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        },
        timeout: 5000,
      });

      const html = response.data as string;
      const $ = cheerio.load(html);

      const title =
        $('meta[property="og:title"]').attr('content') ||
        $('title').text() ||
        '';
      const description =
        $('meta[property="og:description"]').attr('content') ||
        $('meta[name="description"]').attr('content') ||
        '';
      const image = $('meta[property="og:image"]').attr('content') || '';

      return {
        url,
        title,
        description,
        image,
      };
    } catch (error) {
      // Gracefully fail so it doesn't break chat if a link is invalid/down
      return { url, title: '', description: '', image: '' };
    }
  }

  async getMessages(
    conversationId: string,
    userId: string,
    queryDto: MessageQueryDto,
  ) {
    await this.verifyMembership(conversationId, userId);

    const limit = queryDto.limit
      ? parseInt(queryDto.limit, 10)
      : APP_CONSTANTS.PAGINATION_DEFAULT_LIMIT;
    const baseQuery = { conversationId: new Types.ObjectId(conversationId) };

    // Convert direction and cursor

    const filter = buildCursorQuery(
      { cursor: queryDto.cursor, limit, direction: queryDto.direction },
      baseQuery,
    );

    const messages = await this.messageModel
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      .find(filter)
      .sort({ createdAt: -1 })
      .limit(limit + 1)
      .populate('senderId', 'username displayName avatar')
      .exec();

    // Messages are fetched in descending order (newest first).
    // Usually for a chat UI we want them that way for the virtual list, or reversed.
    return buildPaginatedResponse(messages, limit);
  }

  async sendMessage(
    conversationId: string,
    userId: string,
    sendDto: SendMessageDto,
  ) {
    const conversation = await this.verifyMembership(conversationId, userId);

    // If there's a reply, verify it exists
    let replyToObj = undefined;
    if (sendDto.replyToId) {
      const parentMsg = await this.messageModel
        .findById(sendDto.replyToId)
        .populate('senderId', 'displayName')
        .exec();
      if (parentMsg) {
        replyToObj = {
          _id: parentMsg._id,
          content: parentMsg.content,
          senderId: parentMsg.senderId._id,

          senderName: (parentMsg.senderId as unknown as { displayName: string })
            .displayName,
          type: parentMsg.type,
        };
      }
    }

    let expiresAt: Date | undefined;
    if (sendDto.expiresIn) {
      expiresAt = new Date();
      expiresAt.setSeconds(expiresAt.getSeconds() + sendDto.expiresIn);
    }

    let isFlagged = false;
    if (sendDto.type === MessageType.TEXT && sendDto.content) {
      isFlagged = await this.checkToxicity(sendDto.content);
    }

    const message = new this.messageModel({
      conversationId: new Types.ObjectId(conversationId),
      senderId: new Types.ObjectId(userId),
      type: sendDto.type,
      content: sendDto.content,
      attachments: sendDto.attachments,
      replyTo: replyToObj,
      expiresAt,
      isFlagged,
    });

    await message.save();

    // Update conversation lastMessage
    await this.conversationModel.findByIdAndUpdate(conversationId, {
      $set: {
        lastMessage: {
          _id: message._id,
          content: message.content,
          senderId: message.senderId._id,

          senderName: (message.senderId as unknown as { displayName: string })
            .displayName,
          type: message.type,

          createdAt:
            (message as unknown as { createdAt: Date }).createdAt || new Date(),
        },
      },
    });

    // Populate sender info before emitting (after transaction commits to ensure visibility)
    await message.populate('senderId', 'username displayName avatar');

    // Emit to conversation room for users currently viewing this conversation
    this.chatGateway.server
      .to(`conversation:${conversationId}`)
      .emit(ServerEvents.MESSAGE_NEW, {
        conversationId,
        message,
      });

    // Also emit to members' personal rooms who are NOT in the conversation room,
    // so they get sidebar/notification updates
    conversation.members.forEach((member) => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call
      const memberRoom = `user:${member.userId.toString()}`;
      this.chatGateway.server
        .to(memberRoom)
        .except(`conversation:${conversationId}`)
        .emit(ServerEvents.MESSAGE_NEW, {
          conversationId,
          message,
        });
    });

    return message;
  }

  async editMessage(
    messageId: string,
    conversationId: string,
    userId: string,
    editDto: EditMessageDto,
  ) {
    const message = await this.messageModel.findById(messageId);
    if (!message) throw new NotFoundException('Message not found');

    if (message.senderId.toString() !== userId) {
      throw new ForbiddenException('Can only edit your own messages');
    }

    if (message.type !== 'text') {
      throw new BadRequestException('Can only edit text messages');
    }

    message.content = editDto.content;
    message.isEdited = true;
    message.editedAt = new Date();
    await message.save();

    this.chatGateway.server
      .to(`conversation:${conversationId}`)
      .emit(ServerEvents.MESSAGE_EDITED, {
        conversationId,
        messageId,
        content: editDto.content,
        editedAt: message.editedAt,
      });

    return message;
  }

  async deleteMessage(
    messageId: string,
    conversationId: string,
    userId: string,
  ) {
    const message = await this.messageModel.findById(messageId);
    if (!message) throw new NotFoundException('Message not found');

    // Here you might check if user is admin of group too
    if (message.senderId.toString() !== userId) {
      throw new ForbiddenException('Can only delete your own messages');
    }

    message.isDeleted = true;
    message.deletedAt = new Date();
    message.content = 'This message was deleted';
    message.attachments = [];
    await message.save();

    this.chatGateway.server
      .to(`conversation:${conversationId}`)
      .emit(ServerEvents.MESSAGE_DELETED, {
        conversationId,
        messageId,
      });

    return { success: true };
  }

  private async verifyMembership(conversationId: string, userId: string) {
    const conversation = await this.conversationModel.findById(conversationId);
    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    const isMember = conversation.members.some(
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call
      (m) => m.userId.toString() === userId,
    );
    if (!isMember) {
      throw new ForbiddenException('You are not a member of this conversation');
    }

    return conversation;
  }
}
