import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ConversationDocument = Conversation & Document;

@Schema({ timestamps: true })
export class Conversation {
  @Prop({ type: String, enum: ['direct', 'group'], required: true })
  type: string;

  @Prop()
  name?: string;

  @Prop({ maxlength: 500 })
  description?: string;

  @Prop()
  avatar?: string;

  @Prop([
    {
      userId: { type: Types.ObjectId, ref: 'User' },
      role: {
        type: String,
        enum: ['owner', 'admin', 'moderator', 'member'],
        default: 'member',
      },
      joinedAt: { type: Date, default: Date.now },
      mutedUntil: { type: Date },
      isArchived: { type: Boolean, default: false },
    },
  ])
  members: Record<string, any>[];

  @Prop({ type: Object })
  lastMessage?: Record<string, any>;

  @Prop({ type: [{ type: Types.ObjectId, ref: 'Message' }], default: [] })
  pinnedMessages: Types.ObjectId[];

  @Prop({ unique: true, sparse: true })
  inviteCode?: string;

  @Prop({
    type: {
      onlyAdminsCanSend: { type: Boolean, default: false },
      onlyAdminsCanEdit: { type: Boolean, default: false },
    },
    default: { onlyAdminsCanSend: false, onlyAdminsCanEdit: false },
  })
  settings: Record<string, any>;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  createdBy?: Types.ObjectId;
}

export const ConversationSchema = SchemaFactory.createForClass(Conversation);

ConversationSchema.index({ 'members.userId': 1, updatedAt: -1 });
ConversationSchema.index({ updatedAt: -1 });
