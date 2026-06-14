import { useEffect, useRef } from 'react';
import { useFileStore } from '@/stores/file.store';
import { fileService, newProject } from '@/services/fileService';
import { useCanvasStore } from '@/stores/canvas.store';
import { AUTO_SAVE_INTERVAL } from '@/shared/constants';

interface UseAutoSaveOptions {
  interval?: number;
}

export function useAutoSave({ interval = AUTO_SAVE_INTERVAL }: UseAutoSaveOptions = {}) {
  const intervalRef = useRef(interval);
  intervalRef.current = interval;
  const savingRef = useRef(false);

  const autoSaveEnabled = useFileStore((s) => s.autoSave.enabled);

  useEffect(() => {
    if (!autoSaveEnabled) return;

    const tick = async () => {
      if (savingRef.current) return;
      const currentStatus = useFileStore.getState().status;
      if (currentStatus !== 'modified') return;

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
        useFileStore.getState().setSaved();
      } catch {
        useFileStore.getState().setError();
      } finally {
        savingRef.current = false;
      }
    };

    const timer = setInterval(tick, intervalRef.current);

    return () => {
      clearInterval(timer);
    };
  }, [autoSaveEnabled]);
}
