import { contextBridge, ipcRenderer } from 'electron';
import { IPC_CHANNELS } from '../src/shared/ipc';

export interface ElectronAPI {
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
    getBounds: () => Promise<Electron.Rectangle | undefined>;
  };
  file: {
    showOpenDialog: () => Promise<string | null>;
    showSaveDialog: (defaultPath?: string) => Promise<string | null>;
    save: (json: string, filePath?: string) => Promise<string | null>;
    open: (filePath?: string) => Promise<string | null>;
    new: () => Promise<unknown>;
  };
}

const electronAPI: ElectronAPI = {
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  getPlatform: () => ipcRenderer.invoke('get-platform'),
  getAppInfo: () => ipcRenderer.invoke('get-app-info'),

  onThemeChange: (callback) => {
    const handler = (_: Electron.IpcRendererEvent, theme: string) => callback(theme);
    ipcRenderer.on('theme-change', handler);
    return () => ipcRenderer.removeListener('theme-change', handler);
  },

  window: {
    minimize: () => ipcRenderer.send(IPC_CHANNELS.WINDOW.MINIMIZE),
    maximize: () => ipcRenderer.send(IPC_CHANNELS.WINDOW.MAXIMIZE),
    close: () => ipcRenderer.send(IPC_CHANNELS.WINDOW.CLOSE),
    getBounds: () => ipcRenderer.invoke(IPC_CHANNELS.WINDOW.GET_BOUNDS),
  },

  file: {
    showOpenDialog: () => ipcRenderer.invoke(IPC_CHANNELS.FILE.SHOW_OPEN_DIALOG),
    showSaveDialog: (defaultPath) => ipcRenderer.invoke(IPC_CHANNELS.FILE.SHOW_SAVE_DIALOG, defaultPath),
    save: (json: string, filePath?: string) => ipcRenderer.invoke('file:save', json, filePath),
    open: (filePath?: string) => ipcRenderer.invoke('file:open', filePath),
    new: () => ipcRenderer.invoke('file:new'),
  },
};

contextBridge.exposeInMainWorld('electronAPI', electronAPI);
