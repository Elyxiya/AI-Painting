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
 * @param pixelRatio - Resolution multiplier (1, 2, 3)
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
 * Triggers a browser download for a data URL
 * @param dataURL - The data URL to download
 * @param filename - The filename to use for the download
 * @returns The filename used
 */
export function downloadDataURL(dataURL: string, filename: string): string {
  const link = document.createElement('a');
  link.href = dataURL;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  return filename;
}

/**
 * Exports the canvas as an image file via browser download
 * @param stage - The Konva Stage instance
 * @param format - Export format (png or jpeg)
 * @param pixelRatio - Resolution multiplier (1, 2, 3)
 * @param filename - Optional filename (defaults to "canvas-{timestamp}.{ext}")
 * @returns The filename used for the download
 */
export function exportImage(
  stage: Stage,
  format: ExportFormat,
  pixelRatio: PixelRatio,
  filename?: string,
): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    try {
      const dataURL = exportToDataURL(stage, format, pixelRatio);
      const extension = format === 'png' ? 'png' : 'jpg';
      const finalFilename = filename ?? `canvas-${Date.now()}.${extension}`;
      const result = downloadDataURL(dataURL, finalFilename);
      resolve(result);
    } catch (err) {
      reject(err instanceof Error ? err : new Error(String(err)));
    }
  });
}
