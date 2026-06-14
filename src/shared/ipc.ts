// ═══════════════════════════════════════════════════════════════
// Electron IPC 通道定义
// ═══════════════════════════════════════════════════════════════

export const IPC_CHANNELS = {
  FILE: {
    NEW: 'file:new',
    OPEN: 'file:open',
    SAVE: 'file:save',
    SAVE_AS: 'file:save-as',
    EXPORT_PNG: 'file:export-png',
    SHOW_OPEN_DIALOG: 'file:show-open-dialog',
    SHOW_SAVE_DIALOG: 'file:show-save-dialog',
  },

  PROJECT: {
    LOAD: 'project:load',
    AUTO_SAVE: 'project:auto-save',
    BACKUP: 'project:backup',
    GET_THUMBNAIL: 'project:get-thumbnail',
  },

  WAKE_WORD: {
    START: 'wake-word:start',
    STOP: 'wake-word:stop',
    DETECTED: 'wake-word:detected',
    ERROR: 'wake-word:error',
    STATUS: 'wake-word:status',
  },

  WINDOW: {
    MINIMIZE: 'window:minimize',
    MAXIMIZE: 'window:maximize',
    CLOSE: 'window:close',
    GET_BOUNDS: 'window:get-bounds',
  },

  SYSTEM: {
    GET_APP_INFO: 'system:get-app-info',
    OPEN_EXTERNAL: 'system:open-external',
    SHOW_NOTIFICATION: 'system:show-notification',
  },
} as const;

// ═══════════════════════════════════════════════════════════════
// IPC 请求/响应类型
// ═══════════════════════════════════════════════════════════════

export interface IPCRequest<T = unknown> {
  id: string;
  channel: string;
  payload: T;
  timestamp: number;
}

export interface IPCResponse<T = unknown> {
  id: string;
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
  timestamp: number;
}

export interface AppInfo {
  version: string;
  platform: string;
  electronVersion: string;
  nodeVersion: string;
}
