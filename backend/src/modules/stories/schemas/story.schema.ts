import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type StoryDocument = Story & Document;

@Schema({ timestamps: true })
export class Story {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  authorId: Types.ObjectId;

  @Prop({
    type: String,
    enum: ['image', 'video', 'text', 'poll'],
    required: true,
  })
  type: string;

  // Media
  @Prop()
  mediaUrl?: string;

  @Prop()
  thumbnailUrl?: string;

  // Text overlay
  @Prop()
  text?: string;

  @Prop()
  backgroundColor?: string;

  @Prop()
  fontStyle?: string;

  // Poll (if type === 'poll')
  @Prop([
    {
      text: { type: String },
      votes: { type: Number, default: 0 },
      voterIds: [{ type: Types.ObjectId, ref: 'User' }],
    },
  ])
  pollOptions?: Array<{
    text: string;
    votes: number;
    voterIds: Types.ObjectId[];
  }>;

  // Privacy
  @Prop({
    type: String,
    enum: ['everyone', 'close_friends', 'custom'],
    default: 'everyone',
  })
  visibility: string;

  @Prop({ type: [Types.ObjectId], ref: 'User', default: [] })
  allowedUserIds?: Types.ObjectId[];

  // Expiry — stories auto-expire after 24h
  @Prop({ type: Date, required: true })
  expiresAt: Date;

  @Prop({ type: Boolean, default: false })
  isExpired: boolean;

  // Engagement
  @Prop({ type: [Types.ObjectId], ref: 'User', default: [] })
  viewerIds: Types.ObjectId[];

  @Prop({ type: Number, default: 0 })
  viewCount: number;

  @Prop([
    {
      userId: { type: Types.ObjectId, ref: 'User' },
      emoji: { type: String },
      createdAt: { type: Date },
    },
  ])
  reactions: Array<{
    userId: Types.ObjectId;
    emoji: string;
    createdAt: Date;
  }>;

  // Highlight — saved past expiry
  @Prop({ type: Boolean, default: false })
  isHighlight: boolean;

  @Prop()
  highlightGroupName?: string;

  // Community stories
  @Prop({ type: Types.ObjectId, ref: 'Community' })
  communityId?: Types.ObjectId;
}

export const StorySchema = SchemaFactory.createForClass(Story);
StorySchema.index({ authorId: 1, expiresAt: -1 });
StorySchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL — auto-delete after expiry
StorySchema.index({ communityId: 1, expiresAt: -1 });
