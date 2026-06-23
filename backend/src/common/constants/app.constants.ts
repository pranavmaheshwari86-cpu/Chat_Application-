export const APP_CONSTANTS = {
  BCRYPT_ROUNDS: 12,
  MAX_MESSAGE_LENGTH: 8000,
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  PAGINATION_DEFAULT_LIMIT: 50,
  MAX_GROUP_MEMBERS: 256,
  MAX_PINNED_MESSAGES: 50,
  TYPING_TIMEOUT: 3000,
  PRESENCE_TIMEOUT: 30000,
};

export const AI_MODELS = {
  GEMINI_CONTENT: 'gemini-2.5-flash',
  GEMINI_CONTENT_FALLBACK: 'gemini-1.5-flash',
  GEMINI_EMBEDDING: 'text-embedding-004',
  GROQ_CHAT: 'llama-3.3-70b-versatile',
  OPENROUTER_FALLBACKS: [
    'google/gemini-2.5-flash-lite-preview-02-05:free',
    'qwen/qwen-2.5-72b-instruct:free',
    'meta-llama/llama-3.2-3b-instruct:free',
    'meta-llama/llama-3.3-70b-instruct:free',
    'huggingfaceh4/zephyr-7b-beta:free',
  ],
};
