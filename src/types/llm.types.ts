import { z } from 'zod';

/**
 * Zod schema for the JSON the LLM is expected to emit. Keeping the schema
 * here (not in commandValidator.ts) so consumers can `infer` the type
 * without pulling the validator at module-load time.
 */
export const ACTION_SCHEMA = z.object({
  action: z.enum([
    'drawShape',
    'delete',
    'undo',
    'redo',
    'clearAll',
    'moveShape',
    'resizeShape',
    'changeColor',
    'noop',
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
  confidence: number;
  rawText: string;
}

/**
 * Discriminated union carrying the actual command regardless of which
 * strategy produced it. `rule` returns a parsed `Command`, `llm` returns
 * a structured `LLMDecision` validated by Zod.
 */
export type RouteResultWithCommand =
  | { strategy: 'rule'; confidence: number; rawText: string; command: import('../services/commandParser').Command | null }
  | { strategy: 'llm'; confidence: number; rawText: string; decision: LLMDecision };
