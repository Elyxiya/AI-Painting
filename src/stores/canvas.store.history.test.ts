import { describe, it, expect, beforeEach } from 'vitest';
import { useCanvasStore } from './canvas.store';
import { useHistoryStore } from './history.store';

// We rely on the actual middleware subscribing to canvas changes.
import { attachCanvasHistory } from './canvas.store.history';

describe('canvas.store.history middleware', () => {
  beforeEach(() => {
    useCanvasStore.getState().reset();
    useHistoryStore.getState().clear();
  });

  it('attaches without throwing', () => {
    const detach = attachCanvasHistory();
    expect(typeof detach).toBe('function');
    detach();
  });

  it('snapshots the canvas state before addShape', () => {
    const detach = attachCanvasHistory();
    try {
      // The middleware already snapshots on subscribe; we don't need to
      // clone the whole state (which contains function actions). Instead,
      // mutate and verify that undo restores the previous state.
      useCanvasStore.getState().addShape({
        type: 'rectangle',
        name: 'r',
        visible: true,
        locked: false,
        opacity: 1,
        blendMode: 'normal',
        transform: { x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1, skewX: 0, skewY: 0 },
        width: 10,
        height: 10,
        fill: '#FF0000',
      });
      expect(useHistoryStore.getState().past).toHaveLength(1);

      const previous = useHistoryStore.getState().undo();
      expect(previous).not.toBeNull();
      expect(Object.keys(previous!.shapes)).toHaveLength(0);
    } finally {
      detach();
    }
  });

  it('snapshots before deleteShape', () => {
    const detach = attachCanvasHistory();
    try {
      const id = useCanvasStore.getState().addShape({
        type: 'rectangle',
        name: 'r',
        visible: true,
        locked: false,
        opacity: 1,
        blendMode: 'normal',
        transform: { x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1, skewX: 0, skewY: 0 },
        width: 10,
        height: 10,
        fill: '#FF0000',
      });
      useHistoryStore.getState().clear();
      useCanvasStore.getState().deleteShape(id);
      expect(useHistoryStore.getState().past).toHaveLength(1);
    } finally {
      detach();
    }
  });

  it('does not snapshot on non-mutating selectors', () => {
    const detach = attachCanvasHistory();
    try {
      // Just reading state should not create history entries.
      void useCanvasStore.getState().shapes;
      expect(useHistoryStore.getState().past).toHaveLength(0);
    } finally {
      detach();
    }
  });

  it('detaching stops the subscription', () => {
    const detach = attachCanvasHistory();
    detach();
    useHistoryStore.getState().clear();
    useCanvasStore.getState().addShape({
      type: 'rectangle',
      name: 'r',
      visible: true,
      locked: false,
      opacity: 1,
      blendMode: 'normal',
      transform: { x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1, skewX: 0, skewY: 0 },
      width: 10,
      height: 10,
      fill: '#FF0000',
    });
    expect(useHistoryStore.getState().past).toHaveLength(0);
  });
});
