import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { LLMService } from './llm.service';

const VALID_REPLY_BODY = {
  choices: [{ message: { content: '{"action":"drawShape","params":{"shapeType":"rectangle","color":"#00FF00"}}' } }],
};

describe('LLMService', () => {
  let fetchSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchSpy = vi.fn();
    vi.spyOn(globalThis, 'fetch').mockImplementation(fetchSpy as never);
    fetchSpy.mockResolvedValue(
      new Response(JSON.stringify(VALID_REPLY_BODY), { status: 200, headers: { 'content-type': 'application/json' } }),
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('configuration', () => {
    it('is not configured by default (no api key)', () => {
      const svc = new LLMService();
      expect(svc.isConfigured()).toBe(false);
    });

    it('is configured when an api key is provided', () => {
      const svc = new LLMService({ apiKey: 'sk-test' });
      expect(svc.isConfigured()).toBe(true);
    });

    it('rejects whitespace-only api keys', () => {
      const svc = new LLMService({ apiKey: '   ' });
      expect(svc.isConfigured()).toBe(false);
    });

    it('exposes setters for runtime config changes', () => {
      const svc = new LLMService();
      svc.setApiKey('sk-test');
      svc.setModel('deepseek-coder');
      svc.setBaseURL('https://example.com/v1');
      svc.setTimeout(5000);
      expect(svc.isConfigured()).toBe(true);
    });
  });

  describe('ask()', () => {
    it('returns null when not configured', async () => {
      const svc = new LLMService();
      const result = await svc.ask('画一个矩形');
      expect(result).toBeNull();
      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it('returns null on empty prompt', async () => {
      const svc = new LLMService({ apiKey: 'sk-test' });
      expect(await svc.ask('')).toBeNull();
      expect(await svc.ask('   ')).toBeNull();
      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it('returns a validated decision on a valid response', async () => {
      const svc = new LLMService({ apiKey: 'sk-test' });
      const result = await svc.ask('画一个绿色矩形');
      expect(result).not.toBeNull();
      expect(result?.action).toBe('drawShape');
      expect(result?.params).toEqual({ shapeType: 'rectangle', color: '#00FF00' });
    });

    it('sends a Bearer auth header', async () => {
      const svc = new LLMService({ apiKey: 'sk-test' });
      await svc.ask('hi');
      const [, init] = fetchSpy.mock.calls[0]!;
      const headers = (init as globalThis.RequestInit).headers as Record<string, string>;
      expect(headers['Authorization']).toBe('Bearer sk-test');
    });

    it('sends the configured model in the body', async () => {
      const svc = new LLMService({ apiKey: 'sk-test', model: 'deepseek-coder' });
      await svc.ask('hi');
      const [, init] = fetchSpy.mock.calls[0]!;
      const body = JSON.parse((init as globalThis.RequestInit).body as string);
      expect(body.model).toBe('deepseek-coder');
    });

    it('hits the configured baseURL', async () => {
      const svc = new LLMService({ apiKey: 'sk-test', baseURL: 'https://example.com/v1' });
      await svc.ask('hi');
      const [url] = fetchSpy.mock.calls[0]!;
      expect(url).toBe('https://example.com/v1/chat/completions');
    });

    it('returns null on a non-2xx response', async () => {
      fetchSpy.mockResolvedValueOnce(new Response('unauthorized', { status: 401 }));
      const svc = new LLMService({ apiKey: 'sk-test' });
      const result = await svc.ask('hi');
      expect(result).toBeNull();
    });

    it('returns null when the response has no choices', async () => {
      fetchSpy.mockResolvedValueOnce(new Response('{}', { status: 200 }));
      const svc = new LLMService({ apiKey: 'sk-test' });
      const result = await svc.ask('hi');
      expect(result).toBeNull();
    });

    it('returns null on a network error', async () => {
      fetchSpy.mockRejectedValueOnce(new TypeError('NetworkError'));
      const svc = new LLMService({ apiKey: 'sk-test' });
      const result = await svc.ask('hi');
      expect(result).toBeNull();
    });

    it('returns null when the LLM emits malformed JSON', async () => {
      fetchSpy.mockResolvedValueOnce(
        new Response(JSON.stringify({ choices: [{ message: { content: 'not json at all' } }] }), { status: 200 }),
      );
      const svc = new LLMService({ apiKey: 'sk-test' });
      const result = await svc.ask('hi');
      expect(result).toBeNull();
    });

    it('returns null when the LLM emits a non-conforming action', async () => {
      fetchSpy.mockResolvedValueOnce(
        new Response(
          JSON.stringify({ choices: [{ message: { content: '{"action":"fly","params":{}}' } }] }),
          { status: 200 },
        ),
      );
      const svc = new LLMService({ apiKey: 'sk-test' });
      const result = await svc.ask('hi');
      expect(result).toBeNull();
    });

    it('accepts JSON wrapped in a markdown code fence', async () => {
      fetchSpy.mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            choices: [{ message: { content: '```json\n{"action":"undo","params":{}}\n```' } }],
          }),
          { status: 200 },
        ),
      );
      const svc = new LLMService({ apiKey: 'sk-test' });
      const result = await svc.ask('hi');
      expect(result?.action).toBe('undo');
    });
  });
});
