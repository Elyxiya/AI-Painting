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
    showOpenDialog: () => Promise<string | null>;
    showSaveDialog: (defaultPath?: string) => Promise<string | null>;
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
