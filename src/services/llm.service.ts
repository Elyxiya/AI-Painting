import type { LLMDecision, LLMServiceConfig } from '@/types/llm.types';
import { validateLLMResponse } from './commandValidator';

const DEFAULT_BASE_URL = 'https://api.deepseek.com';
const DEFAULT_MODEL = 'deepseek-chat';
const DEFAULT_TIMEOUT = 15_000;

const SYSTEM_PROMPT = `You are an AI assistant that controls a drawing canvas application.
The user speaks Chinese or English and wants to manipulate shapes.

Available actions (always respond with valid JSON, no prose):
- drawShape:    {"action":"drawShape","params":{"shapeType":"rectangle|ellipse|line|path|text|image","color":"#RRGGBB","x":number,"y":number,"width":number,"height":number}}
- delete:       {"action":"delete","params":{}}
- undo:         {"action":"undo","params":{}}
- redo:         {"action":"redo","params":{}}
- clearAll:     {"action":"clearAll","params":{}}
- moveShape:    {"action":"moveShape","params":{"dx":number,"dy":number}}
- resizeShape:  {"action":"resizeShape","params":{"width":number,"height":number}}
- changeColor:  {"action":"changeColor","params":{"color":"#RRGGBB"}}
- noop:         {"action":"noop","params":{}}   // use this when the request is unclear or un-doable

Reply with JSON only. Wrap in a \`\`\`json ... \`\`\` fence if you wish.`;

interface DeepSeekChatResponse {
  choices?: Array<{ message?: { content?: string } }>;
}

/**
 * Thin DeepSeek (OpenAI-compatible) chat client with strict Zod validation.
 *
 * The service is intentionally stateless at the instance level — the only
 * state is configuration. Tests construct a fresh instance per case.
 */
export class LLMService {
  private config: Required<LLMServiceConfig>;

  constructor(config: Partial<LLMServiceConfig> = {}) {
    this.config = {
      apiKey: config.apiKey ?? '',
      model: config.model ?? DEFAULT_MODEL,
      baseURL: config.baseURL ?? DEFAULT_BASE_URL,
      timeout: config.timeout ?? DEFAULT_TIMEOUT,
    };
  }

  setApiKey(apiKey: string): void {
    this.config.apiKey = apiKey;
  }

  setModel(model: string): void {
    this.config.model = model;
  }

  setBaseURL(baseURL: string): void {
    this.config.baseURL = baseURL;
  }

  setTimeout(timeoutMs: number): void {
    this.config.timeout = timeoutMs;
  }

  isConfigured(): boolean {
    return this.config.apiKey.trim().length > 0;
  }

  /**
   * Send a user prompt to DeepSeek. Returns the validated decision or `null`
   * if the LLM is not configured, the request fails, or the response fails
   * Zod validation. Never throws.
   */
  async ask(prompt: string): Promise<LLMDecision | null> {
    if (!this.isConfigured()) return null;
    if (!prompt || !prompt.trim()) return null;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.config.timeout);

    try {
      const res = await fetch(`${this.config.baseURL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.config.apiKey}`,
        },
        body: JSON.stringify({
          model: this.config.model,
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: prompt },
          ],
          temperature: 0.3,
          stream: false,
        }),
        signal: controller.signal,
      });

      if (!res.ok) {
        console.error(`[LLMService] DeepSeek API error ${res.status}`);
        return null;
      }

      const data = (await res.json()) as DeepSeekChatResponse;
      const content = data.choices?.[0]?.message?.content ?? '';
      if (!content) return null;

      const validated = validateLLMResponse(content);
      if (!validated.valid) {
        console.warn('[LLMService] LLM response failed validation:', validated.errors);
        return null;
      }

      return {
        action: validated.data.action as LLMDecision['action'],
        params: validated.data.params,
      };
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        console.warn('[LLMService] Request timed out');
      } else {
        console.error('[LLMService] Request failed:', err);
      }
      return null;
    } finally {
      clearTimeout(timer);
    }
  }
}

/**
 * Module-level singleton. Reads `import.meta.env.VITE_DEEPSEEK_API_KEY` lazily
 * so the absence of the env var in test/dev doesn't throw at import time.
 */
export const llmService = new LLMService({
  apiKey: (import.meta.env.VITE_DEEPSEEK_API_KEY as string | undefined) ?? '',
  baseURL: (import.meta.env.VITE_LLM_BASE_URL as string | undefined) ?? DEFAULT_BASE_URL,
  model: (import.meta.env.VITE_LLM_MODEL as string | undefined) ?? DEFAULT_MODEL,
});

export default llmService;
