import { create } from 'zustand';
import type { CanvasState } from '@/shared/types';

const DEFAULT_LIMIT = 50;

export interface HistoryStore {
  past: CanvasState[];
  future: CanvasState[];
  limit: number;

  push: (snapshot: CanvasState) => void;
  undo: () => CanvasState | null;
  redo: () => CanvasState | null;
  clear: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
}

export interface CreateHistoryStoreOptions {
  limit?: number;
}

export function createHistoryStore(options: CreateHistoryStoreOptions = {}) {
  const limit = options.limit ?? DEFAULT_LIMIT;

  return create<HistoryStore>()((set, get) => ({
    past: [],
    future: [],
    limit,

    push: (snapshot) => {
      set((state) => {
        // Shallow clone to break any reference-sharing with the live store.
        const next = [...state.past, structuredClone(snapshot)];
        // Drop the oldest entries once we exceed the configured limit.
        if (next.length > state.limit) {
          next.splice(0, next.length - state.limit);
        }
        return { past: next, future: [] };
      });
    },

    undo: () => {
      const state = get();
      if (state.past.length === 0) {
        return null;
      }
      const last = state.past[state.past.length - 1];
      if (!last) {
        return null;
      }
      set((s) => ({
        past: s.past.slice(0, -1),
        future: [...s.future, last],
      }));
      return last;
    },

    redo: () => {
      const state = get();
      if (state.future.length === 0) {
        return null;
      }
      const last = state.future[state.future.length - 1];
      if (!last) {
        return null;
      }
      set((s) => ({
        past: [...s.past, last],
        future: s.future.slice(0, -1),
      }));
      return last;
    },

    clear: () => {
      set({ past: [], future: [] });
    },

    canUndo: () => get().past.length > 0,
    canRedo: () => get().future.length > 0,
  }));
}

// Default singleton used by the canvas middleware / command executor.
export const useHistoryStore = createHistoryStore();
