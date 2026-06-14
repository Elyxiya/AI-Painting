import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { v4 as uuid } from 'uuid';
import type {
  TranscriptionStatus,
  VoiceCommand,
  VoiceState,
} from '@/shared/types';

interface VoiceStore extends VoiceState {
  error: string | undefined;

  setStatus: (status: TranscriptionStatus) => void;
  startRecording: () => void;
  stopRecording: () => void;
  setInterimText: (text: string) => void;
  setTranscript: (text: string) => void;
  setError: (message: string) => void;

  addCommand: (text: string) => string;
  executeCommand: (id: string) => void;
  rejectCommand: (id: string) => void;
  failCommand: (id: string, error: string) => void;
  clearCommands: () => void;
  getPendingCommands: () => VoiceCommand[];

  setLanguage: (language: string) => void;
  setContinuousMode: (enabled: boolean) => void;

  reset: () => void;
}

function createInitialState(): VoiceState {
  return {
    transcription: {
      status: 'idle',
      interimText: '',
      finalText: '',
    },
    commandQueue: [],
    settings: {
      language: 'zh-CN',
      continuousMode: false,
    },
  };
}

export const useVoiceStore = create<VoiceStore>()(
  immer((set, get) => ({
    ...createInitialState(),
    error: undefined,

    setStatus: (status) => {
      set((state) => {
        state.transcription.status = status;
      });
    },

    startRecording: () => {
      set((state) => {
        state.transcription.status = 'recording';
      });
    },

    stopRecording: () => {
      set((state) => {
        state.transcription.status = 'transcribing';
      });
    },

    setInterimText: (text) => {
      set((state) => {
        state.transcription.interimText = text;
      });
    },

    setTranscript: (text) => {
      set((state) => {
        state.transcription.finalText = text;
        state.transcription.interimText = '';
      });
    },

    setError: (message) => {
      set((state) => {
        state.transcription.status = 'error';
        state.error = message;
      });
    },

    addCommand: (text) => {
      const id = uuid();
      const command: VoiceCommand = {
        id,
        text,
        timestamp: Date.now(),
        confidence: 1.0,
        status: 'pending',
      };

      set((state) => {
        state.commandQueue.push(command);
      });

      return id;
    },

    executeCommand: (id) => {
      set((state) => {
        const command = state.commandQueue.find((c) => c.id === id);
        if (command) {
          command.status = 'executed';
        }
      });
    },

    rejectCommand: (id) => {
      set((state) => {
        const command = state.commandQueue.find((c) => c.id === id);
        if (command) {
          command.status = 'rejected';
        }
      });
    },

    failCommand: (id, error) => {
      set((state) => {
        const command = state.commandQueue.find((c) => c.id === id);
        if (command) {
          command.status = 'failed';
          command.error = error;
        }
      });
    },

    clearCommands: () => {
      set((state) => {
        state.commandQueue = [];
      });
    },

    getPendingCommands: () => {
      return get().commandQueue.filter((c) => c.status === 'pending');
    },

    setLanguage: (language) => {
      set((state) => {
        state.settings.language = language;
      });
    },

    setContinuousMode: (enabled) => {
      set((state) => {
        state.settings.continuousMode = enabled;
      });
    },

    reset: () => {
      set(() => ({
        ...createInitialState(),
        error: undefined,
      }));
    },
  })),
);
