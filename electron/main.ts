import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import log from 'electron-log/main';
import { IPC_CHANNELS } from '../src/shared/ipc';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

process.env.APP_ROOT = path.join(__dirname, '..');
export const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL'];
export const MAIN_DIST = path.join(process.env.APP_ROOT, 'dist-electron');
export const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist');

log.initialize();
log.info('[Main] Application starting...');
log.info(`[Main] Platform: ${process.platform}, Arch: ${process.arch}`);
log.info(`[Main] Electron: ${process.versions.electron}, Node: ${process.versions.node}`);

let mainWindow: BrowserWindow | null = null;

function createWindow() {
  log.info('[Main] Creating main window...');

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 768,
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
      nodeIntegration: false,
      contextIsolation: true,
    },
    show: false,
    backgroundColor: '#1e1e2e',
  });

  mainWindow.once('ready-to-show', () => {
    log.info('[Main] Window ready to show');
    mainWindow?.show();
  });

  mainWindow.on('closed', () => {
    log.info('[Main] Window closed');
    mainWindow = null;
  });

  if (VITE_DEV_SERVER_URL) {
    log.info(`[Main] Loading dev server: ${VITE_DEV_SERVER_URL}`);
    mainWindow.loadURL(VITE_DEV_SERVER_URL);
  } else {
    log.info(`[Main] Loading production build: ${RENDERER_DIST}/index.html`);
    mainWindow.loadFile(path.join(RENDERER_DIST, 'index.html'));
  }
}

function setupIPC() {
  log.info('[Main] Setting up IPC handlers...');

  // App info
  ipcMain.handle('get-app-version', () => app.getVersion());
  ipcMain.handle('get-platform', () => process.platform);
  ipcMain.handle('get-app-info', () => ({
    version: app.getVersion(),
    platform: process.platform,
    electronVersion: process.versions.electron,
    nodeVersion: process.versions.node,
  }));

  // Window controls
  ipcMain.on(IPC_CHANNELS.WINDOW.MINIMIZE, () => {
    mainWindow?.minimize();
  });

  ipcMain.on(IPC_CHANNELS.WINDOW.MAXIMIZE, () => {
    if (mainWindow?.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow?.maximize();
    }
  });

  ipcMain.on(IPC_CHANNELS.WINDOW.CLOSE, () => {
    mainWindow?.close();
  });

  ipcMain.handle(IPC_CHANNELS.WINDOW.GET_BOUNDS, () => {
    return mainWindow?.getBounds();
  });

  // File dialogs
  ipcMain.handle(IPC_CHANNELS.FILE.SHOW_OPEN_DIALOG, async () => {
    if (!mainWindow) return null;
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openFile'],
      filters: [
        { name: 'AI-Painting Project', extensions: ['aip'] },
        { name: 'All Files', extensions: ['*'] },
      ],
    });
    return result.canceled ? null : result.filePaths[0];
  });

  ipcMain.handle(IPC_CHANNELS.FILE.SHOW_SAVE_DIALOG, async (_, defaultPath?: string) => {
    if (!mainWindow) return null;
    const result = await dialog.showSaveDialog(mainWindow, {
      defaultPath,
      filters: [
        { name: 'AI-Painting Project', extensions: ['aip'] },
      ],
    });
    return result.canceled ? null : result.filePath;
  });

  log.info('[Main] IPC handlers registered');
}

app.whenReady().then(() => {
  log.info('[Main] App ready');
  setupIPC();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  log.info('[Main] All windows closed');
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

process.on('uncaughtException', (error) => {
  log.error('[Main] Uncaught exception:', error);
  app.quit();
});

process.on('unhandledRejection', (reason) => {
  log.error('[Main] Unhandled rejection:', reason);
});
