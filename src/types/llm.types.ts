import { z } from 'zod';

export const ACTION_SCHEMA = z.object({
  action: z.enum([
    'drawShape', 'delete', 'undo', 'redo', 'clearAll',
    'moveShape', 'resizeShape', 'changeColor', 'noop',
  ]),
  params: z.record(z.string(), z.unknown()).optional(),
});

export type LLMDecision = z.infer<typeof ACTION_SCHEMA>;

export interface LLMServiceConfig {
  apiKey: string;
  model?: string;
  baseURL?: string;
  timeout?: number;
}

export type RoutingStrategy = 'rule' | 'llm';

export interface RouteResult {
  strategy: RoutingStrategy;
  command: import('../services/commandParser').Command | null;
  decision: LLMDecision | null;
  confidence: number;
  rawText: string;
}
