import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary } from 'cloudinary';
import { UploadApiResponse, UploadApiErrorResponse } from 'cloudinary';

import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class AttachmentsService {
  private readonly logger = new Logger(AttachmentsService.name);

  constructor(private configService: ConfigService) {
    // Cloudinary config is optional locally
    if (this.configService.get('cloudinary.apiKey') !== 'your-api-key') {
      cloudinary.config({
        cloud_name: this.configService.get('cloudinary.cloudName'),
        api_key: this.configService.get('cloudinary.apiKey'),
        api_secret: this.configService.get('cloudinary.apiSecret'),
      });
    }
  }

  async uploadImage(
    file: Express.Multer.File,
    folder: string = 'flashchat/images',
  ): Promise<UploadApiResponse | UploadApiErrorResponse> {
    if (this.configService.get('cloudinary.apiKey') === 'your-api-key') {
      // Local development fallback
      const ext = file.originalname.split('.').pop() || 'png';
      const filename = `${Date.now()}-${Math.round(Math.random() * 1e9)}.${ext}`;
      const uploadDir = path.join(process.cwd(), '../client/public/uploads');
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      const filePath = path.join(uploadDir, filename);
      await fs.promises.writeFile(filePath, file.buffer);

      return {
        secure_url: `/uploads/${filename}`,
        public_id: filename,
        width: 800,
        height: 800,
        format: ext,
        bytes: file.buffer.length,
      } as unknown as UploadApiResponse;
    }

    return new Promise((resolve, reject) => {
      const upload = cloudinary.uploader.upload_stream(
        {
          folder,
          resource_type: 'image',
        },
        (error, result) => {
          if (error || !result) {
            this.logger.error('Failed to upload image to Cloudinary', error);
            // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors
            return reject(error || new Error('Upload failed'));
          }
          resolve(result);
        },
      );

      upload.end(file.buffer);
    });
  }

  async uploadAudio(
    file: Express.Multer.File,
    folder: string = 'flashchat/audio',
  ): Promise<UploadApiResponse | UploadApiErrorResponse> {
    if (this.configService.get('cloudinary.apiKey') === 'your-api-key') {
      const ext = 'webm';
      const filename = `${Date.now()}-${Math.round(Math.random() * 1e9)}.${ext}`;
      const uploadDir = path.join(process.cwd(), '../client/public/uploads');
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      const filePath = path.join(uploadDir, filename);
      await fs.promises.writeFile(filePath, file.buffer);

      return {
        secure_url: `/uploads/${filename}`,
        public_id: filename,
        format: ext,
        bytes: file.buffer.length,
      } as unknown as UploadApiResponse;
    }

    return new Promise((resolve, reject) => {
      const upload = cloudinary.uploader.upload_stream(
        {
          folder,
          resource_type: 'video', // cloudinary uses 'video' for audio files
        },
        (error, result) => {
          if (error || !result) {
            this.logger.error('Failed to upload audio to Cloudinary', error);
            // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors
            return reject(error || new Error('Upload failed'));
          }
          resolve(result);
        },
      );

      upload.end(file.buffer);
    });
  }

  async uploadFile(
    file: Express.Multer.File,
    folder: string = 'flashchat/files',
  ): Promise<UploadApiResponse | UploadApiErrorResponse> {
    if (this.configService.get('cloudinary.apiKey') === 'your-api-key') {
      // Local development fallback
      const ext = file.originalname.split('.').pop() || 'bin';
      const filename = `${Date.now()}-${Math.round(Math.random() * 1e9)}.${ext}`;
      const uploadDir = path.join(process.cwd(), '../client/public/uploads');
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      const filePath = path.join(uploadDir, filename);
      await fs.promises.writeFile(filePath, file.buffer);

      return {
        secure_url: `/uploads/${filename}`,
        public_id: filename,
        format: ext,
        bytes: file.buffer.length,
      } as unknown as UploadApiResponse;
    }

    return new Promise((resolve, reject) => {
      const upload = cloudinary.uploader.upload_stream(
        {
          folder,
          resource_type: 'raw',
        },
        (error, result) => {
          if (error || !result) {
            this.logger.error('Failed to upload file to Cloudinary', error);
            // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors
            return reject(error || new Error('Upload failed'));
          }
          resolve(result);
        },
      );

      upload.end(file.buffer);
    });
  }
}
