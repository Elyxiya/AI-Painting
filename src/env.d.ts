/// <reference types="vite/client" />

interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

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
    getBounds: () => Promise<Rect | undefined>;
  };
  file: {
    showOpenDialog: () => Promise<string | null>;
    showSaveDialog: (defaultPath?: string) => Promise<string | null>;
  };
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

export {};
