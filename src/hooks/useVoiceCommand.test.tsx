import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useVoiceCommand } from './useVoiceCommand';
import { useVoiceStore } from '@/stores/voice.store';
import { useCanvasStore } from '@/stores/canvas.store';

// Mock the executor so we can observe calls without coupling to real store effects.
vi.mock('@/services/commandExecutor', () => ({
  executeCommand: vi.fn(),
}));

import { executeCommand } from '@/services/commandExecutor';

describe('useVoiceCommand', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useVoiceStore.getState().reset();
    useCanvasStore.getState().reset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('does nothing on empty transcript', () => {
    renderHook(() => useVoiceCommand());
    expect(executeCommand).not.toHaveBeenCalled();
  });

  it('parses "画红色矩形" and forwards to executeCommand', async () => {
    renderHook(() => useVoiceCommand());

    act(() => {
      useVoiceStore.getState().setTranscript('画红色矩形');
    });

    // Wait a microtask for the subscription effect to flush
    await act(async () => {
      await Promise.resolve();
    });

    expect(executeCommand).toHaveBeenCalledTimes(1);
    const call = vi.mocked(executeCommand).mock.calls[0];
    expect(call?.[0]).toEqual({
      command: 'drawShape',
      color: '#FF0000',
      shapeType: 'rectangle',
    });
  });

  it('parses "删除" as delete command', async () => {
    renderHook(() => useVoiceCommand());

    act(() => {
      useVoiceStore.getState().setTranscript('删除');
    });

    await act(async () => {
      await Promise.resolve();
    });

    expect(executeCommand).toHaveBeenCalledTimes(1);
    expect(vi.mocked(executeCommand).mock.calls[0]?.[0]).toEqual({ command: 'delete' });
  });

  it('parses "撤销" as undo command (no-op until history store lands)', async () => {
    renderHook(() => useVoiceCommand());

    act(() => {
      useVoiceStore.getState().setTranscript('撤销');
    });

    await act(async () => {
      await Promise.resolve();
    });

    expect(executeCommand).toHaveBeenCalledTimes(1);
    expect(vi.mocked(executeCommand).mock.calls[0]?.[0]).toEqual({ command: 'undo' });
  });

  it('clears the transcript after dispatching a known command', async () => {
    renderHook(() => useVoiceCommand());

    act(() => {
      useVoiceStore.getState().setTranscript('画蓝色矩形');
    });

    await act(async () => {
      await Promise.resolve();
    });

    expect(useVoiceStore.getState().transcription.finalText).toBe('');
  });

  it('leaves transcript untouched for unrecognised input', async () => {
    renderHook(() => useVoiceCommand());

    act(() => {
      useVoiceStore.getState().setTranscript('今天天气真好');
    });

    await act(async () => {
      await Promise.resolve();
    });

    expect(executeCommand).not.toHaveBeenCalled();
    expect(useVoiceStore.getState().transcription.finalText).toBe('今天天气真好');
  });

  it('does not re-dispatch the same transcript twice', async () => {
    renderHook(() => useVoiceCommand());

    act(() => {
      useVoiceStore.getState().setTranscript('画绿色椭圆');
    });
    await act(async () => {
      await Promise.resolve();
    });

    // Second call should not fire because the hook is gated on transcript changes
    act(() => {
      useVoiceStore.getState().setTranscript('画绿色椭圆');
    });
    await act(async () => {
      await Promise.resolve();
    });

    expect(executeCommand).toHaveBeenCalledTimes(1);
  });
});
