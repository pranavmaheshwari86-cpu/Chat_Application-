import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Comment, CommentDocument } from './schemas/comment.schema';
import { Post, PostDocument } from '../posts/schemas/post.schema';

@Injectable()
export class CommentsService {
  constructor(
    @InjectModel(Comment.name) private commentModel: Model<CommentDocument>,
    @InjectModel(Post.name) private postModel: Model<PostDocument>,
  ) {}

  async create(userId: string, postId: string, content: string) {
    const post = await this.postModel.findById(postId);
    if (!post) throw new NotFoundException('Post not found');

    const comment = new this.commentModel({
      author: new Types.ObjectId(userId),

      post: postId as any,
      content,
    });

    await comment.save();
    await this.postModel.findByIdAndUpdate(postId, {
      $inc: { commentsCount: 1 },
    });

    return comment.populate('author', 'username displayName avatar');
  }

  async getCommentsByPost(postId: string, limit = 20, skip = 0) {
    return this.commentModel

      .find({ post: postId as any })
      .sort({ createdAt: 1 }) // Chronological
      .skip(skip)
      .limit(limit)
      .populate('author', 'username displayName avatar');
  }
}
