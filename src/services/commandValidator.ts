import { ACTION_SCHEMA } from '@/types/llm.types';

export interface ValidationSuccess {
  valid: true;
  data: { action: string; params: Record<string, unknown> };
}

export interface ValidationFailure {
  valid: false;
  errors: string[];
}

export type ValidationResult = ValidationSuccess | ValidationFailure;

/**
 * Validates the raw text/string the LLM returned. Tolerant of:
 * - LLM wrapping its JSON in a markdown ```json``` fence (strips it)
 * - LLM emitting a JSON object directly (parses as-is)
 *
 * Strict about:
 * - The shape matching ACTION_SCHEMA (Zod)
 * - Rejecting unknown actions
 */
export function validateLLMResponse(raw: string | unknown): ValidationResult {
  if (raw === null || raw === undefined) {
    return { valid: false, errors: ['Empty LLM response'] };
  }

  const text = typeof raw === 'string' ? extractJson(raw) : JSON.stringify(raw);

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { valid: false, errors: ['LLM response is not valid JSON'] };
  }

  const result = ACTION_SCHEMA.safeParse(parsed);
  if (result.success) {
    const data = result.data as { action: string; params?: Record<string, unknown> };
    return { valid: true, data: { action: data.action, params: data.params ?? {} } };
  }

  return {
    valid: false,
    errors: result.error.issues.map((issue) => `${issue.path.join('.') || 'root'}: ${issue.message}`),
  };
}

/**
 * Strip markdown code fences that some LLMs wrap around JSON output.
 * Accepts ```json ... ``` as well as bare ``` ... ```.
 */
function extractJson(text: string): string {
  const trimmed = text.trim();
  const fenceMatch = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  if (fenceMatch) {
    return fenceMatch[1]?.trim() ?? trimmed;
  }
  return trimmed;
}
