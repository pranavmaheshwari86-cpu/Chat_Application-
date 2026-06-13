import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { AuthenticatedRequest } from '@chat/shared';
import { KnowledgeService } from './knowledge.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  IsArray,
} from 'class-validator';

export class CreateKnowledgeDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  content: string;

  @IsString()
  @IsOptional()
  type?: string;

  @IsString()
  @IsOptional()
  scope?: string;

  @IsString()
  @IsOptional()
  communityId?: string;

  @IsString()
  @IsOptional()
  channelId?: string;

  @IsString()
  @IsOptional()
  conversationId?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];

  @IsString()
  @IsOptional()
  category?: string;

  @IsBoolean()
  @IsOptional()
  isPublic?: boolean;

  @IsString()
  @IsOptional()
  status?: string;
}

export class UpdateKnowledgeDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  content?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];

  @IsString()
  @IsOptional()
  category?: string;

  @IsString()
  @IsOptional()
  status?: string;

  @IsBoolean()
  @IsOptional()
  isPublic?: boolean;

  @IsBoolean()
  @IsOptional()
  isPinned?: boolean;
}

export class AddKnowledgeCollaboratorDto {
  @IsString()
  @IsNotEmpty()
  userId: string;
}

@ApiTags('Knowledge')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('knowledge')
export class KnowledgeController {
  constructor(private readonly knowledgeService: KnowledgeService) {}

  @Post()
  @ApiOperation({
    summary:
      'Create a new knowledge document (note, wiki, decision log, meeting notes)',
  })
  async create(
    @Req() req: AuthenticatedRequest,
    @Body() body: CreateKnowledgeDto,
  ) {
    const doc = await this.knowledgeService.create(req.user.id, body);
    return { data: doc };
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Update a knowledge document (auto-versions on content change)',
  })
  async update(
    @Param('id') id: string,
    @Req() req: AuthenticatedRequest,
    @Body() body: UpdateKnowledgeDto,
  ) {
    const doc = await this.knowledgeService.update(id, req.user.id, body);
    return { data: doc };
  }

  @Get('personal')
  @ApiOperation({ summary: 'List personal knowledge documents' })
  @ApiQuery({ name: 'type', required: false })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async listPersonal(
    @Req() req: AuthenticatedRequest,
    @Query('type') type?: string,
    @Query('limit') limit?: number,
  ) {
    const docs = await this.knowledgeService.listPersonal(
      req.user.id,
      type,
      limit,
    );
    return { data: docs };
  }

  @Get('community/:communityId')
  @ApiOperation({ summary: 'List knowledge documents for a community' })
  @ApiQuery({ name: 'type', required: false })
  async listByCommunity(
    @Param('communityId') communityId: string,
    @Query('type') type?: string,
  ) {
    const docs = await this.knowledgeService.listByCommunity(communityId, type);
    return { data: docs };
  }

  @Get('search')
  @ApiOperation({ summary: 'Full-text search across knowledge documents' })
  @ApiQuery({ name: 'q', required: true })
  @ApiQuery({ name: 'communityId', required: false })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async search(
    @Req() req: AuthenticatedRequest,
    @Query('q') q: string,
    @Query('communityId') communityId?: string,
    @Query('limit') limit?: number,
  ) {
    const docs = await this.knowledgeService.search(
      q,
      req.user.id,
      communityId,
      limit,
    );
    return { data: docs };
  }

  @Get('semantic-search')
  @ApiOperation({
    summary: 'Semantic (AI-powered) search across knowledge documents',
  })
  @ApiQuery({ name: 'q', required: true })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async semanticSearch(
    @Req() req: AuthenticatedRequest,
    @Query('q') q: string,
    @Query('limit') limit?: number,
  ) {
    const docs = await this.knowledgeService.semanticSearch(
      q,
      req.user.id,
      limit,
    );
    return { data: docs };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a knowledge document by ID' })
  async getById(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    const doc = await this.knowledgeService.getById(id, req.user.id);
    return { data: doc };
  }

  @Post(':id/collaborators')
  @ApiOperation({ summary: 'Add a collaborator to a knowledge document' })
  async addCollaborator(
    @Param('id') id: string,
    @Req() req: AuthenticatedRequest,
    @Body() body: AddKnowledgeCollaboratorDto,
  ) {
    await this.knowledgeService.addCollaborator(id, req.user.id, body.userId);
    return { message: 'Collaborator added' };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Archive a knowledge document' })
  async archive(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    const doc = await this.knowledgeService.archive(id, req.user.id);
    return { data: doc };
  }
}
