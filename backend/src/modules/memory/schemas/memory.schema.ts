import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type MemoryDocument = Memory & Document;

/**
 * Memory entity — stores extracted knowledge artifacts from conversations.
 * Every important piece of information becomes a searchable Memory.
 */
@Schema({ timestamps: true })
export class Memory {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId: Types.ObjectId;

  @Prop({
    type: String,
    enum: [
      'decision',
      'task',
      'event',
      'file',
      'project',
      'note',
      'summary',
      'bookmark',
      'milestone',
    ],
    required: true,
    index: true,
  })
  type: string;

  @Prop({ required: true, trim: true, maxlength: 500 })
  title: string;

  @Prop({ maxlength: 5000 })
  content?: string;

  // ── Source Context ──────────────────────────────────────────
  @Prop({ type: Types.ObjectId, ref: 'Conversation' })
  conversationId?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Message' })
  messageId?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  mentionedUserId?: Types.ObjectId;

  @Prop()
  mentionedUserName?: string;

  // ── Categorization ─────────────────────────────────────────
  @Prop({ type: [String], default: [] })
  tags: string[];

  @Prop({
    type: String,
    enum: ['personal', 'team', 'community'],
    default: 'personal',
  })
  scope: string;

  @Prop({ type: Types.ObjectId })
  communityId?: Types.ObjectId;

  // ── AI Metadata ────────────────────────────────────────────
  @Prop({ type: Boolean, default: false })
  isAiGenerated: boolean;

  @Prop({ type: Number, default: 0.5, min: 0, max: 1 })
  confidence: number;

  // ── Vector Embedding (for semantic search) ─────────────────
  @Prop({ type: [Number], default: [] })
  embedding: number[];

  // ── State ──────────────────────────────────────────────────
  @Prop({ type: Boolean, default: false })
  isPinned: boolean;

  @Prop({ type: Boolean, default: false })
  isArchived: boolean;

  @Prop({ type: Boolean, default: false })
  isDeleted: boolean;

  @Prop()
  deletedAt?: Date;

  // ── Related Memories ───────────────────────────────────────
  @Prop({ type: [Types.ObjectId], ref: 'Memory', default: [] })
  relatedMemories: Types.ObjectId[];

  // ── Attachments ────────────────────────────────────────────
  @Prop([
    {
      url: { type: String },
      name: { type: String },
      type: { type: String },
      size: { type: Number },
    },
  ])
  attachments: Array<{
    url: string;
    name: string;
    type: string;
    size: number;
  }>;
}

export const MemorySchema = SchemaFactory.createForClass(Memory);

// Search and query indexes
MemorySchema.index({ userId: 1, type: 1, createdAt: -1 });
MemorySchema.index({ userId: 1, tags: 1 });
MemorySchema.index({ conversationId: 1, type: 1 });
MemorySchema.index({ title: 'text', content: 'text', tags: 'text' });
