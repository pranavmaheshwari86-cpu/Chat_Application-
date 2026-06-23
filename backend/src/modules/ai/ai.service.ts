import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenAI } from '@google/genai';
import { z } from 'zod';
import { AI_MODELS } from '../../common/constants/app.constants';

// Zod schemas for AI output validation
const SmartRepliesSchema = z.array(z.string().min(1).max(200)).length(3);
const TranslationSchema = z.string().min(1).max(5000);
const ModerationSchema = z.object({
  isToxic: z.boolean(),
  reason: z.string().optional(),
});
const KnowledgeExtractionSchema = z.array(
  z.object({
    type: z.enum(['decision', 'task', 'event', 'project', 'milestone']),
    title: z.string().min(1).max(100),
    content: z.string().min(1).max(2000),
  }),
);

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private readonly openRouterApiUrl =
    'https://openrouter.ai/api/v1/chat/completions';
  private ai: GoogleGenAI | null = null;

  // Circuit breaker state
  private circuitBreakerState: 'closed' | 'open' | 'half-open' = 'closed';
  private circuitBreakerFailures = 0;
  private readonly CIRCUIT_BREAKER_THRESHOLD = 5;
  private readonly CIRCUIT_BREAKER_TIMEOUT = 60000; // 1 minute
  private circuitBreakerLastFailure = 0;

  constructor(private configService: ConfigService) {
    const geminiKey = this.configService.get<string>('GEMINI_API_KEY');
    if (geminiKey) {
      this.ai = new GoogleGenAI({ apiKey: geminiKey });
    }
  }

  private recordSuccess(): void {
    this.circuitBreakerFailures = 0;
    this.circuitBreakerState = 'closed';
  }

  private recordFailure(): void {
    this.circuitBreakerFailures++;
    this.circuitBreakerLastFailure = Date.now();
    if (this.circuitBreakerFailures >= this.CIRCUIT_BREAKER_THRESHOLD) {
      this.circuitBreakerState = 'open';
      this.logger.error(
        `Circuit breaker OPENED after ${this.CIRCUIT_BREAKER_THRESHOLD} consecutive failures`,
      );
    }
  }

  private checkCircuitBreaker(): boolean {
    if (this.circuitBreakerState === 'open') {
      if (
        Date.now() - this.circuitBreakerLastFailure >
        this.CIRCUIT_BREAKER_TIMEOUT
      ) {
        this.circuitBreakerState = 'half-open';
        this.logger.warn('Circuit breaker HALF-OPEN - allowing test request');
        return true;
      }
      return false;
    }
    return true;
  }

  private parseJsonSafely<T>(
    raw: string,
    schema: z.ZodSchema<T>,
    fallback: T,
    methodName: string,
  ): T {
    try {
      const cleaned = raw
        .replace(/```json/g, '')
        .replace(/```/g, '')
        .trim();
      const parsed = JSON.parse(cleaned);
      return schema.parse(parsed);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `AI output validation failed in ${methodName}: ${errorMsg}. Raw response: ${raw.substring(0, 500)}`,
      );
      // In production, we should alert/monitor this - for now return fallback but log prominently
      return fallback;
    }
  }

  private async callOpenRouter(messages: any[]): Promise<string> {
    // Circuit breaker check
    if (!this.checkCircuitBreaker()) {
      this.logger.error('Circuit breaker OPEN - rejecting AI request');
      throw new HttpException(
        'AI service temporarily unavailable (circuit breaker open)',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }

    const groqKey = this.configService.get<string>('GROQ_API_KEY');
    if (groqKey) {
      try {
        const response = await fetch(
          'https://api.groq.com/openai/v1/chat/completions',
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${groqKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: AI_MODELS.GROQ_CHAT,
              messages,
            }),
          },
        );
        if (response.ok) {
          const data = await response.json();
          this.recordSuccess();
          return data.choices[0].message.content;
        } else {
          this.logger.warn(`Groq failed: ${await response.text()}`);
        }
      } catch (error) {
        this.logger.error(
          `Groq generation failed: ${(error as Error).message}`,
        );
      }
    }

    if (this.ai) {
      try {
        const prompt =
          messages
            .map(
              (m: any) =>
                `${String(m.role).toUpperCase()}: ${String(m.content)}`,
            )
            .join('\n\n') + '\n\nASSISTANT:';
        try {
          const response = await this.ai.models.generateContent({
            model: AI_MODELS.GEMINI_CONTENT,
            contents: prompt,
          });
          if (response.text) {
            this.recordSuccess();
            return String(response.text);
          }
        } catch (e1: any) {
          this.logger.warn(
            `Gemini 2.5 failed, falling back to 1.5: ${String(e1.message || 'unknown error')}`,
          );
          const responseFallback = await this.ai.models.generateContent({
            model: AI_MODELS.GEMINI_CONTENT_FALLBACK,
            contents: prompt,
          });
          if (responseFallback.text) {
            this.recordSuccess();
            return responseFallback.text;
          }
        }
      } catch (error) {
        this.logger.error(
          `All Gemini generation failed: ${(error as Error).message}`,
        );
      }
    }

    const apiKey = this.configService.get<string>('OPENROUTER_API_KEY');
    if (!apiKey || apiKey === 'replace_with_your_openrouter_key') {
      this.logger.warn(
        'Using mock AI response because OPENROUTER_API_KEY is not configured or is set to dummy value.',
      );
      return 'Hello! I am your FlashChat AI Assistant (Mock Mode). To get real AI responses, please configure your OPENROUTER_API_KEY in the server/.env file.';
    }

    const fallbackModels = AI_MODELS.OPENROUTER_FALLBACKS;

    let lastError = null;

    for (const model of fallbackModels) {
      try {
        const response = await fetch(this.openRouterApiUrl, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'HTTP-Referer':
              this.configService.get<string>('CLIENT_URL') ||
              'http://localhost:3000',
            'X-Title': 'FlashChat',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model,
            messages,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          this.recordSuccess();
          return data.choices[0].message.content;
        } else {
          lastError = await response.text();
          this.logger.warn(`Model ${model} failed: ${lastError}`);
          // Continue to the next fallback model
        }
      } catch (error) {
        lastError = error;

        this.logger.warn(
          `Model ${model} encountered an exception: ${error.message}`,
        );
        // Continue to next fallback model
      }
    }

    this.recordFailure();
    this.logger.error(`All fallback models failed. Last error: ${lastError}`);
    throw new HttpException(
      'AI service temporarily unavailable (all providers rate-limited)',
      HttpStatus.SERVICE_UNAVAILABLE,
    );
  }

  async generateSmartReplies(context: string[]): Promise<string[]> {
    const messages = [
      {
        role: 'system',
        content:
          'You are a smart reply assistant for a chat application. Given the recent message history, generate 3 short, contextually appropriate replies the user could send. Return ONLY a JSON array of 3 strings. Example: ["Yes, sounds good!", "No problem.", "I will check and get back to you."]',
      },
      { role: 'user', content: `Recent messages:\n${context.join('\n')}` },
    ];

    const result = await this.callOpenRouter(messages);
    return this.parseJsonSafely(
      result,
      SmartRepliesSchema,
      ['Yes', 'No', 'Thanks!'],
      'generateSmartReplies',
    );
  }

  async translateMessage(
    content: string,
    targetLanguage: string,
  ): Promise<string> {
    const messages = [
      {
        role: 'system',
        content: `Translate the following message into ${targetLanguage}. Return ONLY the translated text without any explanation or quotes.`,
      },
      { role: 'user', content },
    ];

    const result = await this.callOpenRouter(messages);
    return this.parseJsonSafely(
      result,
      TranslationSchema,
      content,
      'translateMessage',
    );
  }

  async moderateContent(
    content: string,
  ): Promise<{ isToxic: boolean; reason?: string }> {
    const messages = [
      {
        role: 'system',
        content:
          'You are a content moderation AI. Analyze the following message for hate speech, severe harassment, or explicit illegal content. Return a JSON object with two fields: "isToxic" (boolean) and "reason" (string, short explanation if toxic, otherwise empty). Return ONLY the JSON object.',
      },
      { role: 'user', content },
    ];

    const result = await this.callOpenRouter(messages);
    return this.parseJsonSafely(
      result,
      ModerationSchema,
      { isToxic: false },
      'moderateContent',
    );
  }

  async generateResponse(input: string | any[], user?: any): Promise<string> {
    const groqKey = this.configService.get<string>('GROQ_API_KEY');
    const apiKey = this.configService.get<string>('OPENROUTER_API_KEY');
    if (
      !this.ai &&
      !groqKey &&
      (!apiKey || apiKey === 'replace_with_your_openrouter_key')
    ) {
      return 'Hello! I am your FlashChat AI Assistant (Mock Mode). To get real AI responses, please configure your API keys in the server/.env file.';
    }

    let messages = [];

    // Add strong system prompt
    const currentTime = new Date().toLocaleString('en-US', {
      timeZone: 'Asia/Kolkata',
      dateStyle: 'full',
      timeStyle: 'short',
    });
    let systemPrompt = `You are FlashChat AI, the official, highly intelligent and friendly assistant built directly into the FlashChat real-time messaging application. Keep your answers concise, helpful, and natural. The current date and time is ${currentTime}.

**ABOUT FLASHCHAT:**
FlashChat is a modern, real-time messaging platform. You know everything about how it works.
Here are the features and how users can use them:
1. **Direct Messages (DMs)**: Users can chat with friends 1-on-1. To send a message to a friend, go to the "Explore" or "Messages" tab, find or search for your friend's name, click their profile, and start typing.
2. **Voice & Video Calls**: Inside any direct message or group chat, users can click the Phone or Video Camera icons in the top right corner of the chat header to instantly start a high-quality voice or video call.
3. **Groups**: Users can create group chats to talk to multiple friends at once.
4. **Smart Replies & AI**: You (FlashChat AI) can generate smart replies, moderate content, translate messages, and answer general queries. You are available 24/7.
5. **Real-Time Status**: Users can see if their friends are online, offline, or typing in real-time.
6. **Self-Destructing Messages & Rich Media**: Users can send disappearing messages, images, files, and emojis seamlessly.

Always answer questions confidently based on this knowledge base. If asked how to do something in the app, give step-by-step simple instructions based on the above points.`;

    if (user && user.displayName) {
      // Strict allowlist sanitization for prompt injection prevention
      // Only allow alphanumeric, spaces, hyphens, underscores - no special chars
      const rawName = String(user.displayName);
      const safeName = rawName
        .replace(/[^a-zA-Z0-9 _-]/g, '')
        .replace(/\s+/g, ' ')
        .trim()
        .substring(0, 30);

      // Additional check: reject if contains instruction-like patterns (check RAW name for detection)
      const instructionPatterns = [
        /ignore\s+(previous|above|all)\s+instructions?/i,
        /forget\s+(everything|previous|above)/i,
        /system\s*:/i,
        /assistant\s*:/i,
        /user\s*:/i,
        /<\|.*\|>/,
        /\[INST\]/i,
        /<<SYS>>/i,
        /prompt/i,
        /instruction/i,
        /role\s*:/i,
        /you\s+are\s+/i,
        /act\s+as\s+/i,
        /pretend\s+/i,
        /simulate\s+/i,
        /roleplay/i,
        /character\s*:/i,
        /persona\s*:/i,
        /\[.*\]/,
        /\{.*\}/,
        /```/,
        /\\n\\n/i,
      ];
      const hasInjectionAttempt = instructionPatterns.some((p) =>
        p.test(rawName),
      );

      // Only use name if it passes sanitization AND is valid (>= 2 chars, not just whitespace)
      if (
        safeName &&
        !hasInjectionAttempt &&
        safeName.length >= 2 &&
        /[a-zA-Z0-9]/.test(safeName)
      ) {
        systemPrompt += ` You are talking to a user named ${safeName}.`;
      }
    }

    messages.push({ role: 'system', content: systemPrompt });

    // Add conversation history
    if (Array.isArray(input)) {
      messages = messages.concat(
        input.map((m) => ({
          role: m.role === 'ai' ? 'assistant' : 'user',

          content: m.content,
        })),
      );
    } else {
      messages.push({ role: 'user', content: input });
    }

    return this.callOpenRouter(messages);
  }

  async generateEmbedding(text: string): Promise<number[]> {
    if (!this.ai)
      throw new HttpException(
        'Gemini API key not configured',
        HttpStatus.NOT_IMPLEMENTED,
      );
    try {
      const response = await this.ai.models.embedContent({
        model: AI_MODELS.GEMINI_EMBEDDING,
        contents: text,
      });
      return response.embeddings![0].values!;
    } catch (error) {
      this.logger.error(`Embedding generation failed: ${error.message}`);
      throw new HttpException(
        'Failed to generate embedding',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async extractKnowledge(
    text: string,
  ): Promise<Array<{ type: string; title: string; content: string }>> {
    if (!this.ai)
      throw new HttpException(
        'Gemini API key not configured',
        HttpStatus.NOT_IMPLEMENTED,
      );
    try {
      const prompt = `You are a knowledge extraction engine. Analyze the following conversation text.
Extract any of the following if present: Decisions, Tasks, Action Items, Events, Milestones, Deadlines, Projects, Meeting Outcomes.
Return a JSON array of objects. Each object must have:
- "type": (decision, task, event, project, milestone)
- "title": A short 5-10 word summary
- "content": Detailed description
If nothing meaningful is found, return an empty array [].
Return ONLY valid JSON array.

Text:
${text}`;

      const response = await this.ai.models.generateContent({
        model: AI_MODELS.GEMINI_CONTENT,
        contents: prompt,
      });

      const responseText = response.text;
      if (!responseText) return [];

      return this.parseJsonSafely(
        responseText,
        KnowledgeExtractionSchema,
        [],
        'extractKnowledge',
      );
    } catch (error) {
      this.logger.error(`Knowledge extraction failed: ${error.message}`);
      return [];
    }
  }
}
