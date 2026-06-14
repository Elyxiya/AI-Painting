import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useVoiceStore } from './voice.store';

vi.mock('uuid', () => ({
  v4: vi.fn(() => 'mock-uuid'),
}));

describe('voiceStore', () => {
  beforeEach(() => {
    useVoiceStore.getState().reset();
  });

  describe('initial state', () => {
    it('should have idle status on reset', () => {
      const state = useVoiceStore.getState();
      expect(state.transcription.status).toBe('idle');
      expect(state.transcription.interimText).toBe('');
      expect(state.transcription.finalText).toBe('');
    });

    it('should have empty commandQueue on reset', () => {
      const state = useVoiceStore.getState();
      expect(state.commandQueue).toEqual([]);
    });

    it('should have default settings', () => {
      const state = useVoiceStore.getState();
      expect(state.settings.language).toBe('zh-CN');
      expect(state.settings.continuousMode).toBe(false);
    });
  });

  describe('status transitions', () => {
    it('should transition from idle to connecting', () => {
      const store = useVoiceStore.getState();
      store.setStatus('connecting');
      expect(useVoiceStore.getState().transcription.status).toBe('connecting');
    });

    it('should transition from connecting to connected', () => {
      const store = useVoiceStore.getState();
      store.setStatus('connecting');
      store.setStatus('connected');
      expect(useVoiceStore.getState().transcription.status).toBe('connected');
    });

    it('should transition from connected to recording', () => {
      const store = useVoiceStore.getState();
      store.setStatus('connected');
      store.startRecording();
      expect(useVoiceStore.getState().transcription.status).toBe('recording');
    });

    it('should transition from recording to transcribing', () => {
      const store = useVoiceStore.getState();
      store.startRecording();
      store.stopRecording();
      expect(useVoiceStore.getState().transcription.status).toBe('transcribing');
    });

    it('should transition to error from any state', () => {
      const store = useVoiceStore.getState();
      store.setStatus('recording');
      store.setError('Microphone access denied');
      expect(useVoiceStore.getState().transcription.status).toBe('error');
    });

    it('should reset to idle after reset()', () => {
      const store = useVoiceStore.getState();
      store.setStatus('recording');
      store.reset();
      expect(useVoiceStore.getState().transcription.status).toBe('idle');
    });
  });

  describe('recording operations', () => {
    it('should start recording', () => {
      const store = useVoiceStore.getState();
      store.startRecording();
      expect(useVoiceStore.getState().transcription.status).toBe('recording');
    });

    it('should stop recording', () => {
      const store = useVoiceStore.getState();
      store.startRecording();
      store.stopRecording();
      expect(useVoiceStore.getState().transcription.status).toBe('transcribing');
    });
  });

  describe('transcription operations', () => {
    it('should set interim text', () => {
      const store = useVoiceStore.getState();
      store.setInterimText('Hello');
      expect(useVoiceStore.getState().transcription.interimText).toBe('Hello');
    });

    it('should set final transcript', () => {
      const store = useVoiceStore.getState();
      store.setTranscript('Final transcript');
      expect(useVoiceStore.getState().transcription.finalText).toBe('Final transcript');
    });

    it('should clear interim text when setting final text', () => {
      const store = useVoiceStore.getState();
      store.setInterimText('Interim text');
      store.setTranscript('Final text');
      expect(useVoiceStore.getState().transcription.interimText).toBe('');
      expect(useVoiceStore.getState().transcription.finalText).toBe('Final text');
    });

    it('should set error with message', () => {
      const store = useVoiceStore.getState();
      store.setError('Test error');
      const state = useVoiceStore.getState();
      expect(state.transcription.status).toBe('error');
      expect(state.error).toBe('Test error');
    });
  });

  describe('command queue operations', () => {
    it('should add command to queue', () => {
      const store = useVoiceStore.getState();
      store.addCommand('Draw a rectangle');
      const cmd = useVoiceStore.getState().commandQueue[0];
      expect(useVoiceStore.getState().commandQueue).toHaveLength(1);
      expect(cmd?.text).toBe('Draw a rectangle');
      expect(cmd?.status).toBe('pending');
    });

    it('should execute pending commands', () => {
      const store = useVoiceStore.getState();
      store.addCommand('Draw a circle');
      store.executeCommand('mock-uuid');
      expect(useVoiceStore.getState().commandQueue[0]?.status).toBe('executed');
    });

    it('should reject a command', () => {
      const store = useVoiceStore.getState();
      store.addCommand('Delete everything');
      store.rejectCommand('mock-uuid');
      expect(useVoiceStore.getState().commandQueue[0]?.status).toBe('rejected');
    });

    it('should mark command as failed', () => {
      const store = useVoiceStore.getState();
      store.addCommand('Complex command');
      store.failCommand('mock-uuid', 'Execution failed');
      const command = useVoiceStore.getState().commandQueue[0];
      expect(command?.status).toBe('failed');
      expect(command?.error).toBe('Execution failed');
    });

    it('should clear all commands', () => {
      const store = useVoiceStore.getState();
      store.addCommand('Command 1');
      store.addCommand('Command 2');
      store.clearCommands();
      expect(useVoiceStore.getState().commandQueue).toHaveLength(0);
    });

    it('should return pending commands only', () => {
      const store = useVoiceStore.getState();
      store.addCommand('Command 1');
      store.addCommand('Command 2');
      store.executeCommand('mock-uuid');
      const pending = store.getPendingCommands();
      expect(pending).toHaveLength(1);
    });
  });

  describe('settings', () => {
    it('should update language setting', () => {
      const store = useVoiceStore.getState();
      store.setLanguage('en-US');
      expect(useVoiceStore.getState().settings.language).toBe('en-US');
    });

    it('should toggle continuous mode', () => {
      const store = useVoiceStore.getState();
      expect(store.settings.continuousMode).toBe(false);
      store.setContinuousMode(true);
      expect(useVoiceStore.getState().settings.continuousMode).toBe(true);
    });
  });

  describe('reset', () => {
    it('should reset all state to initial values', () => {
      const store = useVoiceStore.getState();
      store.setStatus('recording');
      store.setInterimText('test');
      store.setTranscript('final');
      store.addCommand('test command');
      store.reset();

      const state = useVoiceStore.getState();
      expect(state.transcription.status).toBe('idle');
      expect(state.transcription.interimText).toBe('');
      expect(state.transcription.finalText).toBe('');
      expect(state.commandQueue).toEqual([]);
      expect(state.error).toBeUndefined();
    });
  });
});
