import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { User } from '../../users/schemas/user.schema';

export type FollowDocument = Follow & Document;

@Schema({ timestamps: true })
export class Follow {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  follower: User;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  following: User;

  @Prop({ type: String, enum: ['pending', 'accepted'], default: 'accepted' })
  status: string;
}

export const FollowSchema = SchemaFactory.createForClass(Follow);
FollowSchema.index({ follower: 1, following: 1 }, { unique: true });
FollowSchema.index({ following: 1, status: 1 });
