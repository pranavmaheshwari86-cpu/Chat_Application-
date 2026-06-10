import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Memory, MemoryDocument } from './schemas/memory.schema';
import { AiService } from '../ai/ai.service';

@Injectable()
export class MemoryService implements OnModuleInit {
  private readonly logger = new Logger(MemoryService.name);

  constructor(
    @InjectModel(Memory.name)
    private readonly memoryModel: Model<MemoryDocument>,
    private readonly aiService: AiService,
  ) {}

  async onModuleInit() {
    await this.setupVectorIndex();
  }

  /**
   * Initializes the MongoDB Atlas Vector Search Index.
   * Requires MongoDB 6.0.11+ / Atlas environment.
   */
  private async setupVectorIndex() {
    try {
      const collection = this.memoryModel.collection;

      // Node driver allows creating search indexes
      // The index name 'vector_index' must match what we use in $vectorSearch
      const existingIndexes = await collection.listSearchIndexes().toArray();
      const exists = existingIndexes.some((idx) => idx.name === 'vector_index');

      if (!exists) {
        this.logger.log('Creating MongoDB Atlas Vector Search Index...');
        await collection.createSearchIndex({
          name: 'vector_index',
          definition: {
            mappings: {
              dynamic: true,
              fields: {
                embedding: {
                  dimensions: 768,
                  similarity: 'cosine',
                  type: 'knnVector',
                },
              },
            },
          },
        });
        this.logger.log('Vector Search Index created successfully');
      }
    } catch (error) {
      // It may fail if not running on Atlas or due to permissions, log and continue
      this.logger.warn(
        `Could not verify/create Atlas Vector Search Index: ${error.message}`,
      );
    }
  }

  async createMemory(payload: Partial<Memory>) {
    if (payload.content) {
      try {
        const embedding = await this.aiService.generateEmbedding(
          `${payload.title}\n${payload.content}`,
        );
        payload.embedding = embedding;
      } catch (err) {
        this.logger.error(
          `Failed to generate embedding for memory: ${err.message}`,
        );
      }
    }
    const memory = new this.memoryModel(payload);
    return memory.save();
  }

  async semanticSearch(
    query: string,
    userId: string,
    limit: number = 10,
  ): Promise<MemoryDocument[]> {
    try {
      const queryEmbedding = await this.aiService.generateEmbedding(query);

      const pipeline = [
        {
          $vectorSearch: {
            index: 'vector_index',
            path: 'embedding',
            queryVector: queryEmbedding,
            numCandidates: limit * 10,
            limit: limit,
            filter: {
              userId: new Types.ObjectId(userId),
            },
          },
        },
        {
          $project: {
            _id: 1,
            title: 1,
            content: 1,
            type: 1,
            tags: 1,
            score: { $meta: 'vectorSearchScore' },
          },
        },
      ];

      return this.memoryModel.aggregate(pipeline).exec();
    } catch (error) {
      this.logger.error(`Semantic search failed: ${error.message}`);
      return [];
    }
  }
}
