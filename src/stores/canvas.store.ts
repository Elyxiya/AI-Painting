import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { v4 as uuid } from 'uuid';
import {
  type CanvasState,
  type Shape,
  type Layer,
  type Viewport,
} from '@/shared/types';
import {
  DEFAULT_CANVAS_WIDTH,
  DEFAULT_CANVAS_HEIGHT,
  DEFAULT_BACKGROUND_COLOR,
} from '@/shared/constants';

const DEFAULT_LAYER_ID = 'layer-default';

function createDefaultLayer(): Layer {
  return {
    id: DEFAULT_LAYER_ID,
    name: '图层 1',
    visible: true,
    locked: false,
    opacity: 1,
    blendMode: 'normal',
    shapeIds: [],
  };
}

function createInitialState(): CanvasState {
  const defaultLayer = createDefaultLayer();
  return {
    width: DEFAULT_CANVAS_WIDTH,
    height: DEFAULT_CANVAS_HEIGHT,
    backgroundColor: DEFAULT_BACKGROUND_COLOR,
    layers: { [DEFAULT_LAYER_ID]: defaultLayer },
    shapes: {},
    layerOrder: [DEFAULT_LAYER_ID],
    selection: {
      shapeIds: [],
      bounds: null,
    },
    viewport: {
      x: 0,
      y: 0,
      scale: 1,
      rotation: 0,
    },
  };
}

interface CanvasStore extends CanvasState {
  // Shape operations
  addShape: (shape: Omit<Shape, 'id'> & { layerId?: string }) => string;
  updateShape: (id: string, updates: Partial<Shape>) => void;
  deleteShape: (id: string) => void;

  // Layer operations
  addLayer: (name?: string) => string;
  updateLayer: (id: string, updates: Partial<Layer>) => void;
  deleteLayer: (id: string) => void;
  reorderLayers: (newOrder: string[]) => void;

  // Selection
  select: (shapeIds: string[]) => void;
  clearSelection: () => void;

  // Viewport
  setViewport: (viewport: Partial<Viewport>) => void;
  setScale: (scale: number) => void;

  // Canvas size
  setCanvasSize: (width: number, height: number) => void;
  setBackgroundColor: (color: string) => void;

  // State management
  loadState: (state: CanvasState) => void;
  reset: () => void;
  getActiveLayerId: () => string;
}

export const useCanvasStore = create<CanvasStore>()(
  immer((set, get) => ({
    ...createInitialState(),

    addShape: (shapeData) => {
      const layerId = shapeData.layerId ?? get().getActiveLayerId();
      const id = uuid();

      set((state) => {
        const shape = { ...shapeData, id, layerId } as Shape;
        state.shapes[id] = shape;
        const layer = state.layers[layerId];
        if (layer) {
          layer.shapeIds.push(id);
        }
      });

      return id;
    },

    updateShape: (id, updates) => {
      set((state) => {
        if (state.shapes[id]) {
          Object.assign(state.shapes[id], updates);
        }
      });
    },

    deleteShape: (id) => {
      const shape = get().shapes[id];
      if (!shape) return;

      set((state) => {
        const layer = state.layers[shape.layerId];
        if (layer) {
          layer.shapeIds = layer.shapeIds.filter((sid: string) => sid !== id);
        }
        delete state.shapes[id];
        state.selection.shapeIds = state.selection.shapeIds.filter(
          (sid: string) => sid !== id,
        );
      });
    },

    addLayer: (name) => {
      const id = uuid();

      set((state) => {
        const layerCount = Object.keys(state.layers).length + 1;
        const layer: Layer = {
          id,
          name: name ?? `图层 ${layerCount}`,
          visible: true,
          locked: false,
          opacity: 1,
          blendMode: 'normal',
          shapeIds: [],
        };
        state.layers[id] = layer;
        state.layerOrder.push(id);
      });

      return id;
    },

    updateLayer: (id, updates) => {
      set((state) => {
        if (state.layers[id]) {
          Object.assign(state.layers[id], updates);
        }
      });
    },

    deleteLayer: (id) => {
      const state = get();
      if (state.layerOrder.length <= 1) return;

      const layer = state.layers[id];
      if (!layer) return;

      set((s) => {
        // Delete all shapes in this layer
        layer.shapeIds.forEach((shapeId) => {
          delete s.shapes[shapeId];
        });
        delete s.layers[id];
        s.layerOrder = s.layerOrder.filter((lid: string) => lid !== id);
        s.selection.shapeIds = s.selection.shapeIds.filter(
          (sid: string) => !layer.shapeIds.includes(sid),
        );
      });
    },

    reorderLayers: (newOrder) => {
      set((state) => {
        state.layerOrder = newOrder;
      });
    },

    select: (shapeIds) => {
      set((state) => {
        state.selection.shapeIds = shapeIds;
      });
    },

    clearSelection: () => {
      set((state) => {
        state.selection.shapeIds = [];
        state.selection.bounds = null;
      });
    },

    setViewport: (viewport) => {
      set((state) => {
        Object.assign(state.viewport, viewport);
      });
    },

    setScale: (scale) => {
      set((state) => {
        state.viewport.scale = Math.max(0.1, Math.min(10, scale));
      });
    },

    setCanvasSize: (width, height) => {
      set((state) => {
        state.width = width;
        state.height = height;
      });
    },

    setBackgroundColor: (color) => {
      set((state) => {
        state.backgroundColor = color;
      });
    },

    loadState: (state) => {
      set(() => state);
    },

    reset: () => {
      set(() => createInitialState());
    },

    getActiveLayerId: () => {
      const { layerOrder, layers } = get();
      // Return the first visible, unlocked layer
      for (const id of layerOrder) {
        const layer = layers[id];
        if (layer && layer.visible && !layer.locked) {
          return id;
        }
      }
      return layerOrder[0] ?? DEFAULT_LAYER_ID;
    },
  })),
);
