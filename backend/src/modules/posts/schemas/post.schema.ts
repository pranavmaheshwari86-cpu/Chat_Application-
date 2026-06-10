import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { User } from '../../users/schemas/user.schema';

export type PostDocument = Post & Document;

@Schema({ timestamps: true })
export class Post {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  author: User;

  @Prop({ maxlength: 2200 })
  caption?: string;

  @Prop({ type: [String], required: true })
  images: string[];

  @Prop({ default: 0 })
  likesCount: number;

  @Prop({ default: 0 })
  commentsCount: number;

  @Prop({ type: [{ type: Types.ObjectId, ref: 'User' }], default: [] })
  likes: Types.ObjectId[];
}

export const PostSchema = SchemaFactory.createForClass(Post);
PostSchema.index({ author: 1, createdAt: -1 });
