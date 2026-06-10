export const APP_CONSTANTS = {
  BCRYPT_ROUNDS: 12,
  MAX_MESSAGE_LENGTH: 8000,
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  ALLOWED_MIME_TYPES: [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'video/mp4',
    'video/webm',
    'audio/mpeg',
    'audio/ogg',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ],
  PAGINATION_DEFAULT_LIMIT: 50,
  MAX_GROUP_MEMBERS: 256,
  MAX_PINNED_MESSAGES: 50,
  TYPING_TIMEOUT: 3000,
  PRESENCE_TIMEOUT: 30000,
};
