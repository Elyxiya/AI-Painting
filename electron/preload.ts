import { contextBridge, ipcRenderer } from 'electron';

export type ElectronAPI = {
  getAppVersion: () => Promise<string>;
  getPlatform: () => Promise<string>;
  onThemeChange: (callback: (theme: string) => void) => void;
};

const electronAPI: ElectronAPI = {
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  getPlatform: () => ipcRenderer.invoke('get-platform'),
  onThemeChange: (callback) => {
    ipcRenderer.on('theme-change', (_event, theme) => callback(theme));
  },
};

contextBridge.exposeInMainWorld('electronAPI', electronAPI);
