import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  KnowledgeDocument,
  KnowledgeDocumentDoc,
} from './schemas/knowledge-document.schema';
import { AiService } from '../ai/ai.service';
import { EventsService } from '../events/events.service';

@Injectable()
export class KnowledgeService {
  private readonly logger = new Logger(KnowledgeService.name);

  constructor(
    @InjectModel(KnowledgeDocument.name)
    private readonly docModel: Model<KnowledgeDocumentDoc>,
    private readonly aiService: AiService,
    private readonly eventsService: EventsService,
  ) {}

  /**
   * Create a new knowledge document.
   */
  async create(
    authorId: string,
    data: {
      title: string;
      content: string;
      type?: string;
      scope?: string;
      communityId?: string;
      channelId?: string;
      conversationId?: string;
      tags?: string[];
      category?: string;
      isPublic?: boolean;
      status?: string;
    },
  ): Promise<KnowledgeDocumentDoc> {
    const doc = await this.docModel.create({
      title: data.title,
      content: data.content,
      type: data.type || 'note',
      scope: data.scope || 'personal',
      authorId: new Types.ObjectId(authorId),
      communityId: data.communityId
        ? new Types.ObjectId(data.communityId)
        : undefined,
      channelId: data.channelId
        ? new Types.ObjectId(data.channelId)
        : undefined,
      conversationId: data.conversationId
        ? new Types.ObjectId(data.conversationId)
        : undefined,
      tags: data.tags || [],
      category: data.category,
      isPublic: data.isPublic || false,
      status: data.status || 'draft',
      version: 1,
      history: [],
    });

    // Generate embedding asynchronously (fire-and-forget)
    this.generateAndStoreEmbedding(
      doc._id.toString(),
      `${data.title} ${data.content}`,
    ).catch((err) =>
      this.logger.warn(
        // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
        `Embedding generation failed for doc ${doc._id}: ${err.message}`,

        err.stack,
      ),
    );

    return doc;
  }

  /**
   * Update a knowledge document with version history tracking.
   */
  async update(
    docId: string,
    userId: string,
    data: {
      title?: string;
      content?: string;
      tags?: string[];
      category?: string;
      status?: string;
      isPublic?: boolean;
      isPinned?: boolean;
    },
  ): Promise<KnowledgeDocumentDoc> {
    const doc = await this.docModel.findById(docId);
    if (!doc) throw new NotFoundException('Knowledge document not found');

    // Authorization: author or collaborator
    const isAuthor = doc.authorId.toString() === userId;
    const isCollaborator = doc.collaboratorIds.some(
      (id) => id.toString() === userId,
    );
    if (!isAuthor && !isCollaborator) {
      throw new ForbiddenException(
        'You do not have permission to edit this document',
      );
    }

    // If content changed, push current version to history
    if (data.content && data.content !== doc.content) {
      doc.history.push({
        version: doc.version,
        content: doc.content,
        editedBy: new Types.ObjectId(userId),
        editedAt: new Date(),
      });
      doc.version += 1;
      doc.content = data.content;

      // Re-generate embedding for new content
      this.generateAndStoreEmbedding(
        docId,
        `${data.title || doc.title} ${data.content}`,
      ).catch((err) =>
        this.logger.warn(
          `Re-embedding failed for doc ${docId}: ${err.message}`,

          err.stack,
        ),
      );
    }

    if (data.title !== undefined) doc.title = data.title;
    if (data.tags !== undefined) doc.tags = data.tags;
    if (data.category !== undefined) doc.category = data.category;
    if (data.status !== undefined) doc.status = data.status;
    if (data.isPublic !== undefined) doc.isPublic = data.isPublic;
    if (data.isPinned !== undefined) doc.isPinned = data.isPinned;

    await doc.save();
    return doc;
  }

  /**
   * Get a single document by ID.
   */

  async getById(docId: string, userId: string): Promise<KnowledgeDocumentDoc> {
    const doc = await this.docModel.findById(docId);
    if (!doc) throw new NotFoundException('Knowledge document not found');

    // Increment view count
    await this.docModel.updateOne({ _id: doc._id }, { $inc: { viewCount: 1 } });

    return doc;
  }

  /**
   * List documents for a user (personal scope).
   */
  async listPersonal(
    userId: string,
    type?: string,
    limit = 50,
  ): Promise<KnowledgeDocumentDoc[]> {
    const filter: any = {
      authorId: new Types.ObjectId(userId),
      scope: 'personal',
    };

    if (type) filter.type = type;

    return (
      this.docModel
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        .find(filter)
        .sort({ updatedAt: -1 })
        .limit(limit)
        .exec()
    );
  }

  /**
   * List documents for a community (wiki, shared docs).
   */
  async listByCommunity(
    communityId: string,
    type?: string,
    limit = 50,
  ): Promise<KnowledgeDocumentDoc[]> {
    const filter: any = {
      communityId: new Types.ObjectId(communityId),
      scope: 'community',
    };

    if (type) filter.type = type;

    return (
      this.docModel
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        .find(filter)
        .sort({ isPinned: -1, updatedAt: -1 })
        .limit(limit)
        .exec()
    );
  }

  /**
   * Full-text search across knowledge documents.
   */
  async search(
    query: string,
    userId: string,
    communityId?: string,
    limit = 20,
  ): Promise<KnowledgeDocumentDoc[]> {
    const filter: any = {
      $text: { $search: query },
      $or: [
        { authorId: new Types.ObjectId(userId) },
        { isPublic: true },
        { collaboratorIds: new Types.ObjectId(userId) },
      ],
    };

    if (communityId) {
      filter.communityId = new Types.ObjectId(communityId);
    }

    return (
      this.docModel
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        .find(filter, { score: { $meta: 'textScore' } })
        .sort({ score: { $meta: 'textScore' } })
        .limit(limit)
        .exec()
    );
  }

  /**
   * Semantic search over knowledge document embeddings.
   */
  async semanticSearch(
    query: string,
    userId: string,
    limit = 10,
  ): Promise<KnowledgeDocumentDoc[]> {
    try {
      const embedding = await this.aiService.generateEmbedding(query);

      const results = await this.docModel.aggregate([
        {
          $vectorSearch: {
            index: 'knowledge_vector_index',
            path: 'embedding',
            queryVector: embedding,
            numCandidates: limit * 10,
            limit: limit,
          },
        },
        {
          $match: {
            $or: [
              { authorId: new Types.ObjectId(userId) },
              { isPublic: true },
              { collaboratorIds: new Types.ObjectId(userId) },
            ],
          },
        },
        {
          $project: {
            embedding: 0,
            'history.content': 0,
          },
        },
      ]);

      return results;
    } catch (error) {
      this.logger.warn(
        `Semantic search fallback to text search: ${error.message}`,
      );
      return this.search(query, userId, undefined, limit);
    }
  }

  /**
   * Add a collaborator to a document.
   */
  async addCollaborator(
    docId: string,
    ownerId: string,
    collaboratorId: string,
  ) {
    const doc = await this.docModel.findById(docId);
    if (!doc) throw new NotFoundException('Document not found');
    if (doc.authorId.toString() !== ownerId)
      throw new ForbiddenException('Only the author can add collaborators');

    await this.docModel.updateOne(
      { _id: doc._id },
      { $addToSet: { collaboratorIds: new Types.ObjectId(collaboratorId) } },
    );
  }

  /**
   * Delete (archive) a knowledge document.
   */
  async archive(docId: string, userId: string) {
    const doc = await this.docModel.findById(docId);
    if (!doc) throw new NotFoundException('Document not found');
    if (doc.authorId.toString() !== userId)
      throw new ForbiddenException('Only the author can archive');

    doc.status = 'archived';
    await doc.save();
    return doc;
  }

  /**
   * Internal: Generate and store vector embedding for a document.
   */
  private async generateAndStoreEmbedding(docId: string, text: string) {
    const embedding = await this.aiService.generateEmbedding(
      text.substring(0, 8000),
    );
    await this.docModel.updateOne(
      { _id: new Types.ObjectId(docId) },
      { $set: { embedding } },
    );
  }
}
