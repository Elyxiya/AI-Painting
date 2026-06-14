import { z } from 'zod';

export const ACTION_SCHEMA = z.object({
  action: z.enum([
    'drawShape', 'delete', 'undo', 'redo', 'clearAll',
    'moveShape', 'resizeShape', 'changeColor', 'noop',
  ]),
  params: z.record(z.string(), z.unknown()),
});

export type ValidationResult =
  | { valid: true; data: { action: string; params: Record<string, unknown> } }
  | { valid: false; errors: string[] };

export function validateLLMResponse(raw: unknown): ValidationResult {
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    const result = ACTION_SCHEMA.safeParse(parsed);
    if (result.success) {
      return { valid: true, data: result.data as { action: string; params: Record<string, unknown> } };
    }
    return { valid: false, errors: result.error.issues.map(e => e.message) };
  } catch {
    return { valid: false, errors: ['Invalid JSON response'] };
  }
}
