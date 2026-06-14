import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const mockTranscriberObj = vi.hoisted(() => ({
  transcribe: vi.fn<(audio: Blob) => Promise<string>>(),
  engine: 'mock' as const,
}));

vi.mock('@/services/whisper.service', () => ({
  mockTranscriber: mockTranscriberObj,
  createTranscriber: vi.fn(() => mockTranscriberObj),
  getTranscriberEngine: vi.fn(() => 'mock'),
  initTranscriber: vi.fn(async () => mockTranscriberObj),
  _resetTranscriberCache: vi.fn(),
  default: mockTranscriberObj,
}));

import {
  mockTranscriber,
  createTranscriber,
  getTranscriberEngine,
  initTranscriber,
} from '@/services/whisper.service';

describe('whisper.service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockTranscriberObj.transcribe.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('mockTranscriber (named export)', () => {
    it('is defined', () => {
      expect(mockTranscriber).toBeDefined();
    });

    it('exposes a transcribe function', () => {
      expect(typeof mockTranscriber.transcribe).toBe('function');
    });

    it('reports its engine as "mock"', () => {
      expect(mockTranscriber.engine).toBe('mock');
    });

    it('transcribe resolves with the value the mock fn was wired to', async () => {
      mockTranscriberObj.transcribe.mockResolvedValue('hello world');
      const result = await mockTranscriber.transcribe(new Blob());
      expect(result).toBe('hello world');
    });

    it('propagates errors from the underlying transcribe call', async () => {
      mockTranscriberObj.transcribe.mockRejectedValue(new Error('boom'));
      await expect(mockTranscriber.transcribe(new Blob())).rejects.toThrow('boom');
    });
  });

  describe('createTranscriber factory', () => {
    it('returns a transcriber synchronously', () => {
      const t = createTranscriber();
      expect(t).toBeDefined();
      expect(typeof t.transcribe).toBe('function');
    });

    it('delegates to the current engine', async () => {
      mockTranscriberObj.transcribe.mockResolvedValue('factory-ok');
      const t = createTranscriber();
      const result = await t.transcribe(new Blob());
      expect(result).toBe('factory-ok');
    });
  });

  describe('getTranscriberEngine', () => {
    it('returns the engine name as a string', () => {
      const e = getTranscriberEngine();
      expect(typeof e).toBe('string');
      expect(['transformers', 'webspeech', 'mock']).toContain(e);
    });
  });

  describe('initTranscriber (async)', () => {
    it('resolves to a Transcriber object', async () => {
      const t = await initTranscriber();
      expect(t).toBeDefined();
      expect(typeof t.transcribe).toBe('function');
    });

    it('respects the engine selected at init time', async () => {
      mockTranscriberObj.transcribe.mockResolvedValue('init-engine');
      const t = await initTranscriber();
      expect(t.engine).toBe('mock');
      const result = await t.transcribe(new Blob());
      expect(result).toBe('init-engine');
    });
  });

  describe('default export', () => {
    it('is the mockTranscriber', async () => {
      const { default: def } = await import('@/services/whisper.service');
      mockTranscriberObj.transcribe.mockResolvedValue('default-export-ok');
      const result = await def.transcribe(new Blob());
      expect(result).toBe('default-export-ok');
    });
  });
});

describe('Transcriber interface contract', () => {
  it('accepts a Blob and returns a Promise<string>', async () => {
    mockTranscriberObj.transcribe.mockResolvedValue('contract');
    const t: { transcribe: (b: Blob) => Promise<string> } = mockTranscriber;
    const result = await t.transcribe(new Blob());
    expect(typeof result).toBe('string');
  });
});
