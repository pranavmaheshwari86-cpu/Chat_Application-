import { Injectable, Logger } from '@nestjs/common';
import { AiService } from '../../ai/ai.service';
import { MemoryService } from '../../memory/memory.service';
import { Process, Processor } from '@nestjs/bull';
import * as Bull from 'bull';

export interface SummaryPayload {
  type: 'daily' | 'weekly' | 'community' | 'relationship';
  targetId: string; // userId, communityId, etc.
}

@Injectable()
@Processor('flashchat-summaries')
export class SummaryWorker {
  private readonly logger = new Logger(SummaryWorker.name);

  constructor(
    private readonly aiService: AiService,
    private readonly memoryService: MemoryService,
  ) {}

  @Process('GenerateSummary')
  async generateSummary(job: Bull.Job<SummaryPayload>) {
    this.logger.debug(
      `[SummaryWorker] Generating ${job.data.type} summary for ${job.data.targetId}`,
    );
    // 1. Fetch relevant memories and messages from the time period
    // 2. Generate summary using AiService
    // 3. Store the summary as a new traceable Memory document

    try {
      const summaryText = await this.aiService.generateResponse(
        `Generate a ${job.data.type} summary for the context of user/community ${job.data.targetId}.`,
      );

      await this.memoryService.createMemory({
        userId: null as any, // System or specific user
        type: 'summary',
        title: `${job.data.type.toUpperCase()} Summary`,
        content: summaryText,
        isAiGenerated: true,
        scope: job.data.type === 'community' ? 'community' : 'personal',
      });

      this.logger.log(
        `[SummaryWorker] Summary generated and stored successfully.`,
      );
    } catch (error) {
      this.logger.error(
        `[SummaryWorker] Summary generation failed: ${error.message}`,
      );
    }
  }
}
