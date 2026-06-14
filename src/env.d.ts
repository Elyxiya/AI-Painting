/// <reference types="vite/client" />

interface ElectronAPI {
  getAppVersion: () => Promise<string>;
  getPlatform: () => Promise<string>;
  getAppInfo: () => Promise<{
    version: string;
    platform: string;
    electronVersion: string;
    nodeVersion: string;
  }>;
  onThemeChange: (callback: (theme: string) => void) => () => void;
  window: {
    minimize: () => void;
    maximize: () => void;
    close: () => void;
    getBounds: () => Promise<ElectronRectangle | undefined>;
  };
  file: {
    save: (json: string, filePath?: string) => Promise<string | null>;
    open: (filePath?: string) => Promise<string | null>;
    new: () => Promise<unknown>;
    showOpenDialog: () => Promise<string | null>;
    showSaveDialog: (defaultPath?: string) => Promise<string | null>;
    exportPng: (args: { dataURL: string; format: string; path?: string }) => Promise<string>;
    exportJpeg?: (args: { dataURL: string; format: string; path?: string }) => Promise<string>;
  };
}

interface ElectronRectangle {
  x: number;
  y: number;
  width: number;
  height: number;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

export type { ElectronRectangle };
