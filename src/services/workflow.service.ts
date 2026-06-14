import { parseCommand } from './commandParser';
import type { Command } from './commandParser';
import type { ShapeType } from '@/shared/types';
import { llmService } from './llm.service';
import type { LLMDecision, RouteResultWithCommand } from '@/types/llm.types';

/**
 * Confidence threshold for trusting the regex rule engine. A perfect rule
 * match returns 1.0; below this, we ask the LLM. Tunable.
 */
export const RULE_CONFIDENCE_THRESHOLD = 0.9;

/**
 * Decide which strategy handles a given user utterance. Rule engine first;
 * if the rule confidence is below threshold AND the LLM is configured, ask
 * the LLM. If neither path yields a command, the route carries a `null`
 * command/decision so the caller can decide what to do (show error, etc.).
 */
export async function routeCommand(text: string): Promise<RouteResultWithCommand> {
  const trimmed = text.trim();
  if (!trimmed) {
    return { strategy: 'rule', confidence: 0, rawText: text, command: null };
  }

  // 1) Try the rule engine. A perfect match carries confidence 1.0.
  const command = parseCommand(trimmed);
  if (command) {
    return {
      strategy: 'rule',
      confidence: 1.0,
      rawText: trimmed,
      command,
    };
  }

  // 2) Rule didn't match — fall back to LLM if configured.
  if (!llmService.isConfigured()) {
    return { strategy: 'rule', confidence: 0, rawText: trimmed, command: null };
  }

  const decision = await llmService.ask(trimmed);
  if (!decision) {
    return { strategy: 'rule', confidence: 0, rawText: trimmed, command: null };
  }

  return {
    strategy: 'llm',
    confidence: 0.7, // arbitrary — LLM has no calibrated confidence
    rawText: trimmed,
    decision,
  };
}

/**
 * Convert a parsed `Command` to the LLM-style action/params shape. Useful
 * for logging and for routing through a single execution pipeline.
 */
export function commandToAction(cmd: Command): { action: string; params: Record<string, unknown> } {
  switch (cmd.command) {
    case 'drawShape':
      return { action: 'drawShape', params: { shapeType: cmd.shapeType, color: cmd.color } };
    case 'delete':
      return { action: 'delete', params: {} };
    case 'undo':
      return { action: 'undo', params: {} };
    case 'redo':
      return { action: 'redo', params: {} };
    case 'clearAll':
      return { action: 'clearAll', params: {} };
  }
}

/**
 * Convert an LLM decision to a `Command` that `executeCommand` understands.
 * Returns `null` for actions the executor can't handle (moveShape,
 * resizeShape, changeColor, noop).
 */
export function llmDecisionToCommand(decision: LLMDecision): Command | null {
  const p = decision.params ?? {};
  switch (decision.action) {
    case 'drawShape': {
      const shapeType = (p.shapeType as ShapeType | undefined) ?? 'rectangle';
      return {
        command: 'drawShape',
        color: (p.color as string | undefined) ?? '#000000',
        shapeType,
      };
    }
    case 'delete':
      return { command: 'delete' };
    case 'undo':
      return { command: 'undo' };
    case 'redo':
      return { command: 'redo' };
    case 'clearAll':
      return { command: 'clearAll' };
    case 'moveShape':
    case 'resizeShape':
    case 'changeColor':
    case 'noop':
      return null;
    default:
      return null;
  }
}
