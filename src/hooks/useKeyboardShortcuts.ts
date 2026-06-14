import { useEffect } from 'react';

export interface UseKeyboardShortcutsOptions {
  onUndo: () => void;
  onRedo: () => void;
}

const EDITABLE_TAGS = new Set(['INPUT', 'TEXTAREA', 'SELECT']);

/**
 * Wires Ctrl+Z / Ctrl+Y / Ctrl+Shift+Z to undo/redo callbacks at the window
 * level. Inputs and textareas are excluded so the user can still type
 * normally inside them.
 */
export function useKeyboardShortcuts({ onUndo, onRedo }: UseKeyboardShortcutsOptions): void {
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const target = event.target;
      if (target instanceof HTMLElement && EDITABLE_TAGS.has(target.tagName)) {
        return;
      }
      const modifier = event.ctrlKey || event.metaKey;
      if (!modifier) {
        return;
      }
      const key = event.key.toLowerCase();
      if (key === 'z' && !event.shiftKey) {
        event.preventDefault();
        onUndo();
      } else if ((key === 'z' && event.shiftKey) || key === 'y') {
        event.preventDefault();
        onRedo();
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onUndo, onRedo]);
}

export default useKeyboardShortcuts;
