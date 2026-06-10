import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Memory, MemorySchema } from './schemas/memory.schema';
import { MemoryService } from './memory.service';
import { MemoryController } from './memory.controller';
import { AiModule } from '../ai/ai.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Memory.name, schema: MemorySchema }]),
    AiModule,
  ],
  controllers: [MemoryController],
  providers: [MemoryService],
  exports: [MemoryService],
})
export class MemoryModule {}
