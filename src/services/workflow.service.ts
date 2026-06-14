import { parseCommand } from './commandParser';
import type { Command } from './commandParser';
import { llmService } from './llm.service';
import type { RouteResult, RoutingStrategy } from '@/types/llm.types';

const RULE_CONFIDENCE_THRESHOLD = 0.9;

function ruleMatch(text: string): { command: Command; confidence: number } | null {
  const command = parseCommand(text);
  if (!command) return null;
  return { command, confidence: 1.0 };
}

export async function routeCommand(text: string): Promise<RouteResult> {
  const trimmed = text.trim();
  if (!trimmed) {
    return { strategy: 'rule' as RoutingStrategy, command: null, decision: null, confidence: 0, rawText: text };
  }

  const ruleResult = ruleMatch(trimmed);
  if (ruleResult && ruleResult.confidence >= RULE_CONFIDENCE_THRESHOLD) {
    return {
      strategy: 'rule',
      command: ruleResult.command,
      decision: null,
      confidence: ruleResult.confidence,
      rawText: trimmed,
    };
  }

  if (!llmService.isConfigured()) {
    return {
      strategy: 'rule',
      command: ruleResult?.command ?? null,
      decision: null,
      confidence: ruleResult?.confidence ?? 0,
      rawText: trimmed,
    };
  }

  const decision = await llmService.ask(
    `User said: "${trimmed}". What action should be taken?`
  );

  if (!decision) {
    return {
      strategy: 'rule',
      command: ruleResult?.command ?? null,
      decision: null,
      confidence: 0,
      rawText: trimmed,
    };
  }

  return {
    strategy: 'llm',
    command: null,
    decision,
    confidence: 0.7,
    rawText: trimmed,
  };
}

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
