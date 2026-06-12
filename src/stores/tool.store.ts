import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  type ToolType,
  type BrushSettings,
  type ToolState,
} from '@/shared/types';
import {
  DEFAULT_BRUSH_COLOR,
  DEFAULT_BRUSH_SIZE,
  DEFAULT_BRUSH_OPACITY,
  MAX_RECENT_COLORS,
} from '@/shared/constants';

interface ToolStore extends ToolState {
  // Tool selection
  setActiveTool: (tool: ToolType) => void;

  // Brush
  setBrushColor: (color: string) => void;
  setBrushSize: (size: number) => void;
  setBrushOpacity: (opacity: number) => void;
  setBrush: (brush: Partial<BrushSettings>) => void;

  // Colors
  setPrimaryColor: (color: string) => void;
  setSecondaryColor: (color: string) => void;
  addRecentColor: (color: string) => void;
  swapColors: () => void;
}

export const useToolStore = create<ToolStore>()(
  persist(
    (set, get) => ({
      activeTool: 'select',

      brush: {
        color: DEFAULT_BRUSH_COLOR,
        size: DEFAULT_BRUSH_SIZE,
        opacity: DEFAULT_BRUSH_OPACITY,
        hardness: 1,
      },

      colors: {
        primary: DEFAULT_BRUSH_COLOR,
        secondary: '#ffffff',
        recent: [],
      },

      setActiveTool: (tool) => {
        set({ activeTool: tool });
      },

      setBrushColor: (color) => {
        set((state) => ({
          brush: { ...state.brush, color },
        }));
      },

      setBrushSize: (size) => {
        set((state) => ({
          brush: { ...state.brush, size: Math.max(1, Math.min(100, size)) },
        }));
      },

      setBrushOpacity: (opacity) => {
        set((state) => ({
          brush: { ...state.brush, opacity: Math.max(0, Math.min(1, opacity)) },
        }));
      },

      setBrush: (brush) => {
        set((state) => ({
          brush: { ...state.brush, ...brush },
        }));
      },

      setPrimaryColor: (color) => {
        set((state) => ({
          colors: { ...state.colors, primary: color },
        }));
        get().addRecentColor(color);
      },

      setSecondaryColor: (color) => {
        set((state) => ({
          colors: { ...state.colors, secondary: color },
        }));
      },

      addRecentColor: (color) => {
        set((state) => {
          const recent = [
            color,
            ...state.colors.recent.filter((c) => c !== color),
          ].slice(0, MAX_RECENT_COLORS);
          return { colors: { ...state.colors, recent } };
        });
      },

      swapColors: () => {
        set((state) => ({
          colors: {
            ...state.colors,
            primary: state.colors.secondary,
            secondary: state.colors.primary,
          },
          brush: {
            ...state.brush,
            color: state.colors.secondary,
          },
        }));
      },
    }),
    {
      name: 'ai-painting-tool',
      partialize: (state) => ({
        activeTool: state.activeTool,
        brush: state.brush,
        colors: {
          primary: state.colors.primary,
          secondary: state.colors.secondary,
          recent: state.colors.recent,
        },
      }),
    },
  ),
);
