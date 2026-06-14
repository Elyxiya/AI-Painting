import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useKeyboardShortcuts } from './useKeyboardShortcuts';
import { useCanvasStore } from '@/stores/canvas.store';
import { useHistoryStore } from '@/stores/history.store';

describe('useKeyboardShortcuts', () => {
  beforeEach(() => {
    useCanvasStore.getState().reset();
    useHistoryStore.getState().clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('triggers undo on Ctrl+Z', () => {
    const onUndo = vi.fn();
    renderHook(() => useKeyboardShortcuts({ onUndo, onRedo: vi.fn() }));

    const event = new KeyboardEvent('keydown', {
      key: 'z',
      ctrlKey: true,
      bubbles: true,
    });
    window.dispatchEvent(event);

    expect(onUndo).toHaveBeenCalledTimes(1);
  });

  it('triggers undo on Cmd+Z (mac)', () => {
    const onUndo = vi.fn();
    renderHook(() => useKeyboardShortcuts({ onUndo, onRedo: vi.fn() }));

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'z', metaKey: true, bubbles: true }));

    expect(onUndo).toHaveBeenCalledTimes(1);
  });

  it('triggers redo on Ctrl+Y', () => {
    const onRedo = vi.fn();
    renderHook(() => useKeyboardShortcuts({ onUndo: vi.fn(), onRedo }));

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'y', ctrlKey: true, bubbles: true }));

    expect(onRedo).toHaveBeenCalledTimes(1);
  });

  it('triggers redo on Ctrl+Shift+Z', () => {
    const onRedo = vi.fn();
    renderHook(() => useKeyboardShortcuts({ onUndo: vi.fn(), onRedo }));

    window.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'z', ctrlKey: true, shiftKey: true, bubbles: true }),
    );

    expect(onRedo).toHaveBeenCalledTimes(1);
  });

  it('ignores plain Z (no modifier)', () => {
    const onUndo = vi.fn();
    renderHook(() => useKeyboardShortcuts({ onUndo, onRedo: vi.fn() }));

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'z', bubbles: true }));

    expect(onUndo).not.toHaveBeenCalled();
  });

  it('ignores key events from input/textarea elements', () => {
    const onUndo = vi.fn();
    renderHook(() => useKeyboardShortcuts({ onUndo, onRedo: vi.fn() }));

    const input = document.createElement('input');
    document.body.appendChild(input);
    input.focus();
    const event = new KeyboardEvent('keydown', { key: 'z', ctrlKey: true, bubbles: true });
    input.dispatchEvent(event);
    document.body.removeChild(input);

    expect(onUndo).not.toHaveBeenCalled();
  });
});
