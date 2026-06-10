import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Post, PostDocument } from './schemas/post.schema';
import { User, UserDocument } from '../users/schemas/user.schema';
import { CreatePostDto } from './dto/create-post.dto';

@Injectable()
export class PostsService {
  constructor(
    @InjectModel(Post.name) private postModel: Model<PostDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
  ) {}

  async create(userId: string, createPostDto: CreatePostDto) {
    const post = new this.postModel({
      ...createPostDto,
      author: userId,
    });

    const savedPost = await post.save();
    return savedPost.populate('author', 'username displayName avatar');
  }

  async getUserPosts(userId: string, limit = 12, skip = 0) {
    return this.postModel

      .find({ author: userId as any })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('author', 'username displayName avatar');
  }

  async getPostById(postId: string) {
    const post = await this.postModel
      .findById(postId)
      .populate('author', 'username displayName avatar');

    if (!post) {
      throw new NotFoundException('Post not found');
    }
    return post;
  }

  async likePost(userId: string, postId: string) {
    const post = await this.postModel.findById(postId);
    if (!post) throw new NotFoundException('Post not found');

    if (!post.likes.includes(new Types.ObjectId(userId))) {
      post.likes.push(new Types.ObjectId(userId));
      post.likesCount += 1;
      await post.save();
    }
    return { success: true, likesCount: post.likesCount };
  }

  async unlikePost(userId: string, postId: string) {
    const post = await this.postModel.findById(postId);
    if (!post) throw new NotFoundException('Post not found');

    const index = post.likes.indexOf(new Types.ObjectId(userId));
    if (index > -1) {
      post.likes.splice(index, 1);
      post.likesCount = Math.max(0, post.likesCount - 1);
      await post.save();
    }
    return { success: true, likesCount: post.likesCount };
  }
}
