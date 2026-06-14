import { useEffect, useRef } from 'react';
import { useFileStore } from '@/stores/file.store';
import { fileService, newProject } from '@/services/fileService';
import { useCanvasStore } from '@/stores/canvas.store';
import { AUTO_SAVE_INTERVAL } from '@/shared/constants';

const RETRY_DELAYS_MS = [1000, 2000, 4000] as const;
const MAX_RETRIES = RETRY_DELAYS_MS.length;
const ERROR_BANNER = '保存失败，请手动保存';

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

  const clearRetryTimer = () => {
    if (retryTimerRef.current !== null) {
      clearTimeout(retryTimerRef.current);
      retryTimerRef.current = null;
    }
  };

  const performSave = async () => {
    if (savingRef.current) return;
    // First attempt of a tick: respect the "modified" status gate.
    // Subsequent retries always run regardless of status.
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
      // Success path: clear retry state, mark saved, reset counter.
      retryCountRef.current = 0;
      useFileStore.getState().resetSaveRetry();
      useFileStore.getState().setSaved();
    } catch (err) {
      const msg = err instanceof Error ? err.message : '保存失败';
      useFileStore.getState().setLastError(msg);
      useFileStore.getState().incrementSaveRetry();

      if (retryCountRef.current >= MAX_RETRIES) {
        // Exhausted retries: surface a final error to the user.
        retryCountRef.current = 0;
        useFileStore.getState().setLastError(ERROR_BANNER);
        useFileStore.getState().setError();
        return;
      }

      // Schedule the next attempt with exponential backoff. Roll the
      // status back to 'modified' so the StatusBar surfaces the failure
      // (and the user-visible "已修改" state) until the retry runs.
      useFileStore.getState().setStatus('modified');
      const delay = RETRY_DELAYS_MS[retryCountRef.current] ?? RETRY_DELAYS_MS[RETRY_DELAYS_MS.length - 1];
      retryCountRef.current += 1;
      retryTimerRef.current = setTimeout(() => {
        retryTimerRef.current = null;
        void performSave();
      }, delay);
    } finally {
      savingRef.current = false;
    }
  };

  useEffect(() => {
    if (!autoSaveEnabled) return;

    const timer = setInterval(() => {
      // Reset retry counter at the start of each tick so persistent
      // failures get fresh backoff per interval.
      retryCountRef.current = 0;
      void performSave();
    }, intervalRef.current);

    return () => {
      clearInterval(timer);
      clearRetryTimer();
    };
  }, [autoSaveEnabled]); // eslint-disable-line react-hooks/exhaustive-deps -- performSave is intentionally stable

  return { triggerSave: performSave };
}
