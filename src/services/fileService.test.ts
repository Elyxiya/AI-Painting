import { describe, it, expect } from 'vitest';
import {
  serializeProject,
  deserializeProject,
  newProject,
} from './fileService';
import type { ProjectState } from '@/shared/types';

function createMockProject(overrides?: Partial<ProjectState>): ProjectState {
  const project: ProjectState = {
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
          shapeIds: ['shape-1'],
        },
      },
      shapes: {
        'shape-1': {
          id: 'shape-1',
          type: 'rectangle',
          layerId: 'layer-1',
          name: 'Test Rect',
          visible: true,
          locked: false,
          opacity: 1,
          blendMode: 'normal',
          transform: { x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1, skewX: 0, skewY: 0 },
          width: 100,
          height: 100,
          fill: '#FF0000',
        },
      },
      layerOrder: ['layer-1'],
      activeLayerId: 'layer-1',
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
      isExporting: false,
    },
    tool: {
      activeTool: 'select',
      brush: {
        color: '#000000',
        size: 4,
        opacity: 1,
        hardness: 1,
      },
      colors: {
        primary: '#000000',
        secondary: '#ffffff',
        recent: ['#FF0000', '#00FF00'],
      },
      drawing: {
        isDrawing: false,
        startPoint: null,
        currentPoint: null,
        tempPoints: [],
        tempShapeId: null,
      },
    },
    file: {
      currentProject: null,
    },
    ui: {
      language: 'zh-CN',
      theme: 'light',
      sidebar: {
        visible: true,
        width: 250,
        activeTab: 'layers',
      },
    },
  };

  if (overrides) {
    return { ...project, ...overrides };
  }

  return project;
}

function createEmptyProject(): ProjectState {
  return newProject();
}

describe('serializeProject', () => {
  it('generates correct JSON format with version', () => {
    const project = createMockProject();
    const json = serializeProject(project);
    const parsed = JSON.parse(json);

    expect(parsed.version).toBe('1.0');
    expect(parsed.canvas).toBeDefined();
    expect(parsed.canvas.layers).toBeDefined();
    expect(parsed.canvas.shapes).toBeDefined();
    expect(parsed.canvas.viewport).toBeDefined();
    expect(parsed.tool).toBeDefined();
    expect(parsed.ui).toBeDefined();
  });

  it('includes canvas metadata with correct dimensions', () => {
    const project = createMockProject();
    const json = serializeProject(project);
    const parsed = JSON.parse(json);

    expect(parsed.canvas.width).toBe(1920);
    expect(parsed.canvas.height).toBe(1080);
    expect(parsed.canvas.backgroundColor).toBe('#ffffff');
  });

  it('includes all layers in serialization', () => {
    const project = createMockProject();
    const json = serializeProject(project);
    const parsed = JSON.parse(json);

    expect(parsed.canvas.layers).toBeDefined();
    expect(Object.keys(parsed.canvas.layers).length).toBeGreaterThan(0);
  });

  it('includes viewport settings', () => {
    const project = createMockProject();
    const json = serializeProject(project);
    const parsed = JSON.parse(json);

    expect(parsed.canvas.viewport).toBeDefined();
    expect(parsed.canvas.viewport.scale).toBe(1);
    expect(parsed.canvas.viewport.x).toBe(0);
    expect(parsed.canvas.viewport.y).toBe(0);
  });

  it('includes tool state', () => {
    const project = createMockProject();
    const json = serializeProject(project);
    const parsed = JSON.parse(json);

    expect(parsed.tool).toBeDefined();
    expect(parsed.tool.activeTool).toBe('select');
  });

  it('includes ui state', () => {
    const project = createMockProject();
    const json = serializeProject(project);
    const parsed = JSON.parse(json);

    expect(parsed.ui).toBeDefined();
    expect(parsed.ui.language).toBe('zh-CN');
    expect(parsed.ui.theme).toBe('light');
  });

  it('includes metadata with timestamps', () => {
    const project = createMockProject();
    const json = serializeProject(project);
    const parsed = JSON.parse(json);

    expect(parsed.metadata).toBeDefined();
    expect(parsed.metadata.created).toBeDefined();
    expect(parsed.metadata.modified).toBeDefined();
    expect(new Date(parsed.metadata.created)).toBeInstanceOf(Date);
  });

  it('serializes shapes correctly', () => {
    const project = createMockProject();
    const json = serializeProject(project);
    const parsed = JSON.parse(json);

    expect(parsed.canvas.shapes['shape-1']).toBeDefined();
    expect(parsed.canvas.shapes['shape-1'].type).toBe('rectangle');
    expect(parsed.canvas.shapes['shape-1'].fill).toBe('#FF0000');
  });

  it('serializes layerOrder correctly', () => {
    const project = createMockProject();
    const json = serializeProject(project);
    const parsed = JSON.parse(json);

    expect(parsed.canvas.layerOrder).toContain('layer-1');
  });
});

describe('deserializeProject', () => {
  it('correctly parses JSON back to ProjectState', () => {
    const project = createMockProject();
    const json = serializeProject(project);
    const restored = deserializeProject(json);

    expect(restored.canvas.width).toEqual(project.canvas.width);
    expect(restored.canvas.height).toEqual(project.canvas.height);
    expect(restored.canvas.shapes).toEqual(project.canvas.shapes);
    expect(restored.canvas.layers).toEqual(project.canvas.layers);
  });

  it('preserves layer order after deserialization', () => {
    const project = createMockProject();
    const json = serializeProject(project);
    const restored = deserializeProject(json);

    expect(restored.canvas.layerOrder).toEqual(project.canvas.layerOrder);
  });

  it('preserves viewport settings', () => {
    const project = createMockProject();
    const json = serializeProject(project);
    const restored = deserializeProject(json);

    expect(restored.canvas.viewport).toEqual(project.canvas.viewport);
  });

  it('preserves tool state', () => {
    const project = createMockProject();
    const json = serializeProject(project);
    const restored = deserializeProject(json);

    expect(restored.tool.activeTool).toBe(project.tool.activeTool);
    expect(restored.tool.brush).toEqual(project.tool.brush);
  });

  it('preserves ui state', () => {
    const project = createMockProject();
    const json = serializeProject(project);
    const restored = deserializeProject(json);

    expect(restored.ui).toEqual(project.ui);
  });

  it('preserves version information', () => {
    const project = createMockProject({ version: '2.0' });
    const json = serializeProject(project);
    const restored = deserializeProject(json);

    expect(restored.version).toBe('2.0');
  });

  it('handles shapes with complex transforms', () => {
    const project = createMockProject();
    const json = serializeProject(project);
    const restored = deserializeProject(json);

    const shape = restored.canvas.shapes['shape-1'];
    expect(shape?.transform).toBeDefined();
    expect(shape?.transform.scaleX).toBe(1);
    expect(shape?.transform.rotation).toBe(0);
  });
});

describe('newProject', () => {
  it('creates a new project with default canvas size', () => {
    const project = newProject();

    expect(project.canvas.width).toBe(1920);
    expect(project.canvas.height).toBe(1080);
  });

  it('creates a new project with default background color', () => {
    const project = newProject();

    expect(project.canvas.backgroundColor).toBe('#ffffff');
  });

  it('creates a new project with a default layer', () => {
    const project = newProject();

    expect(Object.keys(project.canvas.layers).length).toBe(1);
    const layerId = project.canvas.layerOrder[0];
    expect(project.canvas.layers[layerId as string]).toBeDefined();
  });

  it('creates a new project with empty shapes', () => {
    const project = newProject();

    expect(Object.keys(project.canvas.shapes).length).toBe(0);
  });

  it('creates a new project with default viewport', () => {
    const project = newProject();

    expect(project.canvas.viewport.x).toBe(0);
    expect(project.canvas.viewport.y).toBe(0);
    expect(project.canvas.viewport.scale).toBe(1);
    expect(project.canvas.viewport.rotation).toBe(0);
  });

  it('creates a new project with default tool settings', () => {
    const project = newProject();

    expect(project.tool.activeTool).toBe('select');
    expect(project.tool.brush.color).toBe('#000000');
    expect(project.tool.brush.size).toBe(4);
  });

  it('creates a new project with null currentProject', () => {
    const project = newProject();

    expect(project.file.currentProject).toBeNull();
  });

  it('creates a new project with default ui settings', () => {
    const project = newProject();

    expect(project.ui.language).toBe('zh-CN');
    expect(project.ui.theme).toBe('light');
    expect(project.ui.sidebar.visible).toBe(true);
  });

  it('creates a new project with current version', () => {
    const project = newProject();

    expect(project.version).toBeDefined();
    expect(typeof project.version).toBe('string');
  });
});

describe('empty project serialization', () => {
  it('serializes empty project without error', () => {
    const empty = createEmptyProject();
    expect(() => serializeProject(empty)).not.toThrow();
  });

  it('deserializes empty project without error', () => {
    const empty = createEmptyProject();
    const json = serializeProject(empty);
    expect(() => deserializeProject(json)).not.toThrow();
  });

  it('round-trip preserves empty project structure', () => {
    const empty = createEmptyProject();
    const json = serializeProject(empty);
    const restored = deserializeProject(json);

    expect(restored.canvas.width).toBe(empty.canvas.width);
    expect(restored.canvas.height).toBe(empty.canvas.height);
    expect(Object.keys(restored.canvas.shapes).length).toBe(0);
  });
});

describe('project version compatibility', () => {
  it('parses old version JSON (0.9)', () => {
    const oldJson = JSON.stringify({
      version: '0.9',
      canvas: {
        width: 800,
        height: 600,
        backgroundColor: '#000000',
        layers: {},
        shapes: {},
        layerOrder: [],
        activeLayerId: '',
        selection: { shapeIds: [], bounds: null },
        viewport: { x: 0, y: 0, scale: 1, rotation: 0 },
      },
      tool: { activeTool: 'select', brush: { color: '#000000', size: 4, opacity: 1, hardness: 1 }, colors: { primary: '#000000', secondary: '#ffffff', recent: [] }, drawing: { isDrawing: false, startPoint: null, currentPoint: null, tempPoints: [], tempShapeId: null } },
      file: { currentProject: null },
      ui: { language: 'zh-CN', theme: 'light', sidebar: { visible: true, width: 250, activeTab: 'layers' } },
    });

    const project = deserializeProject(oldJson);
    expect(project.version).toBe('0.9');
  });

  it('parses project without version field (defaults to current)', () => {
    const noVersionJson = JSON.stringify({
      canvas: {
        width: 1024,
        height: 768,
        backgroundColor: '#ffffff',
        layers: {},
        shapes: {},
        layerOrder: [],
        activeLayerId: '',
        selection: { shapeIds: [], bounds: null },
        viewport: { x: 0, y: 0, scale: 1, rotation: 0 },
      },
      tool: { activeTool: 'select', brush: { color: '#000000', size: 4, opacity: 1, hardness: 1 }, colors: { primary: '#000000', secondary: '#ffffff', recent: [] }, drawing: { isDrawing: false, startPoint: null, currentPoint: null, tempPoints: [], tempShapeId: null } },
      file: { currentProject: null },
      ui: { language: 'zh-CN', theme: 'light', sidebar: { visible: true, width: 250, activeTab: 'layers' } },
    });

    const project = deserializeProject(noVersionJson);
    expect(project.version).toBeDefined();
  });

  it('throws error for invalid JSON', () => {
    expect(() => deserializeProject('not valid json')).toThrow();
  });

  it('throws error for missing canvas data', () => {
    const invalidJson = JSON.stringify({
      version: '1.0',
      shapes: [],
    });

    expect(() => deserializeProject(invalidJson)).toThrow('Invalid project file: missing canvas data');
  });
});

describe('round-trip serialization', () => {
  it('preserves complex project data through serialize/deserialize', () => {
    const complexProject: ProjectState = {
      version: '1.0',
      canvas: {
        width: 1920,
        height: 1080,
        backgroundColor: '#ff00ff',
        layers: {
          'layer-a': {
            id: 'layer-a',
            name: 'Alpha Layer',
            visible: true,
            locked: false,
            opacity: 0.8,
            blendMode: 'multiply',
            shapeIds: ['shape-a'],
          },
          'layer-b': {
            id: 'layer-b',
            name: 'Beta Layer',
            visible: false,
            locked: true,
            opacity: 1,
            blendMode: 'normal',
            shapeIds: [],
          },
        },
        shapes: {
          'shape-a': {
            id: 'shape-a',
            type: 'ellipse',
            layerId: 'layer-a',
            name: 'Circle',
            visible: true,
            locked: false,
            opacity: 1,
            blendMode: 'normal',
            transform: { x: 100, y: 200, rotation: 45, scaleX: 2, scaleY: 2, skewX: 0, skewY: 0 },
            radiusX: 50,
            radiusY: 50,
            fill: '#00ff00',
            stroke: '#000000',
            strokeWidth: 2,
          },
        },
        layerOrder: ['layer-a', 'layer-b'],
        activeLayerId: 'layer-a',
        selection: {
          shapeIds: ['shape-a'],
          bounds: { x: 50, y: 150, width: 100, height: 100 },
        },
        viewport: {
          x: 10,
          y: 20,
          scale: 1.5,
          rotation: 0,
        },
        isExporting: false,
      },
      tool: {
        activeTool: 'rectangle',
        brush: {
          color: '#ff0000',
          size: 8,
          opacity: 0.5,
          hardness: 0.8,
        },
        colors: {
          primary: '#ff0000',
          secondary: '#00ff00',
          recent: ['#ff0000', '#00ff00', '#0000ff'],
        },
        drawing: {
          isDrawing: true,
          startPoint: { x: 100, y: 100 },
          currentPoint: { x: 200, y: 200 },
          tempPoints: [100, 100, 150, 150, 200, 200],
          tempShapeId: 'temp-1',
        },
      },
      file: {
        currentProject: null,
      },
      ui: {
        language: 'en-US',
        theme: 'dark',
        sidebar: {
          visible: false,
          width: 300,
          activeTab: 'tools',
        },
      },
    };

    const json = serializeProject(complexProject);
    const restored = deserializeProject(json);

    expect(restored.version).toBe(complexProject.version);
    expect(restored.canvas.width).toBe(complexProject.canvas.width);
    expect(restored.canvas.height).toBe(complexProject.canvas.height);
    expect(restored.canvas.backgroundColor).toBe(complexProject.canvas.backgroundColor);
    expect(Object.keys(restored.canvas.layers)).toEqual(Object.keys(complexProject.canvas.layers));
    expect(Object.keys(restored.canvas.shapes)).toEqual(Object.keys(complexProject.canvas.shapes));
    expect(restored.canvas.layerOrder).toEqual(complexProject.canvas.layerOrder);
    expect(restored.canvas.selection.shapeIds).toEqual(complexProject.canvas.selection.shapeIds);
    expect(restored.canvas.viewport).toEqual(complexProject.canvas.viewport);
    expect(restored.tool.activeTool).toBe(complexProject.tool.activeTool);
    expect(restored.tool.brush.color).toBe(complexProject.tool.brush.color);
    expect(restored.ui.language).toBe(complexProject.ui.language);
    expect(restored.ui.theme).toBe(complexProject.ui.theme);
  });
});
