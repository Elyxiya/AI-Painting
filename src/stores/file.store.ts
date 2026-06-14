import { create } from 'zustand';
import { type FileStatus, type ProjectFile, type FileState } from '@/shared/types';
import { AUTO_SAVE_INTERVAL } from '@/shared/constants';

interface FileStore extends FileState {
  // File status
  setStatus: (status: FileStatus) => void;
  markModified: () => void;
  setSaving: () => void;
  setError: () => void;
  setSaved: () => void;

  // Project
  setCurrentProject: (project: ProjectFile | null) => void;

  // Auto-save
  enableAutoSave: () => void;
  disableAutoSave: () => void;
  setAutoSaveInterval: (interval: number) => void;
  updateLastSave: (timestamp: number) => void;

  // Retry tracking (v2)
  incrementSaveRetry: () => void;
  resetSaveRetry: () => void;
  setLastError: (message: string | null) => void;

  // Reset
  reset: () => void;
}

const initialState: FileState = {
  status: 'new',
  currentProject: null,
  autoSave: {
    enabled: true,
    interval: AUTO_SAVE_INTERVAL,
    lastSave: null,
  },
  saveRetries: 0,
  lastError: null,
};

export const useFileStore = create<FileStore>()((set) => ({
  ...initialState,

  setStatus: (status) => {
    set({ status });
  },

  markModified: () => {
    set({ status: 'modified' });
  },

  setSaving: () => {
    set({ status: 'saving', lastError: null });
  },

  setError: () => {
    set({ status: 'error' });
  },

  setSaved: () => {
    set((state) => ({
      status: 'saved',
      autoSave: { ...state.autoSave, lastSave: Date.now() },
      saveRetries: 0,
      lastError: null,
    }));
  },

  setCurrentProject: (project) => {
    set({
      currentProject: project,
      status: project ? 'saved' : 'new',
      saveRetries: 0,
      lastError: null,
    });
  },

  enableAutoSave: () => {
    set((state) => ({
      autoSave: { ...state.autoSave, enabled: true },
    }));
  },

  disableAutoSave: () => {
    set((state) => ({
      autoSave: { ...state.autoSave, enabled: false },
    }));
  },

  setAutoSaveInterval: (interval) => {
    set((state) => ({
      autoSave: { ...state.autoSave, interval },
    }));
  },

  updateLastSave: (timestamp) => {
    set((state) => ({
      autoSave: { ...state.autoSave, lastSave: timestamp },
      status: 'saved',
      saveRetries: 0,
      lastError: null,
    }));
  },

  incrementSaveRetry: () => {
    set((state) => ({ saveRetries: state.saveRetries + 1 }));
  },

  resetSaveRetry: () => {
    set({ saveRetries: 0, lastError: null });
  },

  setLastError: (message) => {
    set({ lastError: message });
  },

  reset: () => {
    set(initialState);
  },
}));
