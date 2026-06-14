import { describe, it, expect, beforeEach, vi } from 'vitest';
import { executeCommand } from './commandExecutor';
import { useCanvasStore } from '@/stores/canvas.store';

describe('executeCommand', () => {
  beforeEach(() => {
    useCanvasStore.getState().reset();
  });

  describe('drawShape', () => {
    it('adds a rectangle shape to the active layer', () => {
      useCanvasStore.getState().addLayer('测试层');

      executeCommand(
        { command: 'drawShape', color: '#FF0000', shapeType: 'rectangle' },
        { canvasStore: useCanvasStore },
      );

      const shapes = Object.values(useCanvasStore.getState().shapes);
      expect(shapes.length).toBe(1);
      expect(shapes[0]?.type).toBe('rectangle');
      expect(shapes[0]?.fill).toBe('#FF0000');
    });

    it('adds an ellipse shape to the active layer', () => {
      executeCommand(
        { command: 'drawShape', color: '#0000FF', shapeType: 'ellipse' },
        { canvasStore: useCanvasStore },
      );

      const shapes = Object.values(useCanvasStore.getState().shapes);
      expect(shapes.length).toBe(1);
      expect(shapes[0]?.type).toBe('ellipse');
    });

    it('adds a line shape to the active layer', () => {
      executeCommand(
        { command: 'drawShape', color: '#00FF00', shapeType: 'line' },
        { canvasStore: useCanvasStore },
      );

      const shapes = Object.values(useCanvasStore.getState().shapes);
      expect(shapes.length).toBe(1);
      expect(shapes[0]?.type).toBe('line');
    });

    it('adds multiple shapes on repeated calls', () => {
      executeCommand(
        { command: 'drawShape', color: '#FF0000', shapeType: 'rectangle' },
        { canvasStore: useCanvasStore },
      );
      executeCommand(
        { command: 'drawShape', color: '#0000FF', shapeType: 'ellipse' },
        { canvasStore: useCanvasStore },
      );

      const shapes = Object.values(useCanvasStore.getState().shapes);
      expect(shapes.length).toBe(2);
    });

    it('assigns shape to the active layer', () => {
      const layerId = useCanvasStore.getState().addLayer('新图层');

      executeCommand(
        { command: 'drawShape', color: '#FF0000', shapeType: 'rectangle' },
        { canvasStore: useCanvasStore },
      );

      const shapes = Object.values(useCanvasStore.getState().shapes);
      expect(shapes[0]?.layerId).toBe(layerId);
    });
  });

  describe('delete', () => {
    it('deletes the selected shape', () => {
      const shapeId = useCanvasStore.getState().addShape({
        type: 'rectangle',
        name: 'r',
        visible: true,
        locked: false,
        opacity: 1,
        blendMode: 'normal',
        transform: {
          x: 0,
          y: 0,
          rotation: 0,
          scaleX: 1,
          scaleY: 1,
          skewX: 0,
          skewY: 0,
        },
        width: 10,
        height: 10,
        fill: '#FF0000',
      });

      useCanvasStore.getState().select([shapeId]);

      executeCommand({ command: 'delete' }, { canvasStore: useCanvasStore });

      expect(useCanvasStore.getState().shapes[shapeId]).toBeUndefined();
    });

    it('does nothing when no shape is selected', () => {
      executeCommand({ command: 'delete' }, { canvasStore: useCanvasStore });

      expect(Object.keys(useCanvasStore.getState().shapes).length).toBe(0);
    });
  });

  describe('clearAll', () => {
    it('removes all shapes from the canvas', () => {
      useCanvasStore.getState().addShape({
        type: 'rectangle',
        name: 'r',
        visible: true,
        locked: false,
        opacity: 1,
        blendMode: 'normal',
        transform: {
          x: 0,
          y: 0,
          rotation: 0,
          scaleX: 1,
          scaleY: 1,
          skewX: 0,
          skewY: 0,
        },
        width: 10,
        height: 10,
        fill: '#FF0000',
      });
      useCanvasStore.getState().addShape({
        type: 'ellipse',
        name: 'e',
        visible: true,
        locked: false,
        opacity: 1,
        blendMode: 'normal',
        transform: {
          x: 0,
          y: 0,
          rotation: 0,
          scaleX: 1,
          scaleY: 1,
          skewX: 0,
          skewY: 0,
        },
        radiusX: 5,
        radiusY: 5,
        fill: '#0000FF',
      });

      executeCommand({ command: 'clearAll' }, { canvasStore: useCanvasStore });

      expect(Object.keys(useCanvasStore.getState().shapes).length).toBe(0);
    });
  });

  describe('undo', () => {
    it('is a no-op when no historyStore is provided', () => {
      expect(() =>
        executeCommand({ command: 'undo' }, { canvasStore: useCanvasStore }),
      ).not.toThrow();
    });

    it('restores the previous canvas state when a historyStore is wired up', () => {
      const fakeHistory = {
        undo: vi.fn(() => null),
        redo: vi.fn(() => null),
        push: vi.fn(),
        canUndo: vi.fn(() => true),
        canRedo: vi.fn(() => false),
      };

      executeCommand(
        { command: 'undo' },
        { canvasStore: { ...useCanvasStore, historyStore: fakeHistory } },
      );

      expect(fakeHistory.undo).toHaveBeenCalledTimes(1);
    });
  });

  describe('redo', () => {
    it('is a no-op when no historyStore is provided', () => {
      expect(() =>
        executeCommand({ command: 'redo' }, { canvasStore: useCanvasStore }),
      ).not.toThrow();
    });

    it('calls historyStore.redo when wired up', () => {
      const fakeHistory = {
        undo: vi.fn(() => null),
        redo: vi.fn(() => null),
        push: vi.fn(),
        canUndo: vi.fn(() => false),
        canRedo: vi.fn(() => true),
      };

      executeCommand(
        { command: 'redo' },
        { canvasStore: { ...useCanvasStore, historyStore: fakeHistory } },
      );

      expect(fakeHistory.redo).toHaveBeenCalledTimes(1);
    });
  });
});
