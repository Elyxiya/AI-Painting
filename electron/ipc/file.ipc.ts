import { ipcMain, dialog, app } from 'electron';
import * as fs from 'node:fs';
import log from 'electron-log/main';

const FILE_EXTENSION = '.aip';

const FILE_CHANNELS = {
  SAVE: 'file:save',
  OPEN: 'file:open',
  NEW: 'file:new',
} as const;

export function registerFileIPC(): void {
  log.info('[FileIPC] Registering file IPC handlers');

  ipcMain.handle(FILE_CHANNELS.SAVE, async (_event, json: string, filePath?: string) => {
    log.info('[FileIPC] Save request received');

    try {
      let targetPath = filePath;

      if (!targetPath) {
        const result = await dialog.showSaveDialog({
          title: 'Save Project',
          defaultPath: `untitled${FILE_EXTENSION}`,
          filters: [
            { name: 'AI-Painting Project', extensions: ['aip'] },
            { name: 'All Files', extensions: ['*'] },
          ],
        });

        if (result.canceled || !result.filePath) {
          log.info('[FileIPC] Save dialog cancelled');
          return null;
        }

        targetPath = result.filePath;
      }

      fs.writeFileSync(targetPath, json, 'utf-8');
      log.info(`[FileIPC] Project saved to: ${targetPath}`);
      return targetPath;
    } catch (error) {
      log.error('[FileIPC] Save error:', error);
      throw error;
    }
  });

  ipcMain.handle(FILE_CHANNELS.OPEN, async (_event, filePath?: string) => {
    log.info('[FileIPC] Open request received');

    try {
      let targetPath = filePath;

      if (!targetPath) {
        const result = await dialog.showOpenDialog({
          title: 'Open Project',
          properties: ['openFile'],
          filters: [
            { name: 'AI-Painting Project', extensions: ['aip'] },
            { name: 'All Files', extensions: ['*'] },
          ],
        });

        if (result.canceled || result.filePaths.length === 0) {
          log.info('[FileIPC] Open dialog cancelled');
          return null;
        }

        targetPath = result.filePaths[0];
      }

      if (!targetPath || !fs.existsSync(targetPath)) {
        log.error(`[FileIPC] File not found: ${targetPath}`);
        throw new Error(`File not found: ${targetPath}`);
      }

      const json = fs.readFileSync(targetPath, 'utf-8');
      log.info(`[FileIPC] Project opened from: ${targetPath}`);
      return json;
    } catch (error) {
      log.error('[FileIPC] Open error:', error);
      throw error;
    }
  });

  ipcMain.handle(FILE_CHANNELS.NEW, async () => {
    log.info('[FileIPC] New project request received');
    return {
      version: app.getVersion() || '1.0.0',
      canvas: {
        width: 1920,
        height: 1080,
        backgroundColor: '#ffffff',
        layers: {},
        shapes: {},
        layerOrder: [],
        activeLayerId: '',
        selection: {
          shapeIds: [],
          bounds: null,
        },
        viewport: {
          x: 0,
          y: 0,
          scale: 1,
          rotation: 0,
        },
      },
      tool: {
        activeTool: 'select',
        brush: {
          color: '#000000',
          size: 4,
          opacity: 1,
          hardness: 1,
        },
        colors: {
          primary: '#000000',
          secondary: '#ffffff',
          recent: [],
        },
        drawing: {
          isDrawing: false,
          startPoint: null,
          currentPoint: null,
          tempPoints: [],
          tempShapeId: null,
        },
      },
      file: {
        currentProject: null,
      },
      ui: {
        language: 'zh-CN',
        theme: 'light',
        sidebar: {
          visible: true,
          width: 250,
          activeTab: 'layers',
        },
      },
    };
  });

  log.info('[FileIPC] File IPC handlers registered successfully');
}
