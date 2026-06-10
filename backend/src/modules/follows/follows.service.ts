import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';

import { Model, Types } from 'mongoose';
import { Follow, FollowDocument } from './schemas/follow.schema';
import { User, UserDocument } from '../users/schemas/user.schema';

@Injectable()
export class FollowsService {
  constructor(
    @InjectModel(Follow.name) private followModel: Model<FollowDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
  ) {}

  async followUser(followerId: string, followingId: string) {
    if (followerId === followingId) {
      throw new BadRequestException('You cannot follow yourself');
    }

    const targetUser = await this.userModel.findById(followingId);
    if (!targetUser) throw new BadRequestException('User not found');

    const existingFollow = await this.followModel.findOne({
      follower: followerId as any,

      following: followingId as any,
    });

    if (existingFollow) {
      throw new BadRequestException('Already following this user');
    }

    const status = targetUser.isPrivate ? 'pending' : 'accepted';

    const follow = new this.followModel({
      follower: followerId as any,

      following: followingId as any,
      status,
    });

    await follow.save();

    if (status === 'accepted') {
      await this.userModel.findByIdAndUpdate(followingId, {
        $inc: { followersCount: 1 },
      });
      await this.userModel.findByIdAndUpdate(followerId, {
        $inc: { followingCount: 1 },
      });
    }

    return { success: true, status };
  }

  async unfollowUser(followerId: string, followingId: string) {
    const follow = await this.followModel.findOneAndDelete({
      follower: followerId as any,

      following: followingId as any,
    });

    if (follow && follow.status === 'accepted') {
      await this.userModel.findByIdAndUpdate(followingId, {
        $inc: { followersCount: -1 },
      });
      await this.userModel.findByIdAndUpdate(followerId, {
        $inc: { followingCount: -1 },
      });
    }

    return { success: true };
  }

  async checkFollowStatus(followerId: string, followingId: string) {
    const follow = await this.followModel.findOne({
      follower: followerId as any,

      following: followingId as any,
    });
    return { status: follow ? follow.status : 'none' };
  }
}
