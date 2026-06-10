import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type RelationshipDocument = Relationship & Document;

/**
 * Relationship entity between two users.
 * Stores directional relationship data from `userId` -> `contactId`.
 * Each pair has TWO Relationship documents (one per direction).
 */
@Schema({ timestamps: true })
export class Relationship {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  contactId: Types.ObjectId;

  // ── Scores ──────────────────────────────────────────────────
  @Prop({ type: Number, default: 50, min: 0, max: 100 })
  relationshipScore: number;

  @Prop({ type: Number, default: 50, min: 0, max: 100 })
  trustScore: number;

  // ── Interaction Metrics ─────────────────────────────────────
  @Prop({ type: Number, default: 0 })
  totalMessagesSent: number;

  @Prop({ type: Number, default: 0 })
  totalMessagesReceived: number;

  @Prop({ type: Number, default: 0 })
  totalInteractions: number;

  @Prop()
  lastInteractionAt?: Date;

  @Prop()
  firstInteractionAt?: Date;

  @Prop({ type: Number, default: 0 })
  streakDays: number;

  @Prop()
  longestStreakDays?: number;

  // ── Relationship State ──────────────────────────────────────
  @Prop({
    type: String,
    enum: ['warming', 'stable', 'cooling', 'drifting', 'archived', 'new'],
    default: 'new',
  })
  status: string;

  @Prop({
    type: String,
    enum: [
      'close_friend',
      'friend',
      'acquaintance',
      'colleague',
      'family',
      'other',
    ],
    default: 'acquaintance',
  })
  category: string;

  @Prop({ type: Number, default: 5, min: 1, max: 10 })
  priority: number;

  @Prop({ type: Boolean, default: false })
  isSoftMuted: boolean;

  @Prop({ type: Boolean, default: false })
  isArchived: boolean;

  // ── Shared Context ──────────────────────────────────────────
  @Prop({ type: [Types.ObjectId], ref: 'Conversation', default: [] })
  sharedConversations: Types.ObjectId[];

  @Prop({ type: Number, default: 0 })
  sharedCommunitiesCount: number;

  @Prop({ type: Number, default: 0 })
  sharedFilesCount: number;

  // ── Milestones ──────────────────────────────────────────────
  @Prop([
    {
      type: { type: String },
      title: { type: String },
      date: { type: Date },
      description: { type: String },
    },
  ])
  milestones: Array<{
    type: string;
    title: string;
    date: Date;
    description?: string;
  }>;

  // ── Reconnect ───────────────────────────────────────────────
  @Prop()
  lastReconnectSuggestionAt?: Date;

  @Prop()
  nextReconnectSuggestionAt?: Date;

  // ── Communication Patterns ──────────────────────────────────
  @Prop({
    type: {
      avgResponseTimeMs: { type: Number, default: 0 },
      preferredHours: [{ type: Number }],
      preferredDays: [{ type: Number }],
      conversationInitiationRatio: { type: Number, default: 0.5 },
    },
    default: {
      avgResponseTimeMs: 0,
      preferredHours: [],
      preferredDays: [],
      conversationInitiationRatio: 0.5,
    },
  })
  communicationPatterns: {
    avgResponseTimeMs: number;
    preferredHours: number[];
    preferredDays: number[];
    conversationInitiationRatio: number;
  };
}

export const RelationshipSchema = SchemaFactory.createForClass(Relationship);

// Compound unique index: one relationship document per direction per pair
RelationshipSchema.index({ userId: 1, contactId: 1 }, { unique: true });
// Query optimization indexes
RelationshipSchema.index({ userId: 1, status: 1 });
RelationshipSchema.index({ userId: 1, category: 1 });
RelationshipSchema.index({ userId: 1, lastInteractionAt: -1 });
