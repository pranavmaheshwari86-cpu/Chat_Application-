import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type CallDocument = Call & Document;

@Schema({ timestamps: true })
export class Call {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  initiatorId: Types.ObjectId;

  @Prop([
    {
      userId: { type: Types.ObjectId, ref: 'User', required: true },
      joinedAt: { type: Date },
      leftAt: { type: Date },
      status: {
        type: String,
        enum: ['pending', 'joined', 'declined', 'missed'],
        default: 'pending',
      },
    },
  ])
  participants: Record<string, any>[];

  @Prop({ type: String, enum: ['voice', 'video'], required: true })
  type: string;

  @Prop({
    type: String,
    enum: ['ringing', 'active', 'ended', 'missed', 'declined'],
    default: 'ringing',
  })
  status: string;

  @Prop({ type: Date })
  startedAt?: Date;

  @Prop({ type: Date })
  endedAt?: Date;

  @Prop({ type: Number })
  duration?: number;

  @Prop({ type: Types.ObjectId, ref: 'Conversation', index: true })
  conversationId?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Community' })
  communityId?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Channel' })
  channelId?: Types.ObjectId;

  @Prop({
    type: {
      recordingUrl: { type: String },
      transcriptId: { type: String },
      summaryId: { type: String },
    },
    default: {},
  })
  metadata: Record<string, any>;
}

export const CallSchema = SchemaFactory.createForClass(Call);

CallSchema.index({ initiatorId: 1, createdAt: -1 });
CallSchema.index({ conversationId: 1, createdAt: -1 });
CallSchema.index({ 'participants.userId': 1, createdAt: -1 });
