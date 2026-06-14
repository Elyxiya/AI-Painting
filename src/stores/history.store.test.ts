import { describe, it, expect, beforeEach } from 'vitest';
import { createHistoryStore } from './history.store';
import type { CanvasState } from '@/shared/types';

function makeState(): CanvasState {
  return {
    width: 1920,
    height: 1080,
    backgroundColor: '#ffffff',
    layers: {},
    shapes: {},
    layerOrder: [],
    activeLayerId: 'layer-default',
    selection: { shapeIds: [], bounds: null },
    viewport: { x: 0, y: 0, scale: 1, rotation: 0 },
    isExporting: false,
  };
}

describe('historyStore', () => {
  beforeEach(() => {
    // No reset needed; each test makes a fresh store.
  });

  it('starts empty', () => {
    const store = createHistoryStore();
    expect(store.getState().past).toEqual([]);
    expect(store.getState().future).toEqual([]);
  });

  it('push adds a snapshot to past', () => {
    const store = createHistoryStore();
    store.getState().push(makeState());
    expect(store.getState().past).toHaveLength(1);
  });

  it('push clears future (new branch)', () => {
    const store = createHistoryStore();
    store.getState().push(makeState());
    store.getState().push(makeState());
    store.getState().undo();
    expect(store.getState().future).toHaveLength(1);

    store.getState().push(makeState());
    expect(store.getState().future).toEqual([]);
  });

  it('undo moves the top of past onto future and returns the popped state', () => {
    const store = createHistoryStore();
    const s1 = makeState();
    const s2 = makeState();
    store.getState().push(s1);
    store.getState().push(s2);

    const popped = store.getState().undo();
    expect(popped).toEqual(s2);
    expect(store.getState().past).toHaveLength(1);
    expect(store.getState().future).toHaveLength(1);
  });

  it('undo returns null when past is empty', () => {
    const store = createHistoryStore();
    expect(store.getState().undo()).toBeNull();
  });

  it('redo moves the top of future onto past and returns the popped state', () => {
    const store = createHistoryStore();
    const s1 = makeState();
    const s2 = makeState();
    store.getState().push(s1);
    store.getState().push(s2);
    store.getState().undo();

    const popped = store.getState().redo();
    expect(popped).toEqual(s2);
    expect(store.getState().past).toHaveLength(2);
    expect(store.getState().future).toHaveLength(0);
  });

  it('redo returns null when future is empty', () => {
    const store = createHistoryStore();
    expect(store.getState().redo()).toBeNull();
  });

  it('respects a configurable limit on the past stack', () => {
    const store = createHistoryStore({ limit: 3 });
    for (let i = 0; i < 5; i++) {
      store.getState().push(makeState());
    }
    expect(store.getState().past).toHaveLength(3);
  });

  it('clear empties both stacks', () => {
    const store = createHistoryStore();
    store.getState().push(makeState());
    store.getState().push(makeState());
    store.getState().undo();
    store.getState().clear();
    expect(store.getState().past).toEqual([]);
    expect(store.getState().future).toEqual([]);
  });
});
