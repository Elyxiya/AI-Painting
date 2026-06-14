import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useVoiceCommand } from './useVoiceCommand';
import { useVoiceStore } from '@/stores/voice.store';
import { useCanvasStore } from '@/stores/canvas.store';

// Mock the executor so we can observe calls without coupling to real store effects.
vi.mock('@/services/commandExecutor', () => ({
  executeCommand: vi.fn(),
}));

// Mock the workflow router so we can control routing outcomes per test.
const mockRouteCommand = vi.fn();
vi.mock('@/services/workflow.service', () => ({
  routeCommand: (...args: unknown[]) => mockRouteCommand(...args),
  llmDecisionToCommand: vi.fn(),
  commandToAction: vi.fn(),
  RULE_CONFIDENCE_THRESHOLD: 0.9,
}));

// Mock the LLM service so the singleton can't accidentally hit the network.
vi.mock('@/services/llm.service', () => ({
  llmService: {
    isConfigured: vi.fn(() => false),
    ask: vi.fn(),
    setApiKey: vi.fn(),
  },
}));

import { executeCommand } from '@/services/commandExecutor';
import { llmDecisionToCommand } from '@/services/workflow.service';

const mockedExecute = vi.mocked(executeCommand);
const mockedRoute = mockRouteCommand as unknown as ReturnType<typeof vi.fn>;
const mockedConvert = vi.mocked(llmDecisionToCommand);

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
    expect(mockedExecute).not.toHaveBeenCalled();
  });

  it('routes a transcript through routeCommand and dispatches a rule command', async () => {
    const ruleCommand = { command: 'drawShape', color: '#FF0000', shapeType: 'rectangle' };
    mockedRoute.mockResolvedValueOnce({
      strategy: 'rule',
      confidence: 1.0,
      rawText: '画红色矩形',
      command: ruleCommand,
    });

    renderHook(() => useVoiceCommand());

    act(() => {
      useVoiceStore.getState().setTranscript('画红色矩形');
    });
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(mockedRoute).toHaveBeenCalledWith('画红色矩形');
    expect(mockedExecute).toHaveBeenCalledWith(ruleCommand, expect.objectContaining({ canvasStore: useCanvasStore }));
  });

  it('routes a "delete" transcript to a delete command', async () => {
    mockedRoute.mockResolvedValueOnce({
      strategy: 'rule',
      confidence: 1.0,
      rawText: '删除',
      command: { command: 'delete' },
    });

    renderHook(() => useVoiceCommand());

    act(() => {
      useVoiceStore.getState().setTranscript('删除');
    });
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(mockedExecute).toHaveBeenCalledTimes(1);
    expect(mockedExecute.mock.calls[0]?.[0]).toEqual({ command: 'delete' });
  });

  it('clears the transcript after dispatching a known rule command', async () => {
    mockedRoute.mockResolvedValueOnce({
      strategy: 'rule',
      confidence: 1.0,
      rawText: '画蓝色矩形',
      command: { command: 'drawShape', color: '#0000FF', shapeType: 'rectangle' },
    });

    renderHook(() => useVoiceCommand());

    act(() => {
      useVoiceStore.getState().setTranscript('画蓝色矩形');
    });
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(useVoiceStore.getState().transcription.finalText).toBe('');
  });

  it('leaves transcript untouched for an unrecognised rule miss with no LLM fallback', async () => {
    mockedRoute.mockResolvedValueOnce({
      strategy: 'rule',
      confidence: 0,
      rawText: '今天天气真好',
      command: null,
    });

    renderHook(() => useVoiceCommand());

    act(() => {
      useVoiceStore.getState().setTranscript('今天天气真好');
    });
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(mockedExecute).not.toHaveBeenCalled();
    expect(useVoiceStore.getState().transcription.finalText).toBe('今天天气真好');
  });

  it('does not re-dispatch the same transcript twice', async () => {
    mockedRoute.mockResolvedValue({
      strategy: 'rule',
      confidence: 1.0,
      rawText: '画绿色椭圆',
      command: { command: 'drawShape', color: '#00FF00', shapeType: 'ellipse' },
    });

    renderHook(() => useVoiceCommand());

    act(() => {
      useVoiceStore.getState().setTranscript('画绿色椭圆');
    });
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    // Second call should be a no-op because the hook gates on transcript changes.
    act(() => {
      useVoiceStore.getState().setTranscript('画绿色椭圆');
    });
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(mockedExecute).toHaveBeenCalledTimes(1);
  });

  // ── v2: LLM routing path ──────────────────────────────────────────

  it('routes an LLM decision and dispatches the converted command', async () => {
    const decision = { action: 'drawShape', params: { shapeType: 'ellipse', color: '#FF00FF' } };
    const converted = { command: 'drawShape', color: '#FF00FF', shapeType: 'ellipse' };
    mockedRoute.mockResolvedValueOnce({
      strategy: 'llm',
      confidence: 0.7,
      rawText: 'please draw a magenta ellipse',
      decision,
    });
    mockedConvert.mockReturnValueOnce(converted as never);

    renderHook(() => useVoiceCommand());

    act(() => {
      useVoiceStore.getState().setTranscript('please draw a magenta ellipse');
    });
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(mockedConvert).toHaveBeenCalledWith(decision);
    expect(mockedExecute).toHaveBeenCalledWith(converted, expect.anything());
  });

  it('clears the transcript after a successful LLM-routed command', async () => {
    mockedRoute.mockResolvedValueOnce({
      strategy: 'llm',
      confidence: 0.7,
      rawText: 'undo please',
      decision: { action: 'undo', params: {} },
    });
    mockedConvert.mockReturnValueOnce({ command: 'undo' } as never);

    renderHook(() => useVoiceCommand());

    act(() => {
      useVoiceStore.getState().setTranscript('undo please');
    });
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(useVoiceStore.getState().transcription.finalText).toBe('');
  });

  it('does not clear the transcript when LLM returns an unexecutable action', async () => {
    mockedRoute.mockResolvedValueOnce({
      strategy: 'llm',
      confidence: 0.7,
      rawText: 'something vague',
      decision: { action: 'noop', params: {} },
    });
    mockedConvert.mockReturnValueOnce(null);

    renderHook(() => useVoiceCommand());

    act(() => {
      useVoiceStore.getState().setTranscript('something vague');
    });
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(mockedExecute).not.toHaveBeenCalled();
    expect(useVoiceStore.getState().transcription.finalText).toBe('something vague');
  });
});
