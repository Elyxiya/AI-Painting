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

    // Advance just enough to trigger one tick and let its microtask resolve.
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

  it('handles save failure with full retry exhaustion (v2 behaviour)', async () => {
    mockSave.mockRejectedValue(new Error('Disk full'));

    renderHook(() => useAutoSave({ interval: 60_000 }));

    act(() => {
      useFileStore.getState().markModified();
    });

    // Tick 1: first attempt fails.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(60_000);
    });

    // Retries 1/2/3 with 1s/2s/4s backoff — final attempt trips MAX_RETRIES.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1_000);
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2_000);
    });
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

describe('useAutoSave — retry queue (v2)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockSave.mockReset();
    useFileStore.getState().reset();
    useCanvasStore.getState().reset();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('retries after a transient failure (1s backoff) and then succeeds', async () => {
    mockSave
      .mockRejectedValueOnce(new Error('Disk full'))
      .mockResolvedValueOnce(undefined);

    renderHook(() => useAutoSave({ interval: 60_000 }));

    act(() => {
      useFileStore.getState().markModified();
    });

    // First save fires at the interval tick and fails.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(60_000);
    });
    expect(mockSave).toHaveBeenCalledTimes(1);
    // After the catch, status is back to 'modified' (status gate resumes)
    // and the retry is scheduled for +1s. lastError is recorded.
    expect(useFileStore.getState().saveRetries).toBe(1);
    expect(useFileStore.getState().status).toBe('modified');
    expect(useFileStore.getState().lastError).toBe('Disk full');

    // First retry (1s) succeeds — retry counter resets, status → saved.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1_000);
    });
    expect(mockSave).toHaveBeenCalledTimes(2);
    expect(useFileStore.getState().status).toBe('saved');
    expect(useFileStore.getState().saveRetries).toBe(0);
    expect(useFileStore.getState().lastError).toBeNull();
  });

  it('exhausts 3 retries with backoff 1s/2s/4s and ends in error', async () => {
    mockSave.mockRejectedValue(new Error('Disk full'));

    renderHook(() => useAutoSave({ interval: 60_000 }));

    act(() => {
      useFileStore.getState().markModified();
    });

    // Tick 1: first attempt fails.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(60_000);
    });
    expect(mockSave).toHaveBeenCalledTimes(1);

    // Retry 1 (after 1s).
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1_000);
    });
    expect(mockSave).toHaveBeenCalledTimes(2);

    // Retry 2 (after 2s more).
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2_000);
    });
    expect(mockSave).toHaveBeenCalledTimes(3);

    // Retry 3 (after 4s more) — this one trips the MAX_RETRIES check and
    // surfaces a final error banner.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(4_000);
    });
    expect(mockSave).toHaveBeenCalledTimes(4);
    expect(useFileStore.getState().status).toBe('error');
    expect(useFileStore.getState().lastError).toBe('保存失败，请手动保存');
  });

  it('tracks saveRetries counter and lastError message per attempt', async () => {
    mockSave.mockRejectedValueOnce(new Error('EIO')).mockResolvedValueOnce(undefined);

    renderHook(() => useAutoSave({ interval: 60_000 }));

    act(() => {
      useFileStore.getState().markModified();
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(60_000);
    });
    expect(useFileStore.getState().saveRetries).toBe(1);
    expect(useFileStore.getState().lastError).toBe('EIO');

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1_000);
    });
    // After success, counter and error are cleared.
    expect(useFileStore.getState().saveRetries).toBe(0);
    expect(useFileStore.getState().lastError).toBeNull();
  });

  it('does not schedule additional retries after a successful save', async () => {
    mockSave.mockResolvedValue(undefined);

    renderHook(() => useAutoSave({ interval: 60_000 }));

    act(() => {
      useFileStore.getState().markModified();
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(60_000);
    });
    expect(mockSave).toHaveBeenCalledTimes(1);

    // Advance well past all backoff windows — no extra calls expected.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10_000);
    });
    expect(mockSave).toHaveBeenCalledTimes(1);
  });
});
