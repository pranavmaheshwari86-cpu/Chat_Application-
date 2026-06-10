import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Post, PostDocument } from '../posts/schemas/post.schema';
import { Follow, FollowDocument } from '../follows/schemas/follow.schema';

@Injectable()
export class FeedService {
  constructor(
    @InjectModel(Post.name) private postModel: Model<PostDocument>,
    @InjectModel(Follow.name) private followModel: Model<FollowDocument>,
  ) {}

  async getFeed(userId: string, limit = 10, skip = 0) {
    // 1. Get list of user IDs that this user follows
    const follows = await this.followModel.find({
      follower: userId as any,
      status: 'accepted',
    });

    const followingIds = follows.map((f) => f.following);
    // Include own posts in feed
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    followingIds.push(new Types.ObjectId(userId) as any);

    // 2. Fetch posts from those users
    const posts = await this.postModel
      .find({ author: { $in: followingIds } })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('author', 'username displayName avatar');

    return posts;
  }
}
