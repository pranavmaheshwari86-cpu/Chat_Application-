import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Community, CommunityDocument } from './schemas/community.schema';
import { Channel, ChannelDocument } from './schemas/channel.schema';
import {
  CommunityMember,
  CommunityMemberDocument,
} from './schemas/community-member.schema';

@Injectable()
export class CommunitiesService {
  private readonly logger = new Logger(CommunitiesService.name);

  constructor(
    @InjectModel(Community.name)
    private readonly communityModel: Model<CommunityDocument>,
    @InjectModel(Channel.name)
    private readonly channelModel: Model<ChannelDocument>,
    @InjectModel(CommunityMember.name)
    private readonly memberModel: Model<CommunityMemberDocument>,
  ) {}

  async createCommunity(userId: string, name: string, description?: string) {
    const ownerId = new Types.ObjectId(userId);

    // Create Community
    const community = await this.communityModel.create({
      name,
      description,
      ownerId,
      roles: [
        {
          name: 'Admin',
          permissions: ['*'],
          color: '#ff0000',
          isDefault: false,
        },
        {
          name: 'Member',
          permissions: ['send_messages', 'read_messages'],
          color: '#ffffff',
          isDefault: true,
        },
      ],
    });

    // Add Owner as Member
    await this.memberModel.create({
      communityId: community._id,
      userId: ownerId,
      joinedAt: new Date(),

      roleIds: [(community.roles[0] as any)._id], // Give Admin role
    });

    // Create General Channel
    const defaultChannel = await this.channelModel.create({
      communityId: community._id,
      name: 'general',
      type: 'text',
    });

    return { community, defaultChannel };
  }

  async getCommunitiesForUser(userId: string) {
    const members = await this.memberModel
      .find({ userId: new Types.ObjectId(userId) })
      .exec();
    const communityIds = members.map((m) => m.communityId);
    return this.communityModel.find({ _id: { $in: communityIds } }).exec();
  }

  async getChannelsForCommunity(communityId: string) {
    return this.channelModel
      .find({ communityId: new Types.ObjectId(communityId) })
      .exec();
  }

  async createChannel(
    communityId: string,
    name: string,
    type: string = 'text',
  ) {
    return this.channelModel.create({
      communityId: new Types.ObjectId(communityId),
      name,
      type,
    });
  }
}
