import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenAI } from '@google/genai';

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private readonly openRouterApiUrl =
    'https://openrouter.ai/api/v1/chat/completions';
  private ai: GoogleGenAI;

  constructor(private configService: ConfigService) {
    const geminiKey = this.configService.get<string>('GEMINI_API_KEY');
    if (geminiKey) {
      this.ai = new GoogleGenAI({ apiKey: geminiKey });
    }
  }

  private async callOpenRouter(messages: any[]): Promise<string> {
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
              model: 'llama-3.3-70b-versatile',
              messages,
            }),
          },
        );
        if (response.ok) {
          const data = await response.json();
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
            model: 'gemini-2.5-flash',
            contents: prompt,
          });
          if (response.text) return String(response.text);
        } catch (e1: any) {
          this.logger.warn(
            `Gemini 2.5 failed, falling back to 1.5: ${String(e1.message || 'unknown error')}`,
          );
          const responseFallback = await this.ai.models.generateContent({
            model: 'gemini-1.5-flash',
            contents: prompt,
          });
          if (responseFallback.text) return responseFallback.text;
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

    const fallbackModels = [
      'google/gemini-2.5-flash-lite-preview-02-05:free',
      'qwen/qwen-2.5-72b-instruct:free',
      'meta-llama/llama-3.2-3b-instruct:free',
      'meta-llama/llama-3.3-70b-instruct:free',
      'huggingfaceh4/zephyr-7b-beta:free',
    ];

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
    try {
      const cleaned = result
        .replace(/```json/g, '')
        .replace(/```/g, '')
        .trim();

      return JSON.parse(cleaned);
    } catch (e) {
      this.logger.error(`Failed to parse smart replies: ${result}`);
      return ['Yes', 'No', 'Thanks!'];
    }
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

    return this.callOpenRouter(messages);
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
    try {
      const cleaned = result
        .replace(/```json/g, '')
        .replace(/```/g, '')
        .trim();

      const parsed = JSON.parse(cleaned);

      return { isToxic: !!parsed.isToxic, reason: parsed.reason };
    } catch (e) {
      this.logger.error(`Failed to parse moderation result: ${result}`);
      return { isToxic: false };
    }
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
      systemPrompt += ` You are talking to a user named ${user.displayName}.`;
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
        model: 'text-embedding-004',
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

  async extractKnowledge(text: string): Promise<any[]> {
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
        model: 'gemini-2.5-flash',
        contents: prompt,
      });

      const cleaned = response
        .text!.replace(/```json/g, '')
        .replace(/```/g, '')
        .trim();

      return JSON.parse(cleaned);
    } catch (error) {
      this.logger.error(`Knowledge extraction failed: ${error.message}`);
      return [];
    }
  }
}
