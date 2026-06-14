import { describe, it, expect, beforeEach } from 'vitest';
import { useCanvasStore } from './canvas.store';
import type { RectangleShape } from '@/shared/types';

function makeRect(layerId: string, fill: string): Omit<RectangleShape, 'id'> {
  return {
    type: 'rectangle',
    name: 'r',
    visible: true,
    locked: false,
    opacity: 1,
    blendMode: 'normal',
    transform: { x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1, skewX: 0, skewY: 0 },
    layerId,
    width: 10,
    height: 10,
    fill,
  };
}

describe('canvasStore - layer system', () => {
  beforeEach(() => {
    useCanvasStore.getState().reset();
  });

  describe('addLayer', () => {
    it('creates a new layer with a unique id and default name', () => {
      const id = useCanvasStore.getState().addLayer();
      const layer = useCanvasStore.getState().layers[id];
      expect(layer).toBeDefined();
      expect(layer?.visible).toBe(true);
      expect(layer?.locked).toBe(false);
      expect(layer?.shapeIds).toEqual([]);
    });

    it('appends the new layer to layerOrder', () => {
      const firstId = useCanvasStore.getState().layerOrder[0]!;
      const id = useCanvasStore.getState().addLayer('新图层');
      const order = useCanvasStore.getState().layerOrder;
      expect(order).toContain(firstId);
      expect(order).toContain(id);
      expect(order[order.length - 1]).toBe(id);
    });

    it('uses provided name when supplied', () => {
      const id = useCanvasStore.getState().addLayer('背景层');
      expect(useCanvasStore.getState().layers[id]?.name).toBe('背景层');
    });

    it('generates a unique id for every layer', () => {
      const a = useCanvasStore.getState().addLayer();
      const b = useCanvasStore.getState().addLayer();
      const c = useCanvasStore.getState().addLayer();
      expect(new Set([a, b, c]).size).toBe(3);
    });
  });

  describe('deleteLayer', () => {
    it('removes the layer from layers and layerOrder', () => {
      const id = useCanvasStore.getState().addLayer('临时');
      useCanvasStore.getState().deleteLayer(id);
      expect(useCanvasStore.getState().layers[id]).toBeUndefined();
      expect(useCanvasStore.getState().layerOrder).not.toContain(id);
    });

    it('cascades delete to all shapes in the layer', () => {
      const id = useCanvasStore.getState().addLayer('临时');
      const sid1 = useCanvasStore.getState().addShape(makeRect(id, '#f00'));
      const sid2 = useCanvasStore.getState().addShape(makeRect(id, '#0f0'));

      useCanvasStore.getState().deleteLayer(id);
      expect(useCanvasStore.getState().shapes[sid1]).toBeUndefined();
      expect(useCanvasStore.getState().shapes[sid2]).toBeUndefined();
    });

    it('refuses to delete the last remaining layer', () => {
      const id = useCanvasStore.getState().layerOrder[0]!;
      const beforeOrder = useCanvasStore.getState().layerOrder.length;
      useCanvasStore.getState().deleteLayer(id);
      expect(useCanvasStore.getState().layerOrder.length).toBe(beforeOrder);
    });

    it('removes deleted shapes from selection', () => {
      const id = useCanvasStore.getState().addLayer('临时');
      const sid = useCanvasStore.getState().addShape(makeRect(id, '#f00'));
      useCanvasStore.getState().select([sid]);
      useCanvasStore.getState().deleteLayer(id);
      expect(useCanvasStore.getState().selection.shapeIds).not.toContain(sid);
    });
  });

  describe('updateLayer', () => {
    it('updates mutable layer fields', () => {
      const id = useCanvasStore.getState().addLayer('原名');
      useCanvasStore.getState().updateLayer(id, { name: '新名', opacity: 0.5 });
      const layer = useCanvasStore.getState().layers[id]!;
      expect(layer.name).toBe('新名');
      expect(layer.opacity).toBe(0.5);
    });

    it('is a no-op for an unknown id', () => {
      const before = { ...useCanvasStore.getState().layers };
      useCanvasStore.getState().updateLayer('not-real', { name: 'x' });
      expect(useCanvasStore.getState().layers).toEqual(before);
    });
  });

  describe('reorderLayers', () => {
    it('replaces layerOrder with the supplied order', () => {
      const a = useCanvasStore.getState().addLayer('A');
      const b = useCanvasStore.getState().addLayer('B');
      const c = useCanvasStore.getState().addLayer('C');
      useCanvasStore.getState().reorderLayers([c, b, a]);
      expect(useCanvasStore.getState().layerOrder).toEqual([c, b, a]);
    });
  });

  describe('addShape - layer assignment', () => {
    it('assigns a shape to the explicitly supplied layerId', () => {
      const id = useCanvasStore.getState().addLayer('目标层');
      const sid = useCanvasStore.getState().addShape(makeRect(id, '#f00'));
      const shape = useCanvasStore.getState().shapes[sid]!;
      expect(shape.layerId).toBe(id);
      expect(useCanvasStore.getState().layers[id]?.shapeIds).toContain(sid);
    });

    it('falls back to the active layer when layerId is omitted', () => {
      const id = useCanvasStore.getState().addLayer('默认');
      const sid = useCanvasStore.getState().addShape(
        makeRect(useCanvasStore.getState().activeLayerId, '#f00'),
      );
      const shape = useCanvasStore.getState().shapes[sid]!;
      expect(shape.layerId).toBe(id);
    });
  });

  describe('getActiveLayerId', () => {
    it('returns an existing visible, unlocked layer', () => {
      const id = useCanvasStore.getState().addLayer('可绘层');
      expect(useCanvasStore.getState().getActiveLayerId()).toBe(id);
    });

    it('skips locked layers when choosing the active layer', () => {
      const a = useCanvasStore.getState().addLayer('A');
      const b = useCanvasStore.getState().addLayer('B');
      useCanvasStore.getState().updateLayer(a, { locked: true });
      expect(useCanvasStore.getState().getActiveLayerId()).toBe(b);
    });

    it('skips invisible layers when choosing the active layer', () => {
      const a = useCanvasStore.getState().addLayer('A');
      const b = useCanvasStore.getState().addLayer('B');
      useCanvasStore.getState().updateLayer(a, { visible: false });
      expect(useCanvasStore.getState().getActiveLayerId()).toBe(b);
    });
  });
});
