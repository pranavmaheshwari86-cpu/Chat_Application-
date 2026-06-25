import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  Relationship,
  RelationshipDocument,
} from './schemas/relationship.schema';

@Injectable()
export class RelationshipsService {
  private readonly logger = new Logger(RelationshipsService.name);

  constructor(
    @InjectModel(Relationship.name)
    private readonly relationshipModel: Model<RelationshipDocument>,
  ) {}

  /**
   * Called when any interaction occurs between two users.
   */
  async processInteraction(
    userId: string,
    contactId: string,
    type: 'message' | 'call' | 'reaction' | 'file',
    weight: number = 1,
  ) {
    if (userId === contactId) return; // Ignore self-interactions

    const userObjectId = new Types.ObjectId(userId);
    const contactObjectId = new Types.ObjectId(contactId);
    const now = new Date();

    // Upsert directional relationship: userId -> contactId
    await this.upsertDirectionalInteraction(
      userObjectId,
      contactObjectId,
      now,
      type,
      weight,
      true,
    );
    // Upsert directional relationship: contactId -> userId
    await this.upsertDirectionalInteraction(
      contactObjectId,
      userObjectId,
      now,
      type,
      weight,
      false,
    );
  }

  private async upsertDirectionalInteraction(
    ownerId: Types.ObjectId,
    targetId: Types.ObjectId,
    now: Date,
    type: string,
    weight: number,
    isSender: boolean,
  ) {
    const update: any = {
      $inc: {
        totalInteractions: weight,
        [isSender ? 'totalMessagesSent' : 'totalMessagesReceived']: 1,
      },
      $set: {
        lastInteractionAt: now,
      },
      $setOnInsert: {
        firstInteractionAt: now,
        relationshipScore: 50,
        trustScore: 50,
        status: 'new',
        category: 'acquaintance',
      },
    };

    // Simple status bump if they interact
    const rel = await this.relationshipModel.findOneAndUpdate(
      { userId: ownerId, contactId: targetId },
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      update,
      { upsert: true, returnDocument: 'after' },
    );

    // Advanced: Re-evaluate scores based on the new interaction
    if (rel) {
      this.recalculateScores(rel);
      await rel.save();
    }
  }

  private recalculateScores(rel: RelationshipDocument) {
    // Basic logic: Increase score up to 100 based on total interactions.
    // In production, this would weigh 'shared context' from the Memory Engine.
    const newScore = Math.min(
      100,
      50 +
        rel.totalInteractions * 0.1 +
        rel.sharedCommunitiesCount * 2 +
        rel.sharedFilesCount * 1,
    );
    rel.relationshipScore = newScore;

    if (rel.status === 'new' && rel.totalInteractions > 5)
      rel.status = 'warming';
    if (
      ['warming', 'cooling', 'drifting'].includes(rel.status) &&
      rel.totalInteractions > 20
    )
      rel.status = 'stable';
  }

  async getRelationships(userId: string): Promise<RelationshipDocument[]> {
    return this.relationshipModel
      .find({ userId: new Types.ObjectId(userId) })
      .sort({ relationshipScore: -1 })
      .exec();
  }

  async detectDrift() {
    this.logger.log('Running Drift Detection Job...');
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

    // Cooling
    await this.relationshipModel.updateMany(
      {
        lastInteractionAt: { $lt: thirtyDaysAgo, $gte: ninetyDaysAgo },
        status: { $nin: ['cooling', 'drifting', 'archived'] },
      },
      { $set: { status: 'cooling' } },
    );

    // Drifting
    await this.relationshipModel.updateMany(
      {
        lastInteractionAt: { $lt: ninetyDaysAgo },
        status: { $nin: ['drifting', 'archived'] },
      },
      { $set: { status: 'drifting' } },
    );
  }
}
