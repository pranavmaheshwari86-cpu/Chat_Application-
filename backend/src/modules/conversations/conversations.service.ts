import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  Conversation,
  ConversationDocument,
} from './schemas/conversation.schema';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { CreateGroupDto } from './dto/create-group.dto';
import { UpdateGroupDto } from './dto/update-group.dto';
import { generateInviteCode } from '../../common/utils/crypto.util';
import { CursorPaginationParams, PaginatedResult } from '@chat/shared';
import {
  buildCursorQuery,
  buildPaginatedResponse,
} from '../../common/utils/pagination.util';
import { APP_CONSTANTS } from '../../common/constants/app.constants';

@Injectable()
export class ConversationsService {
  constructor(
    @InjectModel(Conversation.name)
    private conversationModel: Model<ConversationDocument>,
  ) {}

  async getUserConversations(
    userId: string,
    paginationDto: CursorPaginationParams,
  ): Promise<PaginatedResult<ConversationDocument>> {
    const limit = paginationDto.limit || APP_CONSTANTS.PAGINATION_DEFAULT_LIMIT;
    const baseQuery = {
      'members.userId': new Types.ObjectId(userId),
      'members.isArchived': { $ne: true },
    };

    // Sort by updatedAt descending by default for conversation list

    const filter = buildCursorQuery(paginationDto, baseQuery);

    const conversations = await this.conversationModel
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      .find(filter)
      .sort({ updatedAt: -1, _id: -1 })
      .limit(limit + 1)
      .populate('members.userId', 'username displayName avatar status lastSeen')
      .exec();

    return buildPaginatedResponse(conversations, limit);
  }

  async getConversation(id: string, userId: string) {
    const conversation = await this.conversationModel
      .findById(id)
      .populate('members.userId', 'username displayName avatar status lastSeen')
      .exec();

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    const isMember = conversation.members.some(
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call
      (m) => m.userId._id.toString() === userId,
    );
    if (!isMember) {
      throw new ForbiddenException('You are not a member of this conversation');
    }

    return conversation;
  }

  async createDirectConversation(
    userId: string,
    createConversationDto: CreateConversationDto,
  ) {
    const { participantId } = createConversationDto;

    if (userId === participantId) {
      throw new BadRequestException('Cannot create conversation with yourself');
    }

    // Check if conversation already exists
    const existing = await this.conversationModel
      .findOne({
        type: 'direct',
        $and: [
          { 'members.userId': new Types.ObjectId(userId) },
          { 'members.userId': new Types.ObjectId(participantId) },
        ],
        members: { $size: 2 },
      })
      .populate(
        'members.userId',
        'username displayName avatar status lastSeen',
      );

    if (existing) {
      return existing;
    }

    const conversation = new this.conversationModel({
      type: 'direct',
      members: [
        { userId: new Types.ObjectId(userId), role: 'owner' },
        { userId: new Types.ObjectId(participantId), role: 'member' },
      ],
      createdBy: new Types.ObjectId(userId),
    });

    const saved = await conversation.save();
    return saved.populate(
      'members.userId',
      'username displayName avatar status lastSeen',
    );
  }

  async createGroup(userId: string, createGroupDto: CreateGroupDto) {
    const memberIds = createGroupDto.memberIds || [];

    // Ensure the creator is in the members list
    const uniqueMembers = new Set([userId, ...memberIds]);

    if (uniqueMembers.size > APP_CONSTANTS.MAX_GROUP_MEMBERS) {
      throw new BadRequestException(
        `Group cannot exceed ${APP_CONSTANTS.MAX_GROUP_MEMBERS} members`,
      );
    }

    const members = Array.from(uniqueMembers).map((id) => ({
      userId: new Types.ObjectId(id),
      role: id === userId ? 'owner' : 'member',
    }));

    const conversation = new this.conversationModel({
      type: 'group',
      name: createGroupDto.name,
      description: createGroupDto.description,
      members,
      inviteCode: generateInviteCode(),
      createdBy: new Types.ObjectId(userId),
    });

    return conversation.save();
  }

  async updateGroup(
    id: string,
    userId: string,
    updateGroupDto: UpdateGroupDto,
  ) {
    const conversation = await this.getConversationIfAdmin(id, userId);

    if (updateGroupDto.name) conversation.name = updateGroupDto.name;
    if (updateGroupDto.description)
      conversation.description = updateGroupDto.description;
    if (updateGroupDto.avatar) conversation.avatar = updateGroupDto.avatar;

    if (updateGroupDto.onlyAdminsCanSend !== undefined) {
      conversation.settings.onlyAdminsCanSend =
        updateGroupDto.onlyAdminsCanSend;
    }
    if (updateGroupDto.onlyAdminsCanEdit !== undefined) {
      conversation.settings.onlyAdminsCanEdit =
        updateGroupDto.onlyAdminsCanEdit;
    }

    return conversation.save();
  }

  private async getConversationIfAdmin(id: string, userId: string) {
    const conversation = await this.conversationModel.findById(id);
    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    if (conversation.type !== 'group') {
      throw new BadRequestException('Action only allowed for groups');
    }

    const member = conversation.members.find(
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call
      (m) => m.userId.toString() === userId,
    );
    if (!member) {
      throw new ForbiddenException('You are not a member');
    }

    if (member.role !== 'owner' && member.role !== 'admin') {
      throw new ForbiddenException('Admin privileges required');
    }

    return conversation;
  }
}
