/**
 * Export Service - Handles canvas export to PNG/JPEG images
 */

import type { Stage } from 'konva/lib/Stage';

export type ExportFormat = 'png' | 'jpeg';

export type PixelRatio = 1 | 2 | 3;

/**
 * Generates a data URL from a Konva Stage
 * @param stage - The Konva Stage instance
 * @param format - Export format (png or jpeg)
 * @param pixelRatio - Resolution multiplier (1, 2, or 3)
 * @returns data URL string with correct MIME type
 */
export function exportToDataURL(
  stage: Stage,
  format: ExportFormat,
  pixelRatio: PixelRatio,
): string {
  const mimeType = format === 'png' ? 'image/png' : 'image/jpeg';

  return stage.toDataURL({
    pixelRatio,
    mimeType,
  });
}

/**
 * Exports the canvas as an image file via Electron IPC
 * @param stage - The Konva Stage instance
 * @param format - Export format (png or jpeg)
 * @param pixelRatio - Resolution multiplier (1, 2, or 3)
 * @param path - Optional custom save path
 * @returns Promise resolving to the saved file path
 */
export async function exportImage(
  stage: Stage,
  format: ExportFormat,
  pixelRatio: PixelRatio,
  path?: string,
): Promise<string> {
  const dataURL = exportToDataURL(stage, format, pixelRatio);

  const savedPath = await window.electronAPI.file.exportPng({
    dataURL,
    format,
    path,
  });

  return savedPath;
}
