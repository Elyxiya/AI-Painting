import type { Stage } from 'konva/lib/Stage';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { exportToDataURL, exportImage, downloadDataURL } from './exportService';

// Mock anchor click and document.body to capture download
const mockClick = vi.fn();
const mockCreateElement = vi.fn();
const originalCreateElement = document.createElement.bind(document);
const originalAppendChild = document.body.appendChild.bind(document);
const originalRemoveChild = document.body.removeChild.bind(document);

beforeEach(() => {
  vi.clearAllMocks();
  // Spy on createElement but allow other elements through
  mockCreateElement.mockImplementation((tag: string) => {
    if (tag === 'a') {
      return {
        href: '',
        download: '',
        click: mockClick,
      };
    }
    return originalCreateElement(tag);
  });
  document.createElement = mockCreateElement as unknown as typeof document.createElement;
  document.body.appendChild = vi.fn() as unknown as typeof document.body.appendChild;
  document.body.removeChild = vi.fn() as unknown as typeof document.body.removeChild;
});

afterEach(() => {
  document.createElement = originalCreateElement;
  document.body.appendChild = originalAppendChild;
  document.body.removeChild = originalRemoveChild;
  vi.restoreAllMocks();
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

  describe('downloadDataURL', () => {
    it('creates an anchor with href and download attrs and clicks it', () => {
      const dataURL = 'data:image/png;base64,XYZ';
      const filename = 'test.png';

      const result = downloadDataURL(dataURL, filename);

      expect(mockCreateElement).toHaveBeenCalledWith('a');
      expect(mockClick).toHaveBeenCalled();
      expect(result).toBe(filename);
    });

    it('appends and removes the anchor from the document body', () => {
      downloadDataURL('data:image/png;base64,X', 'file.png');
      expect(document.body.appendChild).toHaveBeenCalled();
      expect(document.body.removeChild).toHaveBeenCalled();
    });
  });

  describe('exportImage', () => {
    it('generates dataURL and triggers download for PNG format', async () => {
      const mockStage = {
        toDataURL: vi.fn().mockReturnValue('data:image/png;base64,PNG_DATA'),
      } as unknown as Stage;

      const result = await exportImage(mockStage, 'png', 1, 'custom.png');

      expect(mockStage.toDataURL).toHaveBeenCalledWith({
        pixelRatio: 1,
        mimeType: 'image/png',
      });
      expect(mockClick).toHaveBeenCalled();
      expect(result).toBe('custom.png');
    });

    it('generates dataURL and triggers download for JPEG format', async () => {
      const mockStage = {
        toDataURL: vi.fn().mockReturnValue('data:image/jpeg;base64,JPEG_DATA'),
      } as unknown as Stage;

      const result = await exportImage(mockStage, 'jpeg', 2, 'photo.jpg');

      expect(mockStage.toDataURL).toHaveBeenCalledWith({
        pixelRatio: 2,
        mimeType: 'image/jpeg',
      });
      expect(result).toBe('photo.jpg');
    });

    it('passes pixelRatio 2x correctly', async () => {
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
      const mockStage = {
        toDataURL: vi.fn().mockReturnValue('data:image/png;base64,3X'),
      } as unknown as Stage;

      await exportImage(mockStage, 'png', 3);
      expect(mockStage.toDataURL).toHaveBeenCalledWith({
        pixelRatio: 3,
        mimeType: 'image/png',
      });
    });

    it('uses default filename with timestamp when none provided', async () => {
      const mockStage = {
        toDataURL: vi.fn().mockReturnValue('data:image/png;base64,DATA'),
      } as unknown as Stage;

      const result = await exportImage(mockStage, 'png', 1);

      expect(result).toMatch(/^canvas-\d+\.png$/);
    });

    it('uses .jpg extension for JPEG format', async () => {
      const mockStage = {
        toDataURL: vi.fn().mockReturnValue('data:image/jpeg;base64,DATA'),
      } as unknown as Stage;

      const result = await exportImage(mockStage, 'jpeg', 1);
      expect(result).toMatch(/^canvas-\d+\.jpg$/);
    });

    it('rejects when download fails', async () => {
      const error = new Error('Download blocked');
      vi.spyOn(document, 'createElement').mockImplementationOnce(() => {
        throw error;
      });

      const mockStage = {
        toDataURL: vi.fn().mockReturnValue('data:image/png;base64,DATA'),
      } as unknown as Stage;

      await expect(exportImage(mockStage, 'png', 1)).rejects.toThrow('Download blocked');
    });
  });
});
