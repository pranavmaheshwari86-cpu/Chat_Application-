import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  OnModuleInit,
  Logger,
} from '@nestjs/common';
import { InjectModel, InjectConnection } from '@nestjs/mongoose';
import { Model, Types, Connection } from 'mongoose';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Message, MessageDocument } from './schemas/message.schema';
import { SendMessageDto, MessageType } from './dto/send-message.dto';
import { EditMessageDto } from './dto/edit-message.dto';
import { MessageQueryDto } from './dto/message-query.dto';
import {
  buildCursorQuery,
  buildPaginatedResponse,
} from '../../common/utils/pagination.util';
import { APP_CONSTANTS, AI_MODELS } from '../../common/constants/app.constants';
import {
  Conversation,
  ConversationDocument,
} from '../conversations/schemas/conversation.schema';
import * as cheerio from 'cheerio';
import axios from 'axios';
import sanitizeHtml from 'sanitize-html';
import { GoogleGenAI } from '@google/genai';

@Injectable()
export class MessagesService implements OnModuleInit {
  private readonly logger = new Logger(MessagesService.name);

  constructor(
    @InjectModel(Message.name) private messageModel: Model<MessageDocument>,
    @InjectModel(Conversation.name)
    private conversationModel: Model<ConversationDocument>,
    private eventEmitter: EventEmitter2,
    @InjectConnection() private connection: Connection,
  ) {}

  private ai: GoogleGenAI | null = null;
  private readonly maxConcurrentAI = 5;
  private readonly maxQueueSize = 100; // Prevent unbounded queue growth
  private activeAICalls = 0;
  private readonly aiQueue: Array<() => Promise<void>> = [];
  private readonly AI_CALL_TIMEOUT = 30000; // 30s timeout per AI call

  onModuleInit() {
    if (process.env.GEMINI_API_KEY) {
      try {
        this.ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      } catch {
        console.warn('Could not initialize Google Gen AI');
      }
    }
  }

  private async runWithConcurrencyLimit(
    fn: () => Promise<void>,
  ): Promise<void> {
    const executeWithTimeout = async () => {
      this.activeAICalls++;
      try {
        // Race the AI call against a timeout
        await Promise.race([
          fn(),
          new Promise((_, reject) =>
            setTimeout(
              () => reject(new Error('AI call timeout')),
              this.AI_CALL_TIMEOUT,
            ),
          ),
        ]);
      } finally {
        this.activeAICalls--;
        const next = this.aiQueue.shift();
        if (next) {
          next();
        }
      }
    };

    if (this.activeAICalls < this.maxConcurrentAI) {
      await executeWithTimeout();
    } else if (this.aiQueue.length < this.maxQueueSize) {
      return new Promise((resolve, reject) => {
        this.aiQueue.push(async () => {
          try {
            await executeWithTimeout();
            resolve();
          } catch (error) {
            reject(error);
          }
        });
      });
    } else {
      // Queue is full - reject the request
      this.logger.warn('AI queue full - rejecting toxicity check');
      throw new Error('AI queue full - try again later');
    }
  }

  // Run asynchronously after message creation
  async checkToxicity(messageId: string, content: string): Promise<void> {
    if (!this.ai || !content) return;
    return this.runWithConcurrencyLimit(async () => {
      try {
        const response = await this.ai!.models.generateContent({
          model: AI_MODELS.GEMINI_CONTENT,
          contents: `Analyze the following message for toxicity, harassment, hate speech, or severe profanity. Return ONLY the word "TOXIC" if it violates these rules, or "SAFE" if it is acceptable. Do not return anything else.\n\nMessage: "${content}"`,
        });
        const text = response.text?.trim().toUpperCase();
        if (text === 'TOXIC') {
          await this.messageModel.findByIdAndUpdate(messageId, {
            isFlagged: true,
          });
          this.eventEmitter.emit('message.flagged', { messageId });
        }
      } catch (error) {
        console.error('Toxicity check failed', error);
      }
    });
  }

  private readonly BLOCKED_HOSTS = [
    'localhost',
    '127.0.0.1',
    '::1',
    '0.0.0.0',
    '[::1]',
  ];

  private readonly PRIVATE_RANGES = [
    { prefix: [10], mask: 8 },
    { prefix: [172, 16], mask: 12 },
    { prefix: [192, 168], mask: 16 },
    { prefix: [169, 254], mask: 16 },
  ];

  private readonly dnsCache = new Map<
    string,
    { ips: string[]; expires: number }
  >();
  private readonly DNS_CACHE_TTL = 10 * 1000; // 10 seconds - prevent DNS rebinding with short TTL
  private readonly MAX_RESPONSE_SIZE = 1024 * 1024; // 1MB max response

  private isPrivateIp(ip: string): boolean {
    // IPv4
    if (ip.includes('.')) {
      const parts = ip.split('.').map(Number);
      if (
        parts.length === 4 &&
        parts.every((p) => !isNaN(p) && p >= 0 && p <= 255)
      ) {
        for (const range of this.PRIVATE_RANGES) {
          if (range.prefix.every((v, i) => parts[i] === v)) return true;
        }
        // Loopback
        if (parts[0] === 127) return true;
        // Link-local
        if (parts[0] === 169 && parts[1] === 254) return true;
      }
      return false;
    }

    // IPv6
    if (ip.includes(':')) {
      const normalized = ip.toLowerCase();
      // Loopback
      if (normalized === '::1' || normalized === '0:0:0:0:0:0:0:1') return true;
      // IPv4-mapped
      const ipv4Mapped = normalized.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
      if (ipv4Mapped) return this.isPrivateIp(ipv4Mapped[1]);
      // Unique local addresses (fc00::/7)
      if (normalized.startsWith('fc') || normalized.startsWith('fd'))
        return true;
      // Link-local (fe80::/10)
      if (normalized.startsWith('fe80:')) return true;
    }
    return false;
  }

  private async resolveHostname(hostname: string): Promise<string[]> {
    const cached = this.dnsCache.get(hostname);
    if (cached && cached.expires > Date.now()) {
      // Re-validate cached IPs on every use to prevent DNS rebinding
      for (const ip of cached.ips) {
        if (this.isPrivateIp(ip)) {
          this.dnsCache.delete(hostname);
          return [];
        }
      }
      return cached.ips;
    }

    try {
      const { default: dns } = await import('dns/promises');
      const records = await dns.resolve4(hostname);
      const ips = [...new Set(records)];
      // Validate all resolved IPs immediately
      for (const ip of ips) {
        if (this.isPrivateIp(ip)) {
          this.dnsCache.set(hostname, {
            ips: [],
            expires: Date.now() + this.DNS_CACHE_TTL,
          });
          return [];
        }
      }
      this.dnsCache.set(hostname, {
        ips,
        expires: Date.now() + this.DNS_CACHE_TTL,
      });
      return ips;
    } catch {
      this.dnsCache.set(hostname, {
        ips: [],
        expires: Date.now() + this.DNS_CACHE_TTL,
      });
      return [];
    }
  }

  private async isPrivateUrl(urlString: string): Promise<boolean> {
    try {
      const parsed = new URL(urlString);
      let hostname = parsed.hostname.toLowerCase();

      // Block non-http protocols
      if (!['http:', 'https:'].includes(parsed.protocol)) return true;

      // Strip IPv6 brackets
      if (hostname.startsWith('[') && hostname.endsWith(']')) {
        hostname = hostname.slice(1, -1);
      }

      // Block localhost and loopback hostnames
      if (this.BLOCKED_HOSTS.includes(hostname)) return true;

      // Block hostnames without a dot (internal network names)
      if (!hostname.includes('.')) return true;

      // Block IP addresses directly in URL (bypass DNS)
      if (
        /^\d{1,3}(\.\d{1,3}){3}$/.test(hostname) ||
        /^\[?[0-9a-f:]+\]?$/i.test(hostname)
      ) {
        return this.isPrivateIp(hostname.replace('[', '').replace(']', ''));
      }

      // Resolve hostname to IPs and check each (always re-resolve for security, no cache trust)
      const ips = await this.resolveHostname(hostname);
      if (ips.length === 0) return true; // Failed to resolve = unsafe

      // Validate ALL resolved IPs - if ANY is private, block the URL
      for (const ip of ips) {
        if (this.isPrivateIp(ip)) return true;
      }

      return false;
    } catch {
      return true;
    }
  }

  private async fetchWithSsrProtection(
    url: string,
    redirects = 0,
  ): Promise<any> {
    if (redirects > 3) {
      return { url, title: '', description: '', image: '' };
    }

    if (!url) {
      throw new BadRequestException('URL is required');
    }

    try {
      new URL(url);
    } catch {
      throw new BadRequestException('Invalid URL format');
    }

    if (await this.isPrivateUrl(url)) {
      throw new BadRequestException('URL not allowed');
    }

    const response = await axios.get(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
      timeout: 5000,
      maxRedirects: 0,
      validateStatus: (status) =>
        status < 400 || (status >= 300 && status < 400),
      maxContentLength: this.MAX_RESPONSE_SIZE,
      maxBodyLength: this.MAX_RESPONSE_SIZE,
    });

    // Handle redirect manually for SSRF protection
    if (
      response.status >= 300 &&
      response.status < 400 &&
      response.headers.location
    ) {
      const redirectUrl = new URL(response.headers.location, url).toString();
      // Validate redirect target too
      if (await this.isPrivateUrl(redirectUrl)) {
        throw new BadRequestException('Redirect target not allowed');
      }
      return this.fetchWithSsrProtection(redirectUrl, redirects + 1);
    }

    const html = response.data as string;
    const $ = cheerio.load(html);

    const title =
      $('meta[property="og:title"]').attr('content') || $('title').text() || '';
    const description =
      $('meta[property="og:description"]').attr('content') ||
      $('meta[name="description"]').attr('content') ||
      '';
    const image = $('meta[property="og:image"]').attr('content') || '';

    return { url, title, description, image };
  }

  async getLinkPreview(url: string): Promise<any> {
    return this.fetchWithSsrProtection(url);
  }

  async markAsRead(conversationId: string, userId: string) {
    await this.verifyMembership(conversationId, userId);

    const result = await this.messageModel.updateMany(
      {
        conversationId: new Types.ObjectId(conversationId),
        senderId: { $ne: new Types.ObjectId(userId) },
        'readBy.userId': { $ne: new Types.ObjectId(userId) },
      },
      {
        $push: {
          readBy: { userId: new Types.ObjectId(userId), readAt: new Date() },
        },
      },
    );

    // Reset unread count for this user in the conversation
    await this.conversationModel.findByIdAndUpdate(
      conversationId,
      { $set: { 'members.$[elem].unreadCount': 0 } },
      { arrayFilters: [{ 'elem.userId': new Types.ObjectId(userId) }] },
    );

    this.eventEmitter.emit('message.read', {
      conversationId,
      userId,
      readAt: new Date(),
    });

    return { success: true, modifiedCount: result.modifiedCount };
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

    let sanitizedContent = sendDto.content;
    if (sendDto.type === MessageType.TEXT && sanitizedContent) {
      sanitizedContent = sanitizeHtml(sanitizedContent, {
        allowedTags: [], // Strip all HTML tags
        allowedAttributes: {},
      });
    }

    // Use MongoDB transaction for atomic message creation + conversation update
    const session = await this.connection.startSession();
    let savedMessage: any;

    try {
      await session.withTransaction(async () => {
        const message = new this.messageModel({
          conversationId: new Types.ObjectId(conversationId),
          senderId: new Types.ObjectId(userId),
          type: sendDto.type,
          content: sanitizedContent,
          attachments: sendDto.attachments,
          replyTo: replyToObj,
          expiresAt,
          isFlagged: false,
        });

        await message.save({ session });
        savedMessage = message;

        // Update conversation lastMessage and unread counts
        await this.conversationModel.findByIdAndUpdate(
          conversationId,
          {
            $set: {
              lastMessage: {
                _id: message._id,
                content: message.content,
                senderId: message.senderId._id,
                senderName: (
                  message.senderId as unknown as { displayName: string }
                ).displayName,
                type: message.type,
                createdAt:
                  (message as unknown as { createdAt: Date }).createdAt ||
                  new Date(),
              },
            },
            $inc: { 'members.$[elem].unreadCount': 1 },
          },
          {
            arrayFilters: [
              { 'elem.userId': { $ne: new Types.ObjectId(userId) } },
            ],
            session,
          },
        );

        // Populate sender info
        await message.populate('senderId', 'username displayName avatar');
      });

      // Trigger async toxicity check
      if (sendDto.type === MessageType.TEXT && sanitizedContent) {
        void this.checkToxicity(
          savedMessage._id.toString(),
          sanitizedContent,
        ).catch(console.error);
      }

      // Emit event instead of direct gateway call
      this.eventEmitter.emit('message.created', {
        conversationId,
        message: savedMessage,
        conversation,
      });

      return savedMessage;
    } finally {
      await session.endSession();
    }
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

    message.content = sanitizeHtml(editDto.content, {
      allowedTags: [],
      allowedAttributes: {},
    });
    message.isEdited = true;
    message.editedAt = new Date();
    await message.save();

    this.eventEmitter.emit('message.edited', {
      conversationId,
      messageId,
      content: message.content,
      editedAt: message.editedAt,
    });

    return message;
  }

  async reactToMessage(
    messageId: string,
    conversationId: string,
    userId: string,
    emoji: string,
  ) {
    const message = await this.messageModel.findOne({
      _id: messageId,
      conversationId,
      isDeleted: false,
    });

    if (!message) {
      throw new NotFoundException('Message not found');
    }

    // Toggle reaction logic: if it exists, remove it, else add it
    const existingReactionIndex = message.reactions?.findIndex(
      (r) => r.userId.toString() === userId && r.emoji === emoji,
    );

    let updatedMessage;

    if (existingReactionIndex !== undefined && existingReactionIndex > -1) {
      // Remove reaction
      updatedMessage = await this.messageModel.findByIdAndUpdate(
        messageId,
        { $pull: { reactions: { userId: new Types.ObjectId(userId), emoji } } },
        { new: true },
      );
    } else {
      // Add reaction
      updatedMessage = await this.messageModel.findByIdAndUpdate(
        messageId,
        {
          $push: {
            reactions: {
              emoji,
              userId: new Types.ObjectId(userId),
              createdAt: new Date(),
            },
          },
        },
        { new: true },
      );
    }

    this.eventEmitter.emit('message.reacted', {
      conversationId,
      messageId,
      userId,
      emoji,
      action:
        existingReactionIndex !== undefined && existingReactionIndex > -1
          ? 'removed'
          : 'added',
      reactions: updatedMessage?.reactions || [],
    });

    return updatedMessage;
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

    this.eventEmitter.emit('message.deleted', {
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
