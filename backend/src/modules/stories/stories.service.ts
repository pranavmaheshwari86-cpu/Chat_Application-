import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Story, StoryDocument } from './schemas/story.schema';

@Injectable()
export class StoriesService {
  private readonly logger = new Logger(StoriesService.name);

  constructor(
    @InjectModel(Story.name) private readonly storyModel: Model<StoryDocument>,
  ) {}

  async createStory(
    authorId: string,
    data: {
      type: string;
      mediaUrl?: string;
      thumbnailUrl?: string;
      text?: string;
      backgroundColor?: string;
      fontStyle?: string;
      visibility?: string;
      allowedUserIds?: string[];
      pollOptions?: Array<{ text: string }>;
      communityId?: string;
    },
  ): Promise<StoryDocument> {
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours from now

    const story = await this.storyModel.create({
      authorId: new Types.ObjectId(authorId),
      type: data.type,
      mediaUrl: data.mediaUrl,
      thumbnailUrl: data.thumbnailUrl,
      text: data.text,
      backgroundColor: data.backgroundColor,
      fontStyle: data.fontStyle,
      visibility: data.visibility || 'everyone',
      allowedUserIds:
        data.allowedUserIds?.map((id) => new Types.ObjectId(id)) || [],
      pollOptions:
        data.pollOptions?.map((opt) => ({
          text: opt.text,
          votes: 0,
          voterIds: [],
        })) || [],
      communityId: data.communityId
        ? new Types.ObjectId(data.communityId)
        : undefined,
      expiresAt,
    });

    return story;
  }

  /**
   * Get active stories for a specific user.
   */
  async getUserStories(userId: string): Promise<StoryDocument[]> {
    return this.storyModel
      .find({
        authorId: new Types.ObjectId(userId),
        expiresAt: { $gt: new Date() },
      })
      .sort({ createdAt: -1 })
      .exec();
  }

  /**
   * Get feed of active stories from users the viewer follows.
   * Caller passes the list of followed user IDs.
   */
  async getStoryFeed(followedUserIds: string[]): Promise<any[]> {
    const objectIds = followedUserIds.map((id) => new Types.ObjectId(id));

    // Group stories by author
    const stories = await this.storyModel.aggregate([
      {
        $match: {
          authorId: { $in: objectIds },
          expiresAt: { $gt: new Date() },
        },
      },
      { $sort: { createdAt: -1 } },
      {
        $group: {
          _id: '$authorId',
          stories: { $push: '$$ROOT' },
          latestAt: { $first: '$createdAt' },
        },
      },
      { $sort: { latestAt: -1 } },
    ]);

    return stories;
  }

  /**
   * Mark a story as viewed.
   */
  async markViewed(storyId: string, viewerId: string) {
    await this.storyModel.updateOne(
      { _id: new Types.ObjectId(storyId) },
      {
        $addToSet: { viewerIds: new Types.ObjectId(viewerId) },
        $inc: { viewCount: 1 },
      },
    );
  }

  /**
   * React to a story.
   */
  async reactToStory(storyId: string, userId: string, emoji: string) {
    await this.storyModel.updateOne(
      { _id: new Types.ObjectId(storyId) },
      {
        $push: {
          reactions: {
            userId: new Types.ObjectId(userId),
            emoji,
            createdAt: new Date(),
          },
        },
      },
    );
  }

  /**
   * Vote on a poll option.
   */
  async votePoll(storyId: string, userId: string, optionIndex: number) {
    const story = await this.storyModel.findById(storyId);
    if (!story) throw new NotFoundException('Story not found');
    if (story.type !== 'poll')
      throw new ForbiddenException('This story is not a poll');
    if (!story.pollOptions || optionIndex >= story.pollOptions.length) {
      throw new NotFoundException('Poll option not found');
    }

    // Check if already voted
    const alreadyVoted = story.pollOptions.some((opt) =>
      opt.voterIds.some((id) => id.toString() === userId),
    );
    if (alreadyVoted) throw new ForbiddenException('Already voted');

    story.pollOptions[optionIndex].votes += 1;
    story.pollOptions[optionIndex].voterIds.push(new Types.ObjectId(userId));
    await story.save();
    return story;
  }

  /**
   * Convert a story to a highlight (persists past expiry).
   */
  async saveToHighlight(storyId: string, userId: string, groupName: string) {
    const story = await this.storyModel.findById(storyId);
    if (!story) throw new NotFoundException('Story not found');
    if (story.authorId.toString() !== userId)
      throw new ForbiddenException('Not your story');

    story.isHighlight = true;
    story.highlightGroupName = groupName;
    // Remove TTL by pushing expiry far into the future
    story.expiresAt = new Date('2099-12-31');
    await story.save();
    return story;
  }

  /**
   * Get highlights for a user.
   */
  async getHighlights(userId: string): Promise<StoryDocument[]> {
    return this.storyModel
      .find({
        authorId: new Types.ObjectId(userId),
        isHighlight: true,
      })
      .sort({ highlightGroupName: 1, createdAt: -1 })
      .exec();
  }
}
