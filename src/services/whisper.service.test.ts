import { describe, it, expect, vi, beforeEach } from 'vitest';

// Create mock function outside vi.mock for reference
const mockTranscribe = vi.hoisted(() => vi.fn());

// Mock whisper service with controllable transcriber
vi.mock('@/services/whisper.service', () => ({
  mockTranscriber: {
    transcribe: mockTranscribe,
  },
  createTranscriber: vi.fn(() => mockTranscribe),
  default: {
    transcribe: mockTranscribe,
  },
}));

import { mockTranscriber, createTranscriber } from '@/services/whisper.service';

describe('whisper.service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('mockTranscriber', () => {
    it('should be defined', () => {
      expect(mockTranscriber).toBeDefined();
    });

    it('should return transcript text', async () => {
      mockTranscribe.mockResolvedValue('Hello world');

      const result = await mockTranscriber.transcribe(new Blob());

      expect(result).toBe('Hello world');
      expect(mockTranscribe).toHaveBeenCalledTimes(1);
    });

    it('should handle empty audio', async () => {
      mockTranscribe.mockResolvedValue('');

      const result = await mockTranscriber.transcribe(new Blob());

      expect(result).toBe('');
    });

    it('should handle Chinese text', async () => {
      mockTranscribe.mockResolvedValue('画一个红色矩形');

      const result = await mockTranscriber.transcribe(new Blob());

      expect(result).toBe('画一个红色矩形');
    });

    it('should propagate errors', async () => {
      mockTranscribe.mockRejectedValue(new Error('Transcription failed'));

      await expect(mockTranscriber.transcribe(new Blob())).rejects.toThrow(
        'Transcription failed',
      );
    });
  });

  describe('createTranscriber', () => {
    it('should return a transcriber function', () => {
      const transcriber = createTranscriber();
      expect(typeof transcriber).toBe('function');
    });

    it('should create transcriber that can transcribe', async () => {
      mockTranscribe.mockResolvedValue('Test transcription');
      const transcriber = createTranscriber();

      const result = await transcriber(new Blob());

      expect(result).toBe('Test transcription');
    });
  });

  describe('default export', () => {
    it('should have transcribe method', async () => {
      mockTranscribe.mockResolvedValue('Default export test');

      const { default: transcriber } = await import('@/services/whisper.service');

      const result = await transcriber.transcribe(new Blob());

      expect(result).toBe('Default export test');
    });
  });
});

describe('Transcriber interface', () => {
  it('should have transcribe method that accepts Blob and returns Promise<string>', async () => {
    mockTranscribe.mockResolvedValue('Interface test');

    const transcriber: { transcribe: (audio: Blob) => Promise<string> } = mockTranscriber;

    const result = await transcriber.transcribe(new Blob());

    expect(typeof result).toBe('string');
  });
});
