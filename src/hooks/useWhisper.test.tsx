import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useWhisper } from './useWhisper';
import { useVoiceStore } from '@/stores/voice.store';

// Mock uuid
vi.mock('uuid', () => ({
  v4: vi.fn(() => 'mock-uuid'),
}));

// Mock whisper service
const mockTranscribe = vi.hoisted(() => vi.fn());

vi.mock('@/services/whisper.service', () => ({
  mockTranscriber: {
    transcribe: mockTranscribe,
    engine: 'mock' as const,
  },
  createTranscriber: vi.fn(() => ({
    transcribe: mockTranscribe,
    engine: 'mock' as const,
  })),
  getTranscriberEngine: vi.fn(() => 'mock'),
  initTranscriber: vi.fn(async () => ({
    transcribe: mockTranscribe,
    engine: 'mock' as const,
  })),
  _resetTranscriberCache: vi.fn(),
  default: {
    transcribe: mockTranscribe,
    engine: 'mock' as const,
  },
}));

describe('useWhisper', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useVoiceStore.getState().reset();
  });

  describe('initial state', () => {
    it('should have idle status initially', () => {
      const { result } = renderHook(() => useWhisper());
      expect(result.current.status).toBe('idle');
    });

    it('should have empty transcript', () => {
      const { result } = renderHook(() => useWhisper());
      expect(result.current.interimText).toBe('');
      expect(result.current.finalText).toBe('');
    });

    it('should not be recording initially', () => {
      const { result } = renderHook(() => useWhisper());
      expect(result.current.isRecording).toBe(false);
    });
  });

  describe('recording operations', () => {
    it('startRecording sets status to recording', () => {
      const { result } = renderHook(() => useWhisper());
      act(() => {
        useVoiceStore.getState().startRecording();
      });
      expect(useVoiceStore.getState().transcription.status).toBe('recording');
      expect(result.current.isRecording).toBe(true);
    });

    it('stopRecording sets status to transcribing', () => {
      const { result } = renderHook(() => useWhisper());
      act(() => {
        useVoiceStore.getState().startRecording();
        useVoiceStore.getState().stopRecording();
      });
      expect(useVoiceStore.getState().transcription.status).toBe('transcribing');
      expect(result.current.isRecording).toBe(false);
    });
  });

  describe('transcription', () => {
    it('should set interim text', () => {
      const { result } = renderHook(() => useWhisper());
      act(() => {
        result.current.setInterimText('Hello');
      });
      expect(result.current.interimText).toBe('Hello');
    });

    it('should set final transcript', () => {
      const { result } = renderHook(() => useWhisper());
      act(() => {
        result.current.setTranscript('Final transcript');
      });
      expect(result.current.finalText).toBe('Final transcript');
    });

    it('should clear interim text when setting final text', () => {
      const { result } = renderHook(() => useWhisper());
      act(() => {
        result.current.setInterimText('Hello');
        result.current.setTranscript('Final');
      });
      expect(result.current.interimText).toBe('');
      expect(result.current.finalText).toBe('Final');
    });
  });

  describe('error handling', () => {
    it('should set error status with message', () => {
      const { result } = renderHook(() => useWhisper());
      act(() => {
        result.current.setError('Microphone access denied');
      });
      expect(result.current.status).toBe('error');
    });
  });

  describe('command queue integration', () => {
    it('should add command to queue', () => {
      const { result } = renderHook(() => useWhisper());
      act(() => {
        result.current.addCommand('Draw a rectangle');
      });
      expect(useVoiceStore.getState().commandQueue).toHaveLength(1);
    });

    it('should execute command', () => {
      const { result } = renderHook(() => useWhisper());
      act(() => {
        result.current.addCommand('Draw a circle');
        result.current.executeCommand('mock-uuid');
      });
      expect(useVoiceStore.getState().commandQueue[0]?.status).toBe('executed');
    });
  });

  describe('settings', () => {
    it('should update language', () => {
      const { result } = renderHook(() => useWhisper());
      act(() => {
        result.current.setLanguage('en-US');
      });
      expect(result.current.language).toBe('en-US');
    });

    it('should toggle continuous mode', () => {
      const { result } = renderHook(() => useWhisper());
      expect(result.current.continuousMode).toBe(false);
      act(() => {
        result.current.setContinuousMode(true);
      });
      expect(result.current.continuousMode).toBe(true);
    });
  });

  describe('reset', () => {
    it('should reset state to initial values', () => {
      const { result } = renderHook(() => useWhisper());
      act(() => {
        useVoiceStore.getState().startRecording();
        useVoiceStore.getState().setInterimText('test');
        useVoiceStore.getState().setTranscript('final');
        result.current.reset();
      });
      expect(result.current.status).toBe('idle');
      expect(result.current.interimText).toBe('');
      expect(result.current.finalText).toBe('');
      expect(result.current.isRecording).toBe(false);
    });
  });

  describe('engine + readiness (v2)', () => {
    it('exposes the selected engine after init', async () => {
      const { result } = renderHook(() => useWhisper());
      // Wait for the init promise to resolve.
      await act(async () => {
        await Promise.resolve();
        await Promise.resolve();
      });
      expect(typeof result.current.engine).toBe('string');
      expect(['transformers', 'webspeech', 'mock']).toContain(result.current.engine);
    });

    it('isReady is true after init completes', async () => {
      const { result } = renderHook(() => useWhisper());
      await act(async () => {
        await Promise.resolve();
        await Promise.resolve();
      });
      expect(result.current.isReady).toBe(true);
    });
  });
});
