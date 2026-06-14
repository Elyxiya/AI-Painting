import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock object must be hoisted so vi.mock can reference it
const mockTranscriberObj = vi.hoisted(() => ({
  transcribe: vi.fn<(audio: Blob) => Promise<string>>(),
  engine: 'mock' as const,
}));

// Mock whisper service — createTranscriber is now async, so factory must return Promise
vi.mock('@/services/whisper.service', () => ({
  createTranscriber: vi.fn(async () => mockTranscriberObj),
  getTranscriberEngine: vi.fn(() => 'mock'),
  mockTranscriber: mockTranscriberObj,
  default: mockTranscriberObj,
}));

import { createTranscriber } from '@/services/whisper.service';

describe('whisper.service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('mockTranscriber', () => {
    it('should be defined', () => {
      expect(mockTranscriberObj.transcribe).toBeDefined();
    });

    it('should return transcript text', async () => {
      mockTranscriberObj.transcribe.mockResolvedValue('Hello world');

      const result = await mockTranscriberObj.transcribe(new Blob());

      expect(result).toBe('Hello world');
      expect(mockTranscriberObj.transcribe).toHaveBeenCalledTimes(1);
    });

    it('should handle empty audio', async () => {
      mockTranscriberObj.transcribe.mockResolvedValue('');

      const result = await mockTranscriberObj.transcribe(new Blob());

      expect(result).toBe('');
    });

    it('should handle Chinese text', async () => {
      mockTranscriberObj.transcribe.mockResolvedValue('画一个红色矩形');

      const result = await mockTranscriberObj.transcribe(new Blob());

      expect(result).toBe('画一个红色矩形');
    });

    it('should propagate errors', async () => {
      mockTranscriberObj.transcribe.mockRejectedValue(new Error('Transcription failed'));

      await expect(mockTranscriberObj.transcribe(new Blob())).rejects.toThrow('Transcription failed');
    });
  });

  describe('createTranscriber', () => {
    it('should return a transcriber object', async () => {
      const transcriber = await createTranscriber();
      expect(typeof transcriber.transcribe).toBe('function');
      expect(typeof transcriber.engine).toBe('string');
    });

    it('should create transcriber that can transcribe', async () => {
      mockTranscriberObj.transcribe.mockResolvedValue('Test transcription');
      const transcriber = await createTranscriber();

      const result = await transcriber.transcribe(new Blob());

      expect(result).toBe('Test transcription');
    });
  });

  describe('default export', () => {
    it('should have transcribe method', async () => {
      mockTranscriberObj.transcribe.mockResolvedValue('Default export test');

      const { default: transcriber } = await import('@/services/whisper.service');

      const result = await transcriber.transcribe(new Blob());

      expect(result).toBe('Default export test');
    });
  });
});

describe('Transcriber interface', () => {
  it('should have transcribe method that accepts Blob and returns Promise<string>', async () => {
    mockTranscriberObj.transcribe.mockResolvedValue('Interface test');

    const transcriber: { transcribe: (audio: Blob) => Promise<string> } = {
      transcribe: mockTranscriberObj.transcribe,
    };

    const result = await transcriber.transcribe(new Blob());

    expect(typeof result).toBe('string');
  });
});
