import type { Stage } from 'konva/lib/Stage';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { exportToDataURL, exportImage } from './exportService';

// Mock electronAPI via stubGlobal
const mockExportPng = vi.fn().mockResolvedValue('/path/to/exported.png');
const mockExportJpeg = vi.fn().mockResolvedValue('/path/to/exported.jpg');

beforeEach(() => {
  vi.stubGlobal('window', {
    electronAPI: {
      file: {
        exportPng: mockExportPng,
        exportJpeg: mockExportJpeg,
      },
    },
  });
});

describe('exportService', () => {
  describe('exportToDataURL', () => {
    it('generates PNG dataURL with correct MIME type', () => {
      const mockStage = {
        toDataURL: vi.fn().mockReturnValue('data:image/png;base64,iVBORw0KGgoAAAANSUhEUg'),
      } as unknown as Stage;

      const result = exportToDataURL(mockStage, 'png', 1);
      expect(result).toMatch(/^data:image\/png/);
      expect(mockStage.toDataURL).toHaveBeenCalledWith({
        pixelRatio: 1,
        mimeType: 'image/png',
      });
    });

    it('generates JPEG dataURL with correct MIME type', () => {
      const mockStage = {
        toDataURL: vi.fn().mockReturnValue('data:image/jpeg;base64,/9j/4AAQSkZJRg'),
      } as unknown as Stage;

      const result = exportToDataURL(mockStage, 'jpeg', 1);
      expect(result).toMatch(/^data:image\/jpeg/);
      expect(mockStage.toDataURL).toHaveBeenCalledWith({
        pixelRatio: 1,
        mimeType: 'image/jpeg',
      });
    });

    it('passes pixelRatio 2 to toDataURL', () => {
      const mockStage = {
        toDataURL: vi.fn().mockReturnValue('data:image/png;base64,xxx'),
      } as unknown as Stage;

      exportToDataURL(mockStage, 'png', 2);
      expect(mockStage.toDataURL).toHaveBeenCalledWith({
        pixelRatio: 2,
        mimeType: 'image/png',
      });
    });

    it('passes pixelRatio 3 to toDataURL', () => {
      const mockStage = {
        toDataURL: vi.fn().mockReturnValue('data:image/png;base64,xxx'),
      } as unknown as Stage;

      exportToDataURL(mockStage, 'png', 3);
      expect(mockStage.toDataURL).toHaveBeenCalledWith({
        pixelRatio: 3,
        mimeType: 'image/png',
      });
    });

    it('returns the dataURL from toDataURL', () => {
      const expectedDataURL = 'data:image/png;base64,ABC123';
      const mockStage = {
        toDataURL: vi.fn().mockReturnValue(expectedDataURL),
      } as unknown as Stage;

      const result = exportToDataURL(mockStage, 'png', 1);
      expect(result).toBe(expectedDataURL);
    });
  });

  describe('exportImage', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('generates dataURL and calls IPC exportPng for PNG format', async () => {
      const mockStage = {
        toDataURL: vi.fn().mockReturnValue('data:image/png;base64,PNG_DATA'),
      } as unknown as Stage;

      const result = await exportImage(mockStage, 'png', 1, '/custom/path.png');

      expect(mockStage.toDataURL).toHaveBeenCalledWith({
        pixelRatio: 1,
        mimeType: 'image/png',
      });
      expect(mockExportPng).toHaveBeenCalledWith({
        dataURL: 'data:image/png;base64,PNG_DATA',
        format: 'png',
        path: '/custom/path.png',
      });
      expect(result).toBe('/path/to/exported.png');
    });

    it('generates dataURL and calls IPC exportPng for JPEG format', async () => {
      mockExportPng.mockResolvedValueOnce('/path/to/exported.jpg');
      const mockStage = {
        toDataURL: vi.fn().mockReturnValue('data:image/jpeg;base64,JPEG_DATA'),
      } as unknown as Stage;

      const result = await exportImage(mockStage, 'jpeg', 2);

      expect(mockStage.toDataURL).toHaveBeenCalledWith({
        pixelRatio: 2,
        mimeType: 'image/jpeg',
      });
      expect(mockExportPng).toHaveBeenCalledWith({
        dataURL: 'data:image/jpeg;base64,JPEG_DATA',
        format: 'jpeg',
        path: undefined,
      });
      expect(result).toBe('/path/to/exported.jpg');
    });

    it('passes pixelRatio 2x correctly', async () => {
      mockExportPng.mockResolvedValueOnce('/path/to/2x.png');
      const mockStage = {
        toDataURL: vi.fn().mockReturnValue('data:image/png;base64,2X'),
      } as unknown as Stage;

      await exportImage(mockStage, 'png', 2);

      expect(mockStage.toDataURL).toHaveBeenCalledWith({
        pixelRatio: 2,
        mimeType: 'image/png',
      });
    });

    it('passes pixelRatio 3x correctly', async () => {
      mockExportPng.mockResolvedValueOnce('/path/to/3x.png');
      const mockStage = {
        toDataURL: vi.fn().mockReturnValue('data:image/png;base64,3X'),
      } as unknown as Stage;

      await exportImage(mockStage, 'png', 3);

      expect(mockStage.toDataURL).toHaveBeenCalledWith({
        pixelRatio: 3,
        mimeType: 'image/png',
      });
    });

    it('returns the saved file path from IPC', async () => {
      mockExportPng.mockResolvedValueOnce('/output/drawing.png');
      const mockStage = {
        toDataURL: vi.fn().mockReturnValue('data:image/png;base64,DATA'),
      } as unknown as Stage;

      const result = await exportImage(mockStage, 'png', 1);
      expect(result).toBe('/output/drawing.png');
    });

    it('works without optional path parameter', async () => {
      mockExportPng.mockResolvedValueOnce('/default/path.png');
      const mockStage = {
        toDataURL: vi.fn().mockReturnValue('data:image/png;base64,DATA'),
      } as unknown as Stage;

      await exportImage(mockStage, 'png', 1);

      expect(mockExportPng).toHaveBeenCalledWith({
        dataURL: 'data:image/png;base64,DATA',
        format: 'png',
        path: undefined,
      });
    });
  });
});
