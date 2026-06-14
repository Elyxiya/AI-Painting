import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fileService } from './fileService';
import type { ProjectState } from '@/shared/types';

function createMockProject(): ProjectState {
  return {
    version: '1.0',
    canvas: {
      width: 1920,
      height: 1080,
      backgroundColor: '#ffffff',
      layers: {
        'layer-1': {
          id: 'layer-1',
          name: 'Background',
          visible: true,
          locked: false,
          opacity: 1,
          blendMode: 'normal',
          shapeIds: [],
        },
      },
      shapes: {},
      layerOrder: ['layer-1'],
      activeLayerId: 'layer-1',
      selection: { shapeIds: [], bounds: null },
      viewport: { x: 0, y: 0, scale: 1, rotation: 0 },
    },
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

const mockSave = vi.fn();
const mockOpen = vi.fn();

function setupElectronAPI() {
  (window as unknown as { electronAPI?: unknown }).electronAPI = {
    file: {
      save: mockSave,
      open: mockOpen,
    },
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  setupElectronAPI();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('fileService.save', () => {
  it('calls electronAPI.file.save with serialized project data', async () => {
    mockSave.mockResolvedValue('/path/to/saved.json');
    const project = createMockProject();

    const result = await fileService.save(project);

    expect(mockSave).toHaveBeenCalledTimes(1);
    const arg = mockSave.mock.calls[0]?.[0] as string;
    expect(arg).toContain('"version": "1.0"');
    expect(result).toBe('/path/to/saved.json');
  });

  it('returns undefined when electronAPI is not available', async () => {
    vi.stubGlobal('window', {});
    const project = createMockProject();
    const result = await fileService.save(project);
    expect(result).toBeUndefined();
  });
});

describe('fileService.load', () => {
  it('returns parsed ProjectState from electronAPI.file.open', async () => {
    const project = createMockProject();
    mockOpen.mockResolvedValue(JSON.stringify(project));

    const loaded = await fileService.load();
    expect(loaded).not.toBeNull();
    expect(loaded?.canvas.width).toBe(1920);
    expect(loaded?.canvas.layerOrder).toEqual(['layer-1']);
  });

  it('returns null when open returns null', async () => {
    mockOpen.mockResolvedValue(null);
    expect(await fileService.load()).toBeNull();
  });

  it('returns null when electronAPI is not available', async () => {
    (window as unknown as { electronAPI?: unknown }).electronAPI = undefined;
    expect(await fileService.load()).toBeNull();
  });
});

describe('fileService round-trip', () => {
  it('save then load returns consistent data', async () => {
    const project = createMockProject();
    let savedJson: string | undefined;
    mockSave.mockImplementation(async (json: string) => {
      savedJson = json;
      return '/path/saved.json';
    });
    mockOpen.mockImplementation(async () => savedJson ?? null);

    await fileService.save(project);
    const loaded = await fileService.load();
    expect(loaded?.canvas.width).toBe(project.canvas.width);
    expect(loaded?.canvas.layerOrder).toEqual(project.canvas.layerOrder);
  });
});
