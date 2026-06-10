import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { User, UserDocument } from '../users/schemas/user.schema';
import {
  Community,
  CommunityDocument,
} from '../communities/schemas/community.schema';

@Injectable()
export class DiscoveryService {
  private readonly logger = new Logger(DiscoveryService.name);

  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    @InjectModel(Community.name)
    private readonly communityModel: Model<CommunityDocument>,
  ) {}

  /**
   * Discover people based on shared interests and skills.
   */
  async discoverPeople(userId: string, limit = 20): Promise<UserDocument[]> {
    const currentUser = await this.userModel
      .findById(userId)
      .select('interests skills');
    if (!currentUser) return [];

    const userInterests = currentUser.interests || [];

    const userSkills = (currentUser as any).skills || [];

    const matchTerms = [...userInterests, ...userSkills];

    if (matchTerms.length === 0) {
      // Fallback: return recently active users
      return this.userModel
        .find({
          _id: { $ne: new Types.ObjectId(userId) },
        })
        .select(
          'username displayName avatar bio headline accountType trustScore',
        )
        .sort({ lastSeen: -1 })
        .limit(limit)
        .exec();
    }

    // Score users by overlap in interests + skills
    return this.userModel.aggregate([
      { $match: { _id: { $ne: new Types.ObjectId(userId) } } },
      {
        $addFields: {
          matchScore: {
            $size: {
              $setIntersection: [
                { $ifNull: [{ $concatArrays: ['$interests', '$skills'] }, []] },
                matchTerms,
              ],
            },
          },
        },
      },
      { $match: { matchScore: { $gt: 0 } } },
      { $sort: { matchScore: -1, trustScore: -1 } },
      { $limit: limit },
      {
        $project: {
          passwordHash: 0,
          refreshTokenHash: 0,
          passwordResetToken: 0,
          passwordResetExpires: 0,
          settings: 0,
          blockedUsers: 0,
        },
      },
    ]);
  }

  /**
   * Discover communities (public, ranked by member count heuristic).
   */
  async discoverCommunities(limit = 20): Promise<CommunityDocument[]> {
    return this.communityModel
      .find({
        'settings.isPrivate': false,
      })
      .sort({ createdAt: -1 })
      .limit(limit)
      .exec();
  }

  /**
   * Trending search — users and communities matching a query.
   */
  async globalSearch(query: string, limit = 20) {
    const regex = new RegExp(query, 'i');

    const [users, communities] = await Promise.all([
      this.userModel
        .find({
          $or: [
            { username: regex },
            { displayName: regex },
            { headline: regex },
          ],
        })
        .select(
          'username displayName avatar bio headline accountType trustScore',
        )
        .limit(limit)
        .exec(),

      this.communityModel
        .find({
          $or: [{ name: regex }, { description: regex }],
          'settings.isPrivate': false,
        })
        .limit(limit)
        .exec(),
    ]);

    return { users, communities };
  }
}
