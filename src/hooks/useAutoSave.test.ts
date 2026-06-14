import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAutoSave } from './useAutoSave';
import { useFileStore } from '@/stores/file.store';
import { useCanvasStore } from '@/stores/canvas.store';

const mockSave = vi.hoisted(() => vi.fn<() => Promise<void>>());

vi.mock('@/services/fileService', () => ({
  fileService: {
    save: mockSave,
    load: vi.fn(),
  },
  newProject: () => ({
    version: '1.0',
    canvas: {
      width: 1920,
      height: 1080,
      backgroundColor: '#ffffff',
      layers: {},
      shapes: {},
      layerOrder: [],
      activeLayerId: '',
      selection: { shapeIds: [], bounds: null },
      viewport: { x: 0, y: 0, scale: 1, rotation: 0 },
      isExporting: false,
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
      sidebar: { visible: true, width: 250, activeTab: 'layers' as const },
    },
  }),
}));

describe('useAutoSave', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockSave.mockResolvedValue(undefined);
    useFileStore.getState().reset();
    useCanvasStore.getState().reset();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('does not trigger save when status is not modified', () => {
    renderHook(() => useAutoSave({ interval: 60_000 }));
    act(() => {
      vi.advanceTimersByTime(60_000);
    });
    expect(mockSave).not.toHaveBeenCalled();
  });

  it('triggers save after interval when status is modified', () => {
    renderHook(() => useAutoSave({ interval: 60_000 }));

    act(() => {
      useFileStore.getState().markModified();
    });
    expect(useFileStore.getState().status).toBe('modified');

    act(() => {
      vi.advanceTimersByTime(60_000);
    });

    expect(mockSave).toHaveBeenCalledTimes(1);
  });

  it('transitions status: modified → saving → saved', async () => {
    renderHook(() => useAutoSave({ interval: 60_000 }));

    act(() => {
      useFileStore.getState().markModified();
    });
    expect(useFileStore.getState().status).toBe('modified');

    await act(async () => {
      vi.advanceTimersByTime(60_000);
      await Promise.resolve();
    });
    expect(useFileStore.getState().status).toBe('saved');
  });

  it('does not save again if status is already saved', () => {
    renderHook(() => useAutoSave({ interval: 60_000 }));

    act(() => {
      useFileStore.getState().markModified();
    });
    act(() => {
      vi.advanceTimersByTime(60_000);
    });

    act(() => {
      vi.advanceTimersByTime(60_000);
    });

    expect(mockSave).toHaveBeenCalledTimes(1);
  });

  it('does not save when auto-save is disabled', () => {
    renderHook(() => useAutoSave({ interval: 60_000 }));

    act(() => {
      useFileStore.getState().disableAutoSave();
      useFileStore.getState().markModified();
    });

    act(() => {
      vi.advanceTimersByTime(60_000);
    });

    expect(mockSave).not.toHaveBeenCalled();
  });

  it('handles save failure gracefully with retry', async () => {
    mockSave.mockRejectedValue(new Error('Disk full'));

    renderHook(() => useAutoSave({ interval: 60_000 }));

    act(() => {
      useFileStore.getState().markModified();
    });

    // Trigger first save attempt at the interval (60s) — fails and schedules retry.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(60_000);
    });
    // savingRef was reset in the finally block, so the next retry can run.
    // First retry is scheduled at +1s, but the interval also fires again at +60s.
    // Only the retry will run (because savingRef is true initially after interval fires).
    // Run the pending retry (1s delay) so attempt 2 executes.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1_000);
    });
    // Second retry (2s delay) → attempt 3.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2_000);
    });
    // Third retry (4s delay) → attempt 4 → retries 3 >= MAX_RETRIES(3) → error.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(4_000);
    });

    expect(useFileStore.getState().status).toBe('error');
  });

  it('uses custom interval from props', () => {
    renderHook(() => useAutoSave({ interval: 30_000 }));

    act(() => {
      useFileStore.getState().markModified();
    });

    act(() => {
      vi.advanceTimersByTime(29_999);
    });
    expect(mockSave).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(mockSave).toHaveBeenCalledTimes(1);
  });
});
