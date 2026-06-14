import { describe, it, expect } from 'vitest';
import { validateLLMResponse } from './commandValidator';

describe('validateLLMResponse', () => {
  describe('valid responses', () => {
    it('accepts a minimal drawShape decision', () => {
      const result = validateLLMResponse('{"action":"drawShape","params":{"shapeType":"rectangle","color":"#FF0000"}}');
      expect(result.valid).toBe(true);
      if (result.valid) {
        expect(result.data.action).toBe('drawShape');
        expect(result.data.params).toEqual({ shapeType: 'rectangle', color: '#FF0000' });
      }
    });

    it('accepts a delete decision with empty params', () => {
      const result = validateLLMResponse('{"action":"delete","params":{}}');
      expect(result.valid).toBe(true);
      if (result.valid) {
        expect(result.data.action).toBe('delete');
        expect(result.data.params).toEqual({});
      }
    });

    it('accepts all known actions', () => {
      const actions = ['drawShape', 'delete', 'undo', 'redo', 'clearAll', 'moveShape', 'resizeShape', 'changeColor', 'noop'];
      for (const action of actions) {
        const result = validateLLMResponse(JSON.stringify({ action, params: {} }));
        expect(result.valid, `expected ${action} to be valid`).toBe(true);
      }
    });

    it('accepts JSON wrapped in a markdown code fence', () => {
      const result = validateLLMResponse('```json\n{"action":"undo","params":{}}\n```');
      expect(result.valid).toBe(true);
    });

    it('accepts JSON wrapped in a bare code fence', () => {
      const result = validateLLMResponse('```\n{"action":"redo","params":{}}\n```');
      expect(result.valid).toBe(true);
    });

    it('accepts params as an empty object', () => {
      const result = validateLLMResponse('{"action":"clearAll","params":{}}');
      expect(result.valid).toBe(true);
    });

    it('defaults params to an empty object when missing', () => {
      const result = validateLLMResponse('{"action":"undo"}');
      expect(result.valid).toBe(true);
      if (result.valid) {
        expect(result.data.params).toEqual({});
      }
    });
  });

  describe('invalid responses', () => {
    it('rejects an unknown action', () => {
      const result = validateLLMResponse('{"action":"deleteTheCanvas","params":{}}');
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.errors.length).toBeGreaterThan(0);
      }
    });

    it('rejects malformed JSON', () => {
      const result = validateLLMResponse('{not valid json');
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.errors).toContain('LLM response is not valid JSON');
      }
    });

    it('rejects a JSON array (not an object)', () => {
      const result = validateLLMResponse('[{"action":"undo"}]');
      expect(result.valid).toBe(false);
    });

    it('rejects a null response', () => {
      const result = validateLLMResponse(null);
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.errors).toContain('Empty LLM response');
      }
    });

    it('rejects an undefined response', () => {
      const result = validateLLMResponse(undefined);
      expect(result.valid).toBe(false);
    });

    it('rejects a response with non-object params', () => {
      const result = validateLLMResponse('{"action":"drawShape","params":"not an object"}');
      expect(result.valid).toBe(false);
    });

    it('returns multiple error messages when multiple fields are wrong', () => {
      const result = validateLLMResponse('{"action":"fly","params":42}');
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.errors.length).toBeGreaterThan(1);
      }
    });
  });
});
