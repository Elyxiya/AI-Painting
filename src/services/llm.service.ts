import type { LLMDecision } from '@/types/llm.types';
import type { LLMServiceConfig } from '@/types/llm.types';
import { validateLLMResponse } from './commandValidator';

const DEFAULT_CONFIG: Required<LLMServiceConfig> & { apiKey: string } = {
  apiKey: '',
  model: 'deepseek-chat',
  baseURL: 'https://api.deepseek.com',
  timeout: 15000,
};

const SYSTEM_PROMPT = `You are an AI assistant for a drawing canvas application.
The user speaks Chinese or English and wants to control the canvas.

Available actions:
- drawShape: Draw a shape. Params: { shapeType: "rectangle"|"ellipse"|"line"|"path"|"text"|"image", color: "#RRGGBB", x?: number, y?: number, width?: number, height?: number }
- delete: Delete selected shapes
- undo: Undo last action
- redo: Redo last undone action
- clearAll: Clear the entire canvas
- moveShape: Move selected shapes. Params: { dx: number, dy: number }
- resizeShape: Resize selected shape. Params: { width: number, height: number }
- changeColor: Change the color of selected shapes. Params: { color: "#RRGGBB" }
- noop: No operation needed

Always respond with valid JSON only. Example: {"action": "drawShape", "params": {"shapeType": "rectangle", "color": "#FF0000"}}
`;

export class LLMService {
  private config: LLMServiceConfig;

  constructor(config: Partial<LLMServiceConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  setApiKey(apiKey: string): void {
    this.config.apiKey = apiKey;
  }

  isConfigured(): boolean {
    return Boolean(this.config.apiKey && this.config.apiKey.length > 0);
  }

  async ask(prompt: string): Promise<LLMDecision | null> {
    if (!this.isConfigured()) {
      return null;
    }

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), this.config.timeout ?? 15000);

      const res = await fetch(`${this.config.baseURL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.apiKey}`,
        },
        body: JSON.stringify({
          model: this.config.model,
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: prompt },
          ],
          temperature: 0.3,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!res.ok) {
        console.error('[LLMService] API error:', res.status, await res.text());
        return null;
      }

      const data = await res.json() as { choices?: Array<{ message?: { content?: string } }> };
      const content = data.choices?.[0]?.message?.content?.trim() ?? '';
      
      if (!content) return null;

      const validated = validateLLMResponse(content);
      if (!validated.valid) {
        console.warn('[LLMService] Invalid LLM response:', validated.errors);
        return null;
      }

      return { action: validated.data.action as LLMDecision['action'], params: validated.data.params ?? {} };
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        console.warn('[LLMService] Request timeout');
      } else {
        console.error('[LLMService] Request failed:', err);
      }
      return null;
    }
  }
}

export const llmService = new LLMService();
export default llmService;
