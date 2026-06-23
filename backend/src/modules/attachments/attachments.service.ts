import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary } from 'cloudinary';
import { UploadApiResponse, UploadApiErrorResponse } from 'cloudinary';

@Injectable()
export class AttachmentsService {
  private readonly logger = new Logger(AttachmentsService.name);

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>('cloudinary.apiKey');
    const apiSecret = this.configService.get<string>('cloudinary.apiSecret');
    const cloudName = this.configService.get<string>('cloudinary.cloudName');
    if (apiKey && apiSecret && cloudName) {
      cloudinary.config({
        cloud_name: cloudName,
        api_key: apiKey,
        api_secret: apiSecret,
      });
    }
  }

  async uploadImage(
    file: Express.Multer.File,
    folder: string = 'flashchat/images',
  ): Promise<UploadApiResponse | UploadApiErrorResponse> {
    const apiKey = this.configService.get<string>('cloudinary.apiKey');
    if (!apiKey) {
      throw new Error('Cloudinary is not configured. Uploads are disabled.');
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
    const apiKey = this.configService.get<string>('cloudinary.apiKey');
    if (!apiKey) {
      throw new Error('Cloudinary is not configured. Uploads are disabled.');
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
    const apiKey = this.configService.get<string>('cloudinary.apiKey');
    if (!apiKey) {
      throw new Error('Cloudinary is not configured. Uploads are disabled.');
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
