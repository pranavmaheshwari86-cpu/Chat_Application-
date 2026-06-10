import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Message, MessageDocument } from '../messages/schemas/message.schema';
import { User, UserDocument } from '../users/schemas/user.schema';
import {
  Community,
  CommunityDocument,
} from '../communities/schemas/community.schema';
import {
  KnowledgeDocument,
  KnowledgeDocumentDoc,
} from '../knowledge/schemas/knowledge-document.schema';

@Injectable()
export class SearchService {
  private readonly logger = new Logger(SearchService.name);

  constructor(
    @InjectModel(Message.name) private messageModel: Model<MessageDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Community.name)
    private communityModel: Model<CommunityDocument>,
    @InjectModel(KnowledgeDocument.name)
    private knowledgeModel: Model<KnowledgeDocumentDoc>,
  ) {}

  /**
   * Unified search across all entity types.
   */
  async unifiedSearch(
    query: string,
    userId: string,
    options?: {
      types?: string[]; // 'messages' | 'users' | 'communities' | 'knowledge'
      conversationId?: string;
      communityId?: string;
      limit?: number;
    },
  ) {
    const limit = options?.limit || 20;
    const types = options?.types || [
      'messages',
      'users',
      'communities',
      'knowledge',
    ];

    const results: Record<string, any[]> = {};

    const promises: Promise<void>[] = [];

    if (types.includes('messages')) {
      promises.push(
        this.searchMessages(query, options?.conversationId, limit).then(
          (data) => {
            results.messages = data;
          },
        ),
      );
    }

    if (types.includes('users')) {
      promises.push(
        this.searchUsers(query, userId, limit).then((data) => {
          results.users = data;
        }),
      );
    }

    if (types.includes('communities')) {
      promises.push(
        this.searchCommunities(query, limit).then((data) => {
          results.communities = data;
        }),
      );
    }

    if (types.includes('knowledge')) {
      promises.push(
        this.searchKnowledge(query, userId, options?.communityId, limit).then(
          (data) => {
            results.knowledge = data;
          },
        ),
      );
    }

    await Promise.allSettled(promises);

    return results;
  }

  async searchMessages(query: string, conversationId?: string, limit = 20) {
    const searchFilter: any = {
      $text: { $search: query },
      isDeleted: false,
    };

    if (conversationId) {
      searchFilter.conversationId = conversationId;
    }

    const messages = await this.messageModel
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      .find(searchFilter, { score: { $meta: 'textScore' } })
      .sort({ score: { $meta: 'textScore' } })
      .limit(limit)
      .populate('senderId', 'username displayName avatar')
      .exec();

    return messages;
  }

  async searchUsers(query: string, currentUserId?: string, limit = 20) {
    const regex = new RegExp(query, 'i');

    const filter: any = {
      $or: [{ username: regex }, { displayName: regex }, { headline: regex }],
    };

    if (currentUserId) {
      filter._id = { $ne: new Types.ObjectId(currentUserId) };
    }

    const users = await this.userModel
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      .find(filter)
      .select(
        'username displayName avatar status isVerified headline accountType trustScore',
      )
      .limit(limit)
      .exec();

    return users;
  }

  async searchCommunities(query: string, limit = 20) {
    const regex = new RegExp(query, 'i');

    return this.communityModel
      .find({
        $or: [{ name: regex }, { description: regex }],
        'settings.isPrivate': false,
      })
      .limit(limit)
      .exec();
  }

  async searchKnowledge(
    query: string,
    userId: string,
    communityId?: string,
    limit = 20,
  ) {
    const filter: any = {
      $text: { $search: query },
      $or: [
        { authorId: new Types.ObjectId(userId) },
        { isPublic: true },
        { collaboratorIds: new Types.ObjectId(userId) },
      ],
    };

    if (communityId) {
      filter.communityId = new Types.ObjectId(communityId);
    }

    return (
      this.knowledgeModel
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        .find(filter, { score: { $meta: 'textScore' } })
        .sort({ score: { $meta: 'textScore' } })
        .select(
          'title type scope tags category status viewCount createdAt updatedAt',
        )
        .limit(limit)
        .exec()
    );
  }
}
