import { useCanvasStore } from './canvas.store';
import { useHistoryStore } from './history.store';
import type { CanvasState } from '@/shared/types';

/**
 * Subscribes to the canvas store and pushes a snapshot of the *previous*
 * state to the history store whenever a mutating action runs.
 *
 * Snapshotting is done with `structuredClone` to break any shared references
 * with the live store. Snapshots are taken before the next render via
 * Zustand's `subscribe` callback, which fires synchronously after each
 * mutation.
 *
 * Returns a detacher so the middleware can be torn down in tests.
 */
export function attachCanvasHistory(): () => void {
  let previous = structuredClone(serializeCanvasState(useCanvasStore.getState())) as CanvasState;

  const unsubscribe = useCanvasStore.subscribe((state) => {
    const current = serializeCanvasState(state);
    if (current === previous) {
      return;
    }
    useHistoryStore.getState().push(previous);
    previous = current;
  });

  return () => {
    unsubscribe();
  };
}

/**
 * Strip the function-valued actions off a canvas store snapshot so the
 * history only persists the data, not the action handlers.
 */
function serializeCanvasState(state: ReturnType<typeof useCanvasStore.getState>): CanvasState {
  return {
    width: state.width,
    height: state.height,
    backgroundColor: state.backgroundColor,
    layers: state.layers,
    shapes: state.shapes,
    layerOrder: state.layerOrder,
    activeLayerId: state.activeLayerId,
    selection: state.selection,
    viewport: state.viewport,
  };
}
