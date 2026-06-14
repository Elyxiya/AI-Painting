/**
 * Project file service.
 *
 * Provides serialization for ProjectState, an empty-project factory,
 * and an IPC-backed save/load roundtrip via `window.electronAPI.file`.
 */

import type { ProjectState, CanvasState } from '@/shared/types';

const DEFAULT_VERSION = '1.0';

interface FileService {
  save: (state: ProjectState) => Promise<string | null>;
  load: () => Promise<ProjectState | null>;
  serializeProject: (state: ProjectState) => string;
  deserializeProject: (json: string) => ProjectState;
  newProject: () => ProjectState;
}

const DEFAULT_LAYER_ID = 'layer-default';

function createDefaultCanvasState(): CanvasState {
  return {
    width: 1920,
    height: 1080,
    backgroundColor: '#ffffff',
    layers: {
      [DEFAULT_LAYER_ID]: {
        id: DEFAULT_LAYER_ID,
        name: '图层 1',
        visible: true,
        locked: false,
        opacity: 1,
        blendMode: 'normal',
        shapeIds: [],
      },
    },
    shapes: {},
    layerOrder: [DEFAULT_LAYER_ID],
    activeLayerId: DEFAULT_LAYER_ID,
    selection: { shapeIds: [], bounds: null },
    viewport: { x: 0, y: 0, scale: 1, rotation: 0 },
    isExporting: false,
  };
}

export function newProject(): ProjectState {
  return {
    version: DEFAULT_VERSION,
    canvas: createDefaultCanvasState(),
    tool: {
      activeTool: 'select',
      brush: { color: '#000000', size: 4, opacity: 1, hardness: 1 },
      colors: { primary: '#000000', secondary: '#ffffff', recent: [] },
      drawing: {
        isDrawing: false,
        startPoint: null,
        currentPoint: null,
        tempPoints: [],
        tempShapeId: null,
      },
    },
    file: { currentProject: null },
    ui: {
      language: 'zh-CN',
      theme: 'light',
      sidebar: { visible: true, width: 250, activeTab: 'layers' },
    },
  };
}

export function serializeProject(state: ProjectState): string {
  const payload = {
    version: state.version,
    canvas: state.canvas,
    tool: state.tool,
    file: state.file,
    ui: state.ui,
    metadata: {
      created: new Date().toISOString(),
      modified: new Date().toISOString(),
    },
  };
  return JSON.stringify(payload, null, 2);
}

export function deserializeProject(json: string): ProjectState {
  const parsed = JSON.parse(json);
  if (!parsed || typeof parsed !== 'object' || !parsed.canvas) {
    throw new Error('Invalid project file: missing canvas data');
  }
  return {
    version: parsed.version ?? DEFAULT_VERSION,
    canvas: parsed.canvas,
    tool: parsed.tool ?? newProject().tool,
    file: parsed.file ?? { currentProject: null },
    ui: parsed.ui ?? newProject().ui,
  };
}

export const fileService: FileService = {
  serializeProject,
  deserializeProject,
  newProject,

  async save(state: ProjectState): Promise<string | null> {
    const json = serializeProject(state);
    if (typeof window !== 'undefined' && window.electronAPI?.file?.save) {
      return window.electronAPI.file.save(json);
    }
    return null;
  },

  async load(): Promise<ProjectState | null> {
    if (typeof window === 'undefined' || !window.electronAPI?.file?.open) {
      return null;
    }
    const json = await window.electronAPI.file.open();
    if (!json) {
      return null;
    }
    return deserializeProject(json);
  },
};

export type { FileService };
