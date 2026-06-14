import { useEffect, useRef } from 'react';
import { useFileStore } from '@/stores/file.store';
import { fileService, newProject } from '@/services/fileService';
import { useCanvasStore } from '@/stores/canvas.store';
import { AUTO_SAVE_INTERVAL } from '@/shared/constants';

const RETRY_DELAYS = [1000, 2000, 4000]; // ms, exponential backoff
const MAX_RETRIES = RETRY_DELAYS.length;

interface UseAutoSaveOptions {
  interval?: number;
}

export function useAutoSave({ interval = AUTO_SAVE_INTERVAL }: UseAutoSaveOptions = {}) {
  const intervalRef = useRef(interval);
  intervalRef.current = interval;
  const savingRef = useRef(false);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryCountRef = useRef(0);

  const autoSaveEnabled = useFileStore((s) => s.autoSave.enabled);

  const performSave = async () => {
    if (savingRef.current) return;

    // Only check 'modified' status for the initial save trigger.
    // Subsequent retries always proceed regardless of status.
    if (retryCountRef.current === 0) {
      const currentStatus = useFileStore.getState().status;
      if (currentStatus !== 'modified') return;
    }

    savingRef.current = true;
    useFileStore.getState().setSaving();
    try {
      const canvas = useCanvasStore.getState();
      const file = useFileStore.getState();
      const project = {
        ...newProject(),
        canvas: {
          ...newProject().canvas,
          width: canvas.width,
          height: canvas.height,
          backgroundColor: canvas.backgroundColor,
          layers: canvas.layers,
          shapes: canvas.shapes,
          layerOrder: canvas.layerOrder,
          activeLayerId: canvas.activeLayerId,
          selection: canvas.selection,
          viewport: canvas.viewport,
        },
        file: { currentProject: file.currentProject },
      };
      await fileService.save(project);
      useFileStore.getState().resetSaveRetry();
      useFileStore.getState().setSaved();
      retryCountRef.current = 0;
    } catch (err) {
      if (retryCountRef.current >= MAX_RETRIES) {
        useFileStore.getState().setError();
        useFileStore.getState().setLastError('保存失败，请手动保存');
        return;
      }
      const delay = RETRY_DELAYS[retryCountRef.current] ?? RETRY_DELAYS[RETRY_DELAYS.length - 1];
      retryTimerRef.current = setTimeout(() => {
        performSave();
      }, delay);
      const msg = err instanceof Error ? err.message : '保存失败';
      useFileStore.getState().setLastError(msg);
      retryCountRef.current += 1;
    } finally {
      savingRef.current = false;
    }
  };

  useEffect(() => {
    if (!autoSaveEnabled) return;

    const timer = setInterval(() => {
      retryCountRef.current = 0; // reset retry counter on each interval
      performSave();
    }, intervalRef.current);

    return () => {
      clearInterval(timer);
      if (retryTimerRef.current) {
        clearTimeout(retryTimerRef.current);
        retryTimerRef.current = null;
      }
    };
  }, [autoSaveEnabled]); // eslint-disable-line react-hooks/exhaustive-deps -- performSave is intentionally stable
}
