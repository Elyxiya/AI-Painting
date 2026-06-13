import { create } from 'zustand';
import { type FileStatus, type ProjectFile, type FileState } from '@/shared/types';
import { AUTO_SAVE_INTERVAL } from '@/shared/constants';

interface FileStore extends FileState {
  // File status
  setStatus: (status: FileStatus) => void;

  // Project
  setCurrentProject: (project: ProjectFile | null) => void;

  // Auto-save
  enableAutoSave: () => void;
  disableAutoSave: () => void;
  setAutoSaveInterval: (interval: number) => void;
  updateLastSave: (timestamp: number) => void;

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
};

export const useFileStore = create<FileStore>()((set) => ({
  ...initialState,

  setStatus: (status) => {
    set({ status });
  },

  setCurrentProject: (project) => {
    set({
      currentProject: project,
      status: project ? 'saved' : 'new',
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
    }));
  },

  reset: () => {
    set(initialState);
  },
}));
