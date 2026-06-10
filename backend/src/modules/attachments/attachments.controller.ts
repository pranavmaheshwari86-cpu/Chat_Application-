import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import type { AuthUser, JwtPayload } from '@chat/shared';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { AttachmentsService } from './attachments.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Attachments')
@ApiBearerAuth()
@Controller('attachments')
export class AttachmentsController {
  constructor(private readonly attachmentsService: AttachmentsService) {}

  @Post('image')
  @ApiOperation({ summary: 'Upload an image' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @UseInterceptors(FileInterceptor('file'))
  async uploadImage(
    @UploadedFile() file: Express.Multer.File,

    @CurrentUser() user: AuthUser,
  ) {
    if (!file) {
      throw new BadRequestException('File is required');
    }

    if (!file.mimetype.startsWith('image/')) {
      throw new BadRequestException('Only images are allowed');
    }

    const result = await this.attachmentsService.uploadImage(file);
    return {
      url: result.secure_url,

      publicId: result.public_id,

      width: result.width,

      height: result.height,

      format: result.format,

      size: result.bytes,
    };
  }

  @Post('audio')
  @ApiOperation({ summary: 'Upload an audio file (voice note)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @UseInterceptors(FileInterceptor('file'))
  async uploadAudio(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: AuthUser,
  ) {
    if (!file) {
      throw new BadRequestException('File is required');
    }

    const result = await this.attachmentsService.uploadAudio(file);
    return {
      url: result.secure_url,
      publicId: result.public_id,
      format: result.format,
      size: result.bytes,
    };
  }

  @Post('file')
  @ApiOperation({ summary: 'Upload a raw file' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,

    @CurrentUser() user: AuthUser,
  ) {
    if (!file) {
      throw new BadRequestException('File is required');
    }

    const result = await this.attachmentsService.uploadFile(file);
    return {
      url: result.secure_url,

      publicId: result.public_id,

      format: result.format,

      size: result.bytes,
    };
  }
}
