# AI-Painting 数据流与状态管理架构设计

## 目录
1. [状态分片设计](#1-zustand-状态分片设计)
2. [TypeScript 类型定义](#2-typescript-类型定义)
3. [Electron IPC 架构](#3-electron-ipc-架构)
4. [Konva.js 状态同步](#4-konvajs-状态同步)
5. [并发与竞态处理](#5-并发与竞态处理)
6. [错误恢复策略](#6-错误恢复策略)
7. [文件格式设计](#7-json--png-双格式设计)
8. [高优先级改进建议](#8-高优先级改进建议)

---

## 1. Zustand 状态分片设计

### 1.1 推荐分片策略：域驱动分离

```
┌─────────────────────────────────────────────────────────────────┐
│                         Root Store                                │
├─────────────┬─────────────┬─────────────┬─────────────┬─────────┤
│  canvasStore│  toolStore  │ voiceStore  │  fileStore  │  uiStore │
│   (核心)     │   (工具)    │   (语音)    │   (文件)    │  (界面)  │
└─────────────┴─────────────┴─────────────┴─────────────┴─────────┘
```

### 1.2 分片职责

| Store | 职责 | 持久化 | 刷新策略 |
|-------|------|--------|----------|
| `canvasStore` | 图层、形状、选择、变换 | 可选(大文件) | 内存优先 |
| `toolStore` | 当前工具、颜色、粗细 | 必须 | 持久化 |
| `voiceStore` | 唤醒状态、识别结果、对话历史 | 不持久化 | 会话级 |
| `fileStore` | 项目路径、自动保存状态 | 不持久化 | 运行时 |
| `uiStore` | 窗口状态、语言、主题 | 必须 | 持久化 |
| `undoStore` | 历史栈管理 | 不持久化 | 内存级 |

### 1.3 Store 间通信模式

```typescript
// 推荐：使用事件总线解耦
class StoreEventBus {
  private listeners = new Map<string, Set<Function>>();

  emit(event: string, payload: any) {
    this.listeners.get(event)?.forEach(fn => fn(payload));
  }

  on(event: string, callback: Function) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
    return () => this.listeners.get(event)?.delete(callback);
  }
}

export const eventBus = new StoreEventBus();
```

---

## 2. TypeScript 类型定义

### 2.1 核心数据类型

```typescript
// ═══════════════════════════════════════════════════════════════
// 画布相关类型
// ═══════════════════════════════════════════════════════════════

export type ShapeType = 
  | 'rectangle' 
  | 'ellipse' 
  | 'line' 
  | 'path'
  | 'text'
  | 'image'
  | 'group';

export type BlendMode = 
  | 'normal' 
  | 'multiply' 
  | 'screen' 
  | 'overlay'
  | 'darken'
  | 'lighten';

export interface Point {
  x: number;
  y: number;
}

export interface Bounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** 形状基础属性 */
export interface ShapeBase {
  id: string;
  type: ShapeType;
  layerId: string;
  name: string;
  visible: boolean;
  locked: boolean;
  opacity: number;
  blendMode: BlendMode;
  transform: {
    x: number;
    y: number;
    rotation: number;
    scaleX: number;
    scaleY: number;
    skewX: number;
    skewY: number;
  };
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
}

/** 矩形 */
export interface RectangleShape extends ShapeBase {
  type: 'rectangle';
  width: number;
  height: number;
  cornerRadius?: number;
}

/** 椭圆 */
export interface EllipseShape extends ShapeBase {
  type: 'ellipse';
  radiusX: number;
  radiusY: number;
}

/** 线条 */
export interface LineShape extends ShapeBase {
  type: 'line';
  points: number[]; // [x1, y1, x2, y2, ...]
  tension?: number;
  lineCap?: 'butt' | 'round' | 'square';
  lineJoin?: 'miter' | 'round' | 'bevel';
}

/** 自由路径 */
export interface PathShape extends ShapeBase {
  type: 'path';
  data: string; // SVG path data (d attribute)
}

/** 文本 */
export interface TextShape extends ShapeBase {
  type: 'text';
  text: string;
  fontSize: number;
  fontFamily: string;
  fontStyle?: 'normal' | 'italic';
  fontWeight?: 'normal' | 'bold';
  align?: 'left' | 'center' | 'right';
}

/** 图片 */
export interface ImageShape extends ShapeBase {
  type: 'image';
  src: string; // base64 或 file:// URL
  width: number;
  height: number;
}

/** 分组 */
export interface GroupShape extends ShapeBase {
  type: 'group';
  childIds: string[];
}

export type Shape = 
  | RectangleShape 
  | EllipseShape 
  | LineShape 
  | PathShape 
  | TextShape 
  | ImageShape 
  | GroupShape;

/** 图层 */
export interface Layer {
  id: string;
  name: string;
  visible: boolean;
  locked: boolean;
  opacity: number;
  blendMode: BlendMode;
  shapeIds: string[]; // 按绘制顺序排列
  thumbnail?: string; // 缩略图缓存
}

export interface CanvasState {
  width: number;
  height: number;
  backgroundColor: string;
  layers: Record<string, Layer>; // Record for O(1) lookup
  shapes: Record<string, Shape>; // Record for O(1) lookup
  layerOrder: string[]; // 控制渲染顺序
  selection: {
    shapeIds: string[];
    bounds: Bounds | null;
  };
  viewport: {
    x: number;
    y: number;
    scale: number;
    rotation: number;
  };
  guides: {
    horizontal: number[];
    vertical: number[];
  };
}
```

### 2.2 工具状态

```typescript
// ═══════════════════════════════════════════════════════════════
// 工具相关类型
// ═══════════════════════════════════════════════════════════════

export type ToolType = 
  | 'select'
  | 'rectangle'
  | 'ellipse'
  | 'line'
  | 'pen'
  | 'text'
  | 'eraser'
  | 'hand'
  | 'zoom';

export interface ToolState {
  activeTool: ToolType;
  toolSettings: Record<ToolType, ToolSettings>;
  brush: {
    color: string;
    size: number;
    opacity: number;
    hardness: number;
  };
  colors: {
    primary: string;
    secondary: string;
    recent: string[]; // 最近使用的颜色
  };
}

export interface ToolSettings {
  // 选择工具
  select?: {
    multiSelect: boolean;
    snapToGrid: boolean;
  };
  // 矩形工具
  rectangle?: {
    cornerRadius: number;
    fillEnabled: boolean;
    strokeEnabled: boolean;
  };
  // 椭圆工具
  ellipse?: {
    fillEnabled: boolean;
    strokeEnabled: boolean;
  };
  // 画笔工具
  pen?: {
    tension: number;
    lineCap: 'butt' | 'round' | 'square';
    smoothing: number;
  };
  // 橡皮擦
  eraser?: {
    mode: 'erase' | 'cut';
    size: number;
  };
}
```

### 2.3 语音状态

```typescript
// ═══════════════════════════════════════════════════════════════
// 语音相关类型
// ═══════════════════════════════════════════════════════════════

export type WakeWordStatus = 
  | 'idle'
  | 'listening'
  | 'processing'
  | 'error';

export type TranscriptionStatus =
  | 'idle'
  | 'connecting'
  | 'connected'
  | 'recording'
  | 'transcribing'
  | 'error';

export interface VoiceCommand {
  id: string;
  text: string;
  timestamp: number;
  confidence: number;
  status: 'pending' | 'executed' | 'failed' | 'rejected';
  result?: {
    action: string;
    params: Record<string, any>;
  };
  error?: string;
}

export interface ConversationContext {
  sessionId: string;
  recentCommands: VoiceCommand[];
  impliedSubject?: string; // "它" 指的是哪个对象
  activeTool?: ToolType;
}

export interface VoiceState {
  wakeWord: {
    status: WakeWordStatus;
    engine: 'porcupine' | 'fallback';
    sensitivity: number;
  };
  transcription: {
    status: TranscriptionStatus;
    interimText: string;
    finalText: string;
    websocketUrl?: string;
  };
  commandQueue: VoiceCommand[];
  conversation: ConversationContext;
  settings: {
    language: string;
    continuousMode: boolean;
    confidenceThreshold: number;
  };
}
```

### 2.4 文件状态

```typescript
// ═══════════════════════════════════════════════════════════════
// 文件相关类型
// ═══════════════════════════════════════════════════════════════

export type FileStatus = 
  | 'new'
  | 'saved'
  | 'modified'
  | 'saving'
  | 'error';

export interface ProjectFile {
  version: string;
  jsonPath: string;
  thumbnailPath: string;
  metadata: {
    created: string;
    modified: string;
    author?: string;
    canvasWidth: number;
    canvasHeight: number;
  };
}

export interface AutoSaveState {
  enabled: boolean;
  interval: number; // ms
  lastSave: number | null;
  lastSaveSuccess: boolean;
  pendingChanges: boolean;
}

export interface FileState {
  status: FileStatus;
  currentProject: ProjectFile | null;
  autoSave: AutoSaveState;
  recentProjects: ProjectFile[];
  backup: {
    enabled: boolean;
    maxBackups: number;
    versions: string[];
  };
}
```

### 2.5 工作流代理状态

```typescript
// ═══════════════════════════════════════════════════════════════
// Workflow Agent 类型
// ═══════════════════════════════════════════════════════════════

export type RoutingStrategy = 'rule' | 'confidence' | 'llm';

export interface RuleMatch {
  ruleId: string;
  pattern: RegExp | string;
  action: string;
  confidence: number;
  params?: Record<string, any>;
}

export interface LLMDecision {
  action: string;
  params: Record<string, any>;
  reasoning: string;
  confidence: number;
}

export interface WorkflowResult {
  strategy: RoutingStrategy;
  action: string;
  params: Record<string, any>;
  confidence: number;
  executed: boolean;
  executionTime: number;
}

export interface WorkflowState {
  isProcessing: boolean;
  currentCommand: VoiceCommand | null;
  result: WorkflowResult | null;
  rules: RuleMatch[];
  lastLLMResponse: LLMDecision | null;
  settings: {
    ruleFirst: boolean;
    confidenceThreshold: number;
    llmModel: string;
    timeout: number;
  };
}
```

### 2.6 完整的项目状态

```typescript
// ═══════════════════════════════════════════════════════════════
// 完整项目状态（用于持久化）
// ═══════════════════════════════════════════════════════════════

export interface ProjectState {
  version: string;
  canvas: CanvasState;
  tool: ToolState;
  file: {
    currentProject: ProjectFile | null;
    recentProjects: ProjectFile[];
  };
  ui: UIState;
}

export interface UIState {
  language: 'zh-CN' | 'en-US';
  theme: 'light' | 'dark' | 'system';
  sidebar: {
    visible: boolean;
    width: number;
    activeTab: 'layers' | 'tools' | 'properties';
  };
  panels: {
    layerList: boolean;
    colorPicker: boolean;
    toolOptions: boolean;
  };
  window: {
    width: number;
    height: number;
    x: number;
    y: number;
    isMaximized: boolean;
  };
}

// ═══════════════════════════════════════════════════════════════
// Undo/Redo 历史管理
// ═══════════════════════════════════════════════════════════════

export interface HistoryEntry {
  id: string;
  timestamp: number;
  description: string;
  patches: Patch[]; //immer patch
  inversePatches: Patch[];
}

export interface UndoState {
  canUndo: boolean;
  canRedo: boolean;
  undoStack: HistoryEntry[];
  redoStack: HistoryEntry[];
  maxHistory: number;
}
```

---

## 3. Electron IPC 架构

### 3.1 进程职责分配

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           MAIN PROCESS                                   │
├─────────────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌─────────────┐ │
│  │   File I/O   │  │   Ollama     │  │   Porcupine  │  │   Window    │ │
│  │   Manager    │  │   HTTP       │  │   (WASM)     │  │   Manager   │ │
│  └──────────────┘  └──────────────┘  └──────────────┘  └─────────────┘ │
│          │                │                │                  │         │
│          └────────────────┴────────────────┴──────────────────┘         │
│                                    │                                      │
│                            ┌───────┴───────┐                              │
│                            │  IPC Handler  │                              │
│                            └───────┬───────┘                              │
└────────────────────────────────────┼─────────────────────────────────────┘
                                     │ contextBridge
┌────────────────────────────────────┼─────────────────────────────────────┐
│                           RENDERER PROCESS                                │
├────────────────────────────────────┼─────────────────────────────────────┤
│                            ┌───────┴───────┐                              │
│                            │  Preload API  │                              │
│                            └───────┬───────┘                              │
│                                    │                                      │
│  ┌─────────────────────────────────┼───────────────────────────────┐     │
│  │                           Store Layer                            │     │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐  │     │
│  │  │ canvas  │ │  tool   │ │  voice  │ │  file   │ │   ui    │  │     │
│  │  │ Store   │ │ Store   │ │ Store   │ │ Store   │ │ Store   │  │     │
│  │  └─────────┘ └─────────┘ └─────────┘ └─────────┘ └─────────┘  │     │
│  └─────────────────────────────────┬───────────────────────────────┘     │
│                                    │                                      │
│  ┌─────────────────────────────────┼───────────────────────────────┐     │
│  │                       Service Layer                              │     │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐       │     │
│  │  │ Konva    │  │ Whisper  │  │ Workflow │  │  Undo    │       │     │
│  │  │ Renderer │  │ WebSocket│  │  Agent   │  │ Manager  │       │     │
│  │  └──────────┘  └──────────┘  └──────────┘  └──────────┘       │     │
│  └─────────────────────────────────┬───────────────────────────────┘     │
└────────────────────────────────────┼─────────────────────────────────────┘
                                     │
┌────────────────────────────────────┼─────────────────────────────────────┐
│                         RENDERER PROCESS (Preview)                       │
│  (用于处理重计算，避免主渲染进程卡顿)                                       │
└────────────────────────────────────┴─────────────────────────────────────┘
```

### 3.2 IPC 通道定义

```typescript
// ═══════════════════════════════════════════════════════════════
// IPC Channel Types
// ═══════════════════════════════════════════════════════════════

export const IPC_CHANNELS = {
  // 文件操作
  FILE: {
    NEW: 'file:new',
    OPEN: 'file:open',
    SAVE: 'file:save',
    SAVE_AS: 'file:save-as',
    EXPORT_PNG: 'file:export-png',
    GET_RECENT: 'file:get-recent',
    SHOW_OPEN_DIALOG: 'file:show-open-dialog',
    SHOW_SAVE_DIALOG: 'file:show-save-dialog',
  },

  // 项目数据
  PROJECT: {
    LOAD: 'project:load',
    AUTO_SAVE: 'project:auto-save',
    BACKUP: 'project:backup',
    GET_THUMBNAIL: 'project:get-thumbnail',
  },

  // Ollama LLM
  LLM: {
    COMPLETE: 'llm:complete',
    ABORT: 'llm:abort',
    GET_MODELS: 'llm:get-models',
    CHECK_STATUS: 'llm:check-status',
  },

  // Porcupine 唤醒词
  WAKE_WORD: {
    START: 'wake-word:start',
    STOP: 'wake-word:stop',
    DETECTED: 'wake-word:detected',
    ERROR: 'wake-word:error',
  },

  // 窗口管理
  WINDOW: {
    MINIMIZE: 'window:minimize',
    MAXIMIZE: 'window:maximize',
    CLOSE: 'window:close',
    SET_ALWAYS_ON_TOP: 'window:set-always-on-top',
    GET_BOUNDS: 'window:get-bounds',
  },

  // 系统
  SYSTEM: {
    GET_APP_INFO: 'system:get-app-info',
    OPEN_EXTERNAL: 'system:open-external',
    SHOW_NOTIFICATION: 'system:show-notification',
  },

  // 多窗口同步
  SYNC: {
    STATE_CHANGED: 'sync:state-changed',
    REQUEST_STATE: 'sync:request-state',
    BROADCAST: 'sync:broadcast',
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
    stack?: string;
  };
  timestamp: number;
}

// 具体通道的数据类型

// LLM 请求
export interface LLMCompleteRequest {
  prompt: string;
  context?: Record<string, any>;
  stream?: boolean;
}

export interface LLMCompleteResponse {
  text: string;
  reasoning?: string;
  tokens: number;
  model: string;
}

// 文件操作
export interface FileSaveRequest {
  projectPath: string;
  state: ProjectState;
  thumbnail: string; // base64
}

export interface FileOpenResponse {
  projectPath: string;
  state: ProjectState;
  thumbnail: string;
}

// 多窗口同步
export interface SyncStatePayload {
  sourceWindowId: string;
  storeName: string;
  patch: any; // immer patch
  timestamp: number;
}
```

### 3.3 Preload API 设计

```typescript
// ═══════════════════════════════════════════════════════════════
// Preload API - 安全暴露给渲染进程
// ═══════════════════════════════════════════════════════════════

// preload/index.ts
import { contextBridge, ipcRenderer } from 'electron';
import { IPC_CHANNELS, type IPCRequest, type IPCResponse } from '../types/ipc';

class ElectronAPI {
  private requestCounter = 0;

  private async request<TRequest, TResponse>(
    channel: string, 
    payload: TRequest
  ): Promise<TResponse> {
    const id = `req-${++this.requestCounter}-${Date.now()}`;
    const request: IPCRequest<TRequest> = {
      id,
      channel,
      payload,
      timestamp: Date.now(),
    };

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`IPC request timeout: ${channel}`));
      }, 30000);

      ipcRenderer.once(`response:${id}`, (_event, response: IPCResponse<TResponse>) => {
        clearTimeout(timeout);
        if (response.success && response.data !== undefined) {
          resolve(response.data);
        } else {
          reject(new Error(response.error?.message ?? 'Unknown error'));
        }
      });

      ipcRenderer.send(channel, request);
    });
  }

  // 文件操作
  file = {
    new: () => this.request(IPC_CHANNELS.FILE.NEW, null),
    open: (path: string) => this.request(IPC_CHANNELS.FILE.OPEN, { path }),
    save: (state: ProjectState, thumbnail: string) => 
      this.request(IPC_CHANNELS.FILE.SAVE, { state, thumbnail }),
    saveAs: (state: ProjectState, thumbnail: string) =>
      this.request(IPC_CHANNELS.FILE.SAVE_AS, { state, thumbnail }),
    exportPNG: (options: { width: number; height: number; dataUrl: string }) =>
      this.request(IPC_CHANNELS.FILE.EXPORT_PNG, options),
    showOpenDialog: () => 
      this.request(IPC_CHANNELS.FILE.SHOW_OPEN_DIALOG, null),
    showSaveDialog: (defaultPath?: string) =>
      this.request(IPC_CHANNELS.FILE.SHOW_SAVE_DIALOG, { defaultPath }),
  };

  // LLM 操作
  llm = {
    complete: (prompt: string, context?: Record<string, any>) =>
      this.request(IPC_CHANNELS.LLM.COMPLETE, { prompt, context }),
    abort: () => ipcRenderer.send(IPC_CHANNELS.LLM.ABORT),
    getModels: () => this.request(IPC_CHANNELS.LLM.GET_MODELS, null),
    checkStatus: () => this.request(IPC_CHANNELS.LLM.CHECK_STATUS, null),
    onStream: (callback: (chunk: string) => void) => {
      const handler = (_event: Electron.IpcRendererEvent, chunk: string) => callback(chunk);
      ipcRenderer.on('llm:stream', handler);
      return () => ipcRenderer.removeListener('llm:stream', handler);
    },
  };

  // 唤醒词
  wakeWord = {
    start: () => ipcRenderer.send(IPC_CHANNELS.WAKE_WORD.START),
    stop: () => ipcRenderer.send(IPC_CHANNELS.WAKE_WORD.STOP),
    onDetected: (callback: () => void) => {
      const handler = () => callback();
      ipcRenderer.on(IPC_CHANNELS.WAKE_WORD.DETECTED, handler);
      return () => ipcRenderer.removeListener(IPC_CHANNELS.WAKE_WORD.DETECTED, handler);
    },
    onError: (callback: (error: string) => void) => {
      const handler = (_event: Electron.IpcRendererEvent, error: string) => callback(error);
      ipcRenderer.on(IPC_CHANNELS.WAKE_WORD.ERROR, handler);
      return () => ipcRenderer.removeListener(IPC_CHANNELS.WAKE_WORD.ERROR, handler);
    },
  };

  // 多窗口同步
  sync = {
    broadcastStateChange: (storeName: string, patch: any) =>
      ipcRenderer.send(IPC_CHANNELS.SYNC.STATE_CHANGED, { storeName, patch }),
    onStateChanged: (callback: (payload: any) => void) => {
      const handler = (_event: Electron.IpcRendererEvent, payload: any) => callback(payload);
      ipcRenderer.on(IPC_CHANNELS.SYNC.STATE_CHANGED, handler);
      return () => ipcRenderer.removeListener(IPC_CHANNELS.SYNC.STATE_CHANGED, handler);
    },
  };

  // 窗口
  window = {
    minimize: () => ipcRenderer.send(IPC_CHANNELS.WINDOW.MINIMIZE),
    maximize: () => ipcRenderer.send(IPC_CHANNELS.WINDOW.MAXIMIZE),
    close: () => ipcRenderer.send(IPC_CHANNELS.WINDOW.CLOSE),
    getBounds: () => this.request(IPC_CHANNELS.WINDOW.GET_BOUNDS, null),
  };
}

export const electronAPI = new ElectronAPI();
contextBridge.exposeInMainWorld('electron', electronAPI);

// 类型声明
declare global {
  interface Window {
    electron: ElectronAPI;
  }
}
```

---

## 4. Konva.js 状态同步

### 4.1 同步策略：单向数据流 + 批量更新

```
┌─────────────┐    Zustand 更新     ┌─────────────┐
│   用户操作   │ ─────────────────▶ │  Zustand    │
│ (鼠标/语音)  │                    │   Store     │
└─────────────┘                    └──────┬──────┘
                                           │
                                           │ subscribe
                                           │ (防抖 16ms)
                                           ▼
┌─────────────┐    React 渲染      ┌─────────────┐
│   Konva     │ ◀──────────────── │  React      │
│   Stage     │                    │  Component  │
└─────────────┘                    └─────────────┘
```

### 4.2 核心实现

```typescript
// ═══════════════════════════════════════════════════════════════
// Konva 渲染器服务
// ═══════════════════════════════════════════════════════════════

import Konva from 'konva';
import { useEffect, useRef, useCallback } from 'react';

class KonvaRenderer {
  private stage: Konva.Stage | null = null;
  private layerCache = new Map<string, Konva.Layer>();
  private shapeCache = new Map<string, Konva.Node>();
  private updateQueue: Set<string> = new Set();
  private rafId: number | null = null;
  private isBatching = false;

  // 初始化
  init(containerId: string, width: number, height: number) {
    this.stage = new Konva.Stage({
      container: containerId,
      width,
      height,
    });
  }

  // 批量更新入口（由 Zustand subscribe 触发）
  enqueueUpdate(shapeId: string) {
    this.updateQueue.add(shapeId);
    this.scheduleFlush();
  }

  enqueueLayerUpdate(layerId: string) {
    // 层级别更新需要重绘整个层
    this.layerCache.get(layerId)?.destroyChildren();
    this.scheduleFlush();
  }

  private scheduleFlush() {
    if (this.rafId !== null) return;
    
    this.rafId = requestAnimationFrame(() => {
      this.rafId = null;
      this.flush();
    });
  }

  private flush() {
    if (!this.stage) return;
    
    const shapeIds = Array.from(this.updateQueue);
    this.updateQueue.clear();

    // 批量处理更新
    shapeIds.forEach(id => this.renderShape(id));
  }

  // 渲染单个形状
  private renderShape(shapeId: string) {
    const shape = window.__APP_STORE__.getState().canvas.shapes[shapeId];
    if (!shape) {
      this.shapeCache.get(shapeId)?.destroy();
      this.shapeCache.delete(shapeId);
      return;
    }

    let konvaNode = this.shapeCache.get(shapeId);
    const layer = this.layerCache.get(shape.layerId);

    if (!layer) return;

    if (!konvaNode) {
      konvaNode = this.createKonvaNode(shape);
      layer.add(konvaNode);
      this.shapeCache.set(shapeId, konvaNode);
    }

    this.updateKonvaNode(konvaNode, shape);
  }

  private createKonvaNode(shape: Shape): Konva.Node {
    switch (shape.type) {
      case 'rectangle':
        return new Konva.Rect({
          width: shape.width,
          height: shape.height,
          cornerRadius: shape.cornerRadius,
        });
      case 'ellipse':
        return new Konva.Ellipse({
          radiusX: shape.radiusX,
          radiusY: shape.radiusY,
        });
      case 'line':
        return new Konva.Line({
          points: shape.points,
          tension: shape.tension,
          lineCap: shape.lineCap,
          lineJoin: shape.lineJoin,
        });
      case 'path':
        return new Konva.Path({
          data: shape.data,
        });
      case 'text':
        return new Konva.Text({
          text: shape.text,
          fontSize: shape.fontSize,
          fontFamily: shape.fontFamily,
          fontStyle: shape.fontStyle,
          fontVariant: shape.fontWeight === 'bold' ? 'bold' : 'normal',
          align: shape.align,
        });
      case 'image':
        return new Konva.Image();
      case 'group':
        return new Konva.Group();
      default:
        throw new Error(`Unknown shape type`);
    }
  }

  private updateKonvaNode(node: Konva.Node, shape: Shape) {
    node.setAttrs({
      id: shape.id,
      x: shape.transform.x,
      y: shape.transform.y,
      rotation: shape.transform.rotation,
      scaleX: shape.transform.scaleX,
      scaleY: shape.transform.scaleY,
      opacity: shape.opacity,
      visible: shape.visible,
      fill: shape.fill,
      stroke: shape.stroke,
      strokeWidth: shape.strokeWidth,
    });

    if (shape.type === 'image' && 'image' in shape) {
      this.loadImage(shape.src).then(img => {
        (node as Konva.Image).image(img);
      });
    }
  }

  private async loadImage(src: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });
  }

  // 图层管理
  createLayer(layerId: string) {
    if (!this.stage) return;
    const layer = new Konva.Layer();
    this.layerCache.set(layerId, layer);
    this.stage.add(layer);
    return layer;
  }

  reorderLayers(layerOrder: string[]) {
    layerOrder.forEach((layerId, index) => {
      const layer = this.layerCache.get(layerId);
      if (layer) {
        layer.zIndex(index);
      }
    });
  }

  // 导出
  toDataURL(options?: { 
    pixelRatio?: number; 
    mimeType?: string; 
    quality?: number 
  }): string {
    if (!this.stage) throw new Error('Stage not initialized');
    
    return this.stage.toDataURL({
      pixelRatio: options?.pixelRatio ?? 2,
      mimeType: options?.mimeType ?? 'image/png',
      quality: options?.quality ?? 1,
    });
  }

  // 销毁
  destroy() {
    this.stage?.destroy();
    this.layerCache.clear();
    this.shapeCache.clear();
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
    }
  }
}

export const konvaRenderer = new KonvaRenderer();
```

### 4.3 Zustand Store 中的 Konva 集成

```typescript
// ═══════════════════════════════════════════════════════════════
// Canvas Store with Konva Integration
// ═══════════════════════════════════════════════════════════════

import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { enablePatches, produce, type Patch } from 'immer';
import { v4 as uuid } from 'uuid';
import { konvaRenderer } from '../services/konvaRenderer';
import { eventBus } from '../services/eventBus';

enablePatches();

interface CanvasStore {
  // 状态
  width: number;
  height: number;
  backgroundColor: string;
  layers: Record<string, Layer>;
  shapes: Record<string, Shape>;
  layerOrder: string[];
  selection: {
    shapeIds: string[];
    bounds: Bounds | null;
  };
  viewport: {
    x: number;
    y: number;
    scale: number;
    rotation: number;
  };

  // Actions - 形状操作
  addShape: (shape: Omit<Shape, 'id'> & { layerId: string }) => string;
  updateShape: (id: string, updates: Partial<Shape>) => void;
  deleteShape: (id: string) => void;
  
  // Actions - 图层操作
  addLayer: (name?: string) => string;
  updateLayer: (id: string, updates: Partial<Layer>) => void;
  deleteLayer: (id: string) => void;
  reorderLayers: (newOrder: string[]) => void;
  
  // Actions - 选择
  select: (shapeIds: string[]) => void;
  clearSelection: () => void;
  
  // Actions - 视图
  setViewport: (viewport: Partial<Viewport>) => void;
  zoomTo: (scale: number, center?: Point) => void;
  
  // Actions - 历史
  undo: () => void;
  redo: () => void;
  
  // Actions - 同步
  applyRemotePatch: (patch: Patch) => void;
}

export const useCanvasStore = create<CanvasStore>()(
  immer((set, get) => ({
    // ... 初始状态
    
    addShape: (shapeData) => {
      const id = uuid();
      
      set((state) => {
        const shape = { ...shapeData, id } as Shape;
        state.shapes[id] = shape;
        state.layers[shapeData.layerId]?.shapeIds.push(id);
      });

      // 通知 Konva 渲染
      konvaRenderer.enqueueUpdate(id);
      
      // 触发历史记录
      eventBus.emit('canvas:shape-added', { id });
      
      return id;
    },

    updateShape: (id, updates) => {
      set((state) => {
        if (state.shapes[id]) {
          Object.assign(state.shapes[id], updates);
        }
      });
      
      konvaRenderer.enqueueUpdate(id);
      eventBus.emit('canvas:shape-updated', { id, updates });
    },

    deleteShape: (id) => {
      const shape = get().shapes[id];
      if (!shape) return;

      set((state) => {
        const layer = state.layers[shape.layerId];
        if (layer) {
          layer.shapeIds = layer.shapeIds.filter(sid => sid !== id);
        }
        delete state.shapes[id];
        state.selection.shapeIds = state.selection.shapeIds.filter(sid => sid !== id);
      });

      konvaRenderer.enqueueUpdate(id);
      eventBus.emit('canvas:shape-deleted', { id });
    },

    // ... 其他方法
  }))
);

// 订阅 Konva 同步（仅在渲染进程执行）
if (typeof window !== 'undefined') {
  let lastSnapshot = '';
  
  useCanvasStore.subscribe(
    (state) => JSON.stringify(state.shapes),
    (shapesJson) => {
      // 避免重复更新
      if (shapesJson === lastSnapshot) return;
      lastSnapshot = shapesJson;
      
      // 触发批量更新
      Object.keys(JSON.parse(shapesJson)).forEach(id => {
        konvaRenderer.enqueueUpdate(id);
      });
    }
  );
}
```

---

## 5. 并发与竞态处理

### 5.1 语音指令与用户操作的优先级策略

```typescript
// ═══════════════════════════════════════════════════════════════
// 指令优先级管理器
// ═══════════════════════════════════════════════════════════════

export enum CommandPriority {
  SYSTEM = 100,    // 系统命令（撤销/重做）
  VOICE = 80,      // 语音指令
  KEYBOARD = 60,   // 键盘快捷键
  MOUSE = 40,      // 鼠标操作
  TOUCH = 20,      // 触摸操作
}

export interface QueuedCommand {
  id: string;
  priority: CommandPriority;
  timestamp: number;
  execute: () => Promise<void>;
  rollback?: () => void;
}

class CommandQueue {
  private queue: QueuedCommand[] = [];
  private isProcessing = false;
  private currentCommand: QueuedCommand | null = null;

  enqueue(command: Omit<QueuedCommand, 'id' | 'timestamp'>): string {
    const id = uuid();
    const fullCommand: QueuedCommand = {
      ...command,
      id,
      timestamp: Date.now(),
    };

    // 按优先级插入
    const insertIndex = this.queue.findIndex(
      cmd => cmd.priority < fullCommand.priority
    );
    
    if (insertIndex === -1) {
      this.queue.push(fullCommand);
    } else {
      this.queue.splice(insertIndex, 0, fullCommand);
    }

    this.processQueue();
    return id;
  }

  private async processQueue() {
    if (this.isProcessing || this.queue.length === 0) return;

    this.isProcessing = true;
    
    while (this.queue.length > 0) {
      const command = this.queue.shift()!;
      this.currentCommand = command;

      try {
        await command.execute();
      } catch (error) {
        console.error(`Command ${command.id} failed:`, error);
        // 可选：回滚
        if (command.rollback) {
          await command.rollback();
        }
      }

      this.currentCommand = null;
    }

    this.isProcessing = false;
  }

  cancel(id: string) {
    const index = this.queue.findIndex(cmd => cmd.id === id);
    if (index !== -1) {
      this.queue.splice(index, 1);
    }
  }

  clear() {
    this.queue = [];
  }

  getPendingCount(): number {
    return this.queue.length;
  }
}

export const commandQueue = new CommandQueue();
```

### 5.2 语音指令处理流程

```typescript
// ═══════════════════════════════════════════════════════════════
// 语音指令处理器
// ═══════════════════════════════════════════════════════════════

class VoiceCommandProcessor {
  private processing = false;
  private commandBuffer: VoiceCommand[] = [];
  private debounceTimer: number | null = null;

  async process(text: string): Promise<void> {
    if (this.processing) {
      // 将命令加入缓冲区
      const command: VoiceCommand = {
        id: uuid(),
        text,
        timestamp: Date.now(),
        confidence: 1.0,
        status: 'pending',
      };
      this.commandBuffer.push(command);
      return;
    }

    this.processing = true;
    
    try {
      // 1. 路由决策
      const result = await this.routeCommand(text);
      
      if (result.strategy === 'rule') {
        // 规则匹配
        await this.executeRuleAction(result);
      } else {
        // LLM 决策
        await this.executeLLMAction(result);
      }
    } catch (error) {
      console.error('Voice command failed:', error);
    } finally {
      this.processing = false;
      
      // 处理缓冲区中的下一个命令
      if (this.commandBuffer.length > 0) {
        const nextCommand = this.commandBuffer.shift();
        if (nextCommand) {
          this.debounceTimer = window.setTimeout(() => {
            this.process(nextCommand.text);
          }, 300); // 300ms 防抖
        }
      }
    }
  }

  private async routeCommand(text: string): Promise<WorkflowResult> {
    // 先尝试规则匹配
    const ruleMatch = await this.matchRules(text);
    
    if (ruleMatch && ruleMatch.confidence >= 0.9) {
      return {
        strategy: 'rule',
        action: ruleMatch.action,
        params: ruleMatch.params ?? {},
        confidence: ruleMatch.confidence,
        executed: false,
        executionTime: 0,
      };
    }

    // 规则置信度不够，使用 LLM
    if (ruleMatch && ruleMatch.confidence >= 0.6) {
      // 混合模式：结合规则和 LLM
    }

    // LLM 兜底
    return this.getLLMDecision(text);
  }

  private async executeRuleAction(result: WorkflowResult): Promise<void> {
    const startTime = Date.now();

    // 使用命令队列，确保按优先级执行
    await new Promise<void>((resolve) => {
      commandQueue.enqueue({
        priority: CommandPriority.VOICE,
        execute: async () => {
          await this.dispatchAction(result.action, result.params);
          resolve();
        },
      });
    });

    result.executed = true;
    result.executionTime = Date.now() - startTime;
  }

  private async executeLLMAction(result: WorkflowResult): Promise<void> {
    // LLM 决策需要更多验证
    const validatedParams = this.validateParams(result.params);
    
    if (!validatedParams.valid) {
      throw new Error(`Invalid params: ${validatedParams.errors.join(', ')}`);
    }

    await this.executeRuleAction({
      ...result,
      params: validatedParams.params,
    });
  }

  private async dispatchAction(
    action: string, 
    params: Record<string, any>
  ): Promise<void> {
    switch (action) {
      case 'draw_rectangle':
        useCanvasStore.getState().addShape({
          type: 'rectangle',
          layerId: getActiveLayerId(),
          name: `矩形 ${Date.now()}`,
          visible: true,
          locked: false,
          opacity: 1,
          blendMode: 'normal',
          transform: { x: params.x, y: params.y, rotation: 0, scaleX: 1, scaleY: 1, skewX: 0, skewY: 0 },
          width: params.width,
          height: params.height,
          fill: useToolStore.getState().colors.primary,
          stroke: useToolStore.getState().brush.color,
          strokeWidth: useToolStore.getState().brush.size,
        });
        break;

      case 'delete_selected':
        const selection = useCanvasStore.getState().selection.shapeIds;
        selection.forEach(id => useCanvasStore.getState().deleteShape(id));
        break;

      // ... 更多 action handlers
    }
  }
}

export const voiceCommandProcessor = new VoiceCommandProcessor();
```

---

## 6. 错误恢复策略

### 6.1 自动保存与崩溃恢复

```typescript
// ═══════════════════════════════════════════════════════════════
// 文件保存服务
// ═══════════════════════════════════════════════════════════════

class FileSaveService {
  private saveQueue: Array<{
    state: ProjectState;
    thumbnail: string;
    timestamp: number;
  }> = [];
  private isSaving = false;
  private retryCount = 0;
  private maxRetries = 3;

  async save(state: ProjectState, thumbnail: string): Promise<boolean> {
    this.saveQueue.push({ state, thumbnail, timestamp: Date.now() });
    return this.processQueue();
  }

  private async processQueue(): Promise<boolean> {
    if (this.isSaving || this.saveQueue.length === 0) {
      return this.retryCount === 0;
    }

    this.isSaving = true;
    const item = this.saveQueue[0];

    try {
      const projectPath = useFileStore.getState().currentProject?.jsonPath;
      
      if (!projectPath) {
        throw new Error('No project path set');
      }

      // 原子写入：先写临时文件，再重命名
      const tempPath = `${projectPath}.tmp`;
      
      await window.electron.file.save({
        projectPath: tempPath,
        state: item.state,
        thumbnail: item.thumbnail,
      });

      // 重命名覆盖原文件
      await this.renameFile(tempPath, projectPath);

      // 更新状态
      useFileStore.getState().setStatus('saved');
      useFileStore.getState().setLastSave(Date.now());
      
      this.saveQueue.shift();
      this.retryCount = 0;
      this.isSaving = false;

      // 继续处理队列
      if (this.saveQueue.length > 0) {
        this.processQueue();
      }

      return true;
    } catch (error) {
      console.error('Save failed:', error);
      this.isSaving = false;
      this.retryCount++;

      if (this.retryCount < this.maxRetries) {
        // 指数退避重试
        const delay = Math.pow(2, this.retryCount) * 1000;
        setTimeout(() => this.processQueue(), delay);
      } else {
        // 放弃最旧的保存请求
        this.saveQueue.shift();
        this.retryCount = 0;
        useFileStore.getState().setStatus('error');
        useFileStore.getState().setSaveError('自动保存失败，请手动保存');
      }

      return false;
    }
  }

  private async renameFile(from: string, to: string): Promise<void> {
    // 使用 IPC 实现
    await window.electron.file.rename(from, to);
  }
}

export const fileSaveService = new FileSaveService();
```

### 6.2 LLM 返回校验

```typescript
// ═══════════════════════════════════════════════════════════════
// LLM 响应校验
// ═══════════════════════════════════════════════════════════════

const ACTION_SCHEMA = {
  type: 'object',
  properties: {
    action: {
      type: 'string',
      enum: [
        'draw_rectangle',
        'draw_ellipse',
        'draw_line',
        'draw_path',
        'draw_text',
        'delete_selected',
        'move_selected',
        'resize_selected',
        'change_color',
        'change_tool',
        'undo',
        'redo',
        'noop',
      ],
    },
    params: {
      type: 'object',
      properties: {
        x: { type: 'number', minimum: 0, maximum: 10000 },
        y: { type: 'number', minimum: 0, maximum: 10000 },
        width: { type: 'number', minimum: 1, maximum: 10000 },
        height: { type: 'number', minimum: 1, maximum: 10000 },
        color: { type: 'string', pattern: '^#[0-9A-Fa-f]{6}$' },
        tool: { type: 'string' },
      },
    },
  },
  required: ['action'],
};

function validateLLMResponse(response: any): ValidationResult {
  const errors: string[] = [];

  // 1. 检查 action 字段
  if (!response.action) {
    errors.push('Missing action field');
    return { valid: false, errors };
  }

  if (!ACTION_SCHEMA.properties.action.enum.includes(response.action)) {
    errors.push(`Unknown action: ${response.action}`);
  }

  // 2. 检查参数类型和范围
  if (response.params) {
    for (const [key, value] of Object.entries(response.params)) {
      const schema = ACTION_SCHEMA.properties.params.properties[key];
      
      if (!schema) {
        errors.push(`Unknown parameter: ${key}`);
        continue;
      }

      if (typeof value !== schema.type) {
        errors.push(`Invalid type for ${key}: expected ${schema.type}`);
      }

      if (schema.type === 'number') {
        if (value < schema.minimum || value > schema.maximum) {
          errors.push(`${key} out of range: ${value}`);
        }
      }

      if (schema.pattern && typeof value === 'string') {
        if (!new RegExp(schema.pattern).test(value)) {
          errors.push(`${key} doesn't match pattern: ${value}`);
        }
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    sanitized: errors.length === 0 ? response : null,
  };
}

// 校验后的参数清理
function sanitizeParams(params: any): Record<string, any> {
  const allowed = new Set(Object.keys(ACTION_SCHEMA.properties.params.properties));
  const sanitized: Record<string, any> = {};

  for (const [key, value] of Object.entries(params)) {
    if (allowed.has(key)) {
      sanitized[key] = value;
    }
  }

  return sanitized;
}
```

### 6.3 Whisper 断线重连

```typescript
// ═══════════════════════════════════════════════════════════════
// Whisper WebSocket 管理
// ═══════════════════════════════════════════════════════════════

class WhisperWebSocketManager {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private audioChunks: Float32Array[] = [];
  private isRecording = false;

  connect(url: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(url);

      this.ws.onopen = () => {
        console.log('Whisper WebSocket connected');
        this.reconnectAttempts = 0;
        useVoiceStore.getState().setTranscriptionStatus('connected');
        resolve();
      };

      this.ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        
        if (data.type === 'transcript') {
          useVoiceStore.getState().setFinalText(data.text);
          // 触发命令处理
          voiceCommandProcessor.process(data.text);
        } else if (data.type === 'partial') {
          useVoiceStore.getState().setInterimText(data.text);
        }
      };

      this.ws.onerror = (error) => {
        console.error('Whisper WebSocket error:', error);
        useVoiceStore.getState().setTranscriptionStatus('error');
      };

      this.ws.onclose = () => {
        console.log('Whisper WebSocket closed');
        useVoiceStore.getState().setTranscriptionStatus('idle');
        
        if (this.isRecording) {
          this.scheduleReconnect();
        }
      };
    });
  }

  private scheduleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnect attempts reached, falling back to Web Speech API');
      this.activateFallbackRecognition();
      return;
    }

    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts);
    console.log(`Scheduling reconnect in ${delay}ms (attempt ${this.reconnectAttempts + 1})`);
    
    setTimeout(() => {
      this.reconnectAttempts++;
      this.connect(WHISPER_WS_URL);
    }, delay);
  }

  private activateFallbackRecognition() {
    const SpeechRecognition = (window as any).SpeechRecognition || 
                              (window as any).webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      console.error('Web Speech API not supported');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'zh-CN';

    recognition.onresult = (event: any) => {
      const result = event.results[event.results.length - 1];
      const text = result[0].transcript;
      
      if (result.isFinal) {
        useVoiceStore.getState().setFinalText(text);
        voiceCommandProcessor.process(text);
      } else {
        useVoiceStore.getState().setInterimText(text);
      }
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
    };

    recognition.start();
    useVoiceStore.getState().setTranscriptionStatus('connected');
  }

  startRecording() {
    this.isRecording = true;
    useVoiceStore.getState().setTranscriptionStatus('recording');
  }

  stopRecording() {
    this.isRecording = false;
    useVoiceStore.getState().setTranscriptionStatus('idle');
  }

  sendAudioChunk(chunk: Float32Array) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(chunk.buffer);
    }
  }
}

export const whisperManager = new WhisperWebSocketManager();
```

---

## 7. JSON + PNG 双格式设计

### 7.1 JSON 文件结构

```json
{
  "version": "1.0.0",
  "metadata": {
    "created": "2024-01-15T10:30:00Z",
    "modified": "2024-01-15T14:22:33Z",
    "author": "user@example.com",
    "appVersion": "1.0.0"
  },
  "canvas": {
    "width": 1920,
    "height": 1080,
    "backgroundColor": "#FFFFFF"
  },
  "layers": [
    {
      "id": "layer-uuid-1",
      "name": "背景",
      "visible": true,
      "locked": false,
      "opacity": 1,
      "blendMode": "normal",
      "shapeIds": ["shape-1", "shape-2"]
    },
    {
      "id": "layer-uuid-2",
      "name": "前景",
      "visible": true,
      "locked": false,
      "opacity": 0.8,
      "blendMode": "normal",
      "shapeIds": ["shape-3"]
    }
  ],
  "shapes": {
    "shape-1": {
      "id": "shape-1",
      "type": "rectangle",
      "layerId": "layer-uuid-1",
      "name": "矩形 1",
      "visible": true,
      "locked": false,
      "opacity": 1,
      "blendMode": "normal",
      "transform": {
        "x": 100,
        "y": 100,
        "rotation": 0,
        "scaleX": 1,
        "scaleY": 1,
        "skewX": 0,
        "skewY": 0
      },
      "fill": "#FF5733",
      "stroke": "#000000",
      "strokeWidth": 2,
      "width": 200,
      "height": 150,
      "cornerRadius": 0
    }
  },
  "viewport": {
    "x": 0,
    "y": 0,
    "scale": 1,
    "rotation": 0
  },
  "settings": {
    "gridEnabled": false,
    "snapToGrid": false,
    "gridSize": 10
  }
}
```

### 7.2 版本对齐策略

```typescript
// ═══════════════════════════════════════════════════════════════
// 版本管理器
// ═══════════════════════════════════════════════════════════════

interface VersionInfo {
  jsonVersion: string;
  pngChecksum: string;
  thumbnailChecksum: string;
  timestamp: number;
}

class VersionManager {
  private currentVersion = '1.0.0';

  async save(
    state: ProjectState, 
    thumbnail: string, 
    pngDataUrl: string
  ): Promise<{ jsonPath: string; pngPath: string }> {
    const jsonPath = this.getProjectPath();
    const pngPath = this.getPNGPath();

    // 1. 计算 PNG checksum
    const pngChecksum = await this.calculateChecksum(pngDataUrl);

    // 2. 写入 PNG
    await this.savePNG(pngPath, pngDataUrl);

    // 3. 写入带版本信息的 JSON
    const versionedState = {
      ...state,
      version: this.currentVersion,
      metadata: {
        ...state.metadata,
        modified: new Date().toISOString(),
        pngChecksum,
      },
    };

    await this.saveJSON(jsonPath, versionedState);

    // 4. 生成并保存缩略图
    const thumbnailPath = this.getThumbnailPath();
    await this.saveThumbnail(thumbnailPath, thumbnail);

    return { jsonPath, pngPath };
  }

  async load(jsonPath: string): Promise<ProjectState> {
    const state = await this.loadJSON(jsonPath);
    const pngPath = this.getPNGPathForJson(jsonPath);

    // 校验 PNG 一致性
    if (await this.fileExists(pngPath)) {
      const currentChecksum = await this.calculateChecksumFromFile(pngPath);
      
      if (state.metadata.pngChecksum !== currentChecksum) {
        console.warn('PNG checksum mismatch - JSON and PNG may be out of sync');
        
        // 策略：使用 PNG 重新生成 JSON（从快照恢复）
        if (state.settings.autoRecoverFromPNG) {
          return await this.recoverFromPNG(pngPath, state);
        }
      }
    }

    return state;
  }

  private async recoverFromPNG(
    pngPath: string, 
    partialState: ProjectState
  ): Promise<ProjectState> {
    // 从 PNG 解析画布尺寸
    const img = await this.loadImage(pngPath);
    
    return {
      ...partialState,
      canvas: {
        ...partialState.canvas,
        width: img.width,
        height: img.height,
      },
      metadata: {
        ...partialState.metadata,
        recoveredFrom: 'png',
        recoveredAt: new Date().toISOString(),
      },
    };
  }
}
```

### 7.3 损坏恢复策略

```
┌─────────────────────────────────────────────────────────────────┐
│                        文件加载流程                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  读取 JSON ─────┬───── 解析成功 ────▶ 检查 PNG 一致性            │
│                 │                    │                          │
│                 │                    ├── 一致 ────▶ 返回状态     │
│                 │                    │                          │
│                 │                    ├── 不一致 ──▶ 警告 + 恢复   │
│                 │                                                  │
│                 ▼                                                  │
│         解析失败 / 文件损坏                                         │
│                 │                                                  │
│                 ├── 有备份 ────▶ 尝试恢复备份                       │
│                 │                                                  │
│                 └── 无备份 ────▶ 从 PNG 重建（如果存在）           │
│                                      │                           │
│                                      ├── PNG 存在 ───▶ 重建状态   │
│                                      │                           │
│                                      └── PNG 缺失 ────▶ 错误提示  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 8. 高优先级改进建议

### 8.1 P0 - 核心稳定性

| 优先级 | 问题 | 建议方案 | 影响 |
|--------|------|----------|------|
| P0 | 自动保存失败无反馈 | 实现重试队列 + 状态通知 + 磁盘空间检查 | 数据丢失风险 |
| P0 | LLM 返回无校验 | 实现 JSON Schema 校验 + 参数白名单 | 安全风险 |
| P0 | 画布导出与状态不一致 | 导出前锁定状态，导出后校验 | 用户体验 |
| P0 | Whisper 断线无感知 | 实现自动重连 + 降级到 Web Speech API | 语音功能 |

### 8.2 P1 - 性能优化

| 优先级 | 问题 | 建议方案 | 影响 |
|--------|------|----------|------|
| P1 | 大画布性能问题 | 实现视口裁剪 + LOD 细节层次 | 卡顿 |
| P1 | 频繁状态更新卡顿 | 实现批量更新 + RAF 防抖 | 响应性 |
| P1 | 撤销历史占用内存 | 实现历史压缩 + 快照策略 | 内存占用 |
| P1 | 多图层重绘开销 | 实现脏区域标记 + 选择性重绘 | 性能 |

### 8.3 P2 - 功能增强

| 优先级 | 问题 | 建议方案 | 影响 |
|--------|------|----------|------|
| P2 | 多窗口状态同步 | 实现 CRDT 或 OT 算法 | 协作能力 |
| P2 | 版本回滚 | 实现增量快照 + 差异存储 | 可恢复性 |
| P2 | 命令撤销粒度粗 | 实现操作级撤销（不仅是状态快照） | 体验 |
| P2 | 语音指令冲突处理 | 实现操作转换 + 冲突解决 UI | 体验 |

### 8.4 推荐的文件夹结构

```
ai-painting/
├── src/
│   ├── main/                      # Electron 主进程
│   │   ├── index.ts               # 入口
│   │   ├── ipc/                   # IPC 处理器
│   │   │   ├── file.ipc.ts
│   │   │   ├── llm.ipc.ts
│   │   │   ├── wake-word.ipc.ts
│   │   │   └── sync.ipc.ts
│   │   ├── services/             # 主进程服务
│   │   │   ├── file.service.ts
│   │   │   ├── ollama.service.ts
│   │   │   └── porcupine.service.ts
│   │   └── window.manager.ts
│   │
│   ├── preload/                   # 预加载脚本
│   │   └── index.ts
│   │
│   ├── renderer/                   # 渲染进程
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   │
│   │   ├── components/            # React 组件
│   │   │   ├── Canvas/
│   │   │   ├── Toolbar/
│   │   │   ├── LayerPanel/
│   │   │   └── VoiceIndicator/
│   │   │
│   │   ├── stores/                # Zustand stores
│   │   │   ├── canvas.store.ts
│   │   │   ├── tool.store.ts
│   │   │   ├── voice.store.ts
│   │   │   ├── file.store.ts
│   │   │   └── ui.store.ts
│   │   │
│   │   ├── services/              # 渲染进程服务
│   │   │   ├── konva.renderer.ts
│   │   │   ├── whisper.client.ts
│   │   │   ├── workflow.agent.ts
│   │   │   └── undo.manager.ts
│   │   │
│   │   ├── hooks/                 # 自定义 hooks
│   │   ├── utils/                 # 工具函数
│   │   └── types/                 # TypeScript 类型
│   │       ├── canvas.types.ts
│   │       ├── voice.types.ts
│   │       ├── ipc.types.ts
│   │       └── project.types.ts
│   │
│   └── shared/                    # 共享类型/常量
│       ├── constants.ts
│       └── types.ts
│
├── resources/                     # 资源文件
│   ├── porcupine/                 # Porcupine 模型
│   └── icons/
│
├── electron-builder.json
├── package.json
├── tsconfig.json
├── vite.config.ts
└── SPEC.md
```

---

## 附录 A：关键状态变更流程图

### A.1 语音指令完整流程

```
用户说 "画一个红色的矩形"
         │
         ▼
┌─────────────────┐
│ Porcupine 唤醒   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Whisper 转文字   │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────────────┐
│         Workflow Agent 路由中枢           │
├─────────────────────────────────────────┤
│  1. 规则引擎匹配 ──▶ "画*矩形" → 规则命中  │
│       │                                  │
│       ├── 置信度 ≥ 0.9 ──▶ 直接执行     │
│       │                                  │
│       └── 置信度 < 0.9 ──▶ LLM 决策      │
└────────────────┬────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────┐
│           参数校验与转换                   │
│  { color: "红色" } → { color: "#FF0000" } │
└────────────────┬────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────┐
│           命令队列 (优先级: VOICE)         │
│  检查: 当前是否有更高优先级命令执行中        │
└────────────────┬────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────┐
│           执行状态更新                     │
│  1. canvasStore.addShape()              │
│  2. konvaRenderer.enqueueUpdate()        │
│  3. eventBus.emit('canvas:change')     │
└────────────────┬────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────┐
│           结果反馈                        │
│  1. UI 提示 "已绘制矩形"                  │
│  2. 语音播报确认 (可选)                    │
│  3. 保存变更到历史                        │
└─────────────────────────────────────────┘
```

### A.2 文件保存流程

```
触发保存 (Ctrl+S / 自动保存)
         │
         ▼
┌─────────────────┐
│  锁定文件状态    │
│  setStatus('saving')
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────────────┐
│  生成快照                                │
│  1. konvaRenderer.toDataURL() → PNG    │
│  2. 压缩缩略图 (200x200)                 │
│  3. 序列化 Zustand 状态 → JSON          │
└────────────────┬────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────┐
│  计算校验和                               │
│  PNG checksum = md5(dataURL)            │
└────────────────┬────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────┐
│  原子写入 (主进程 IPC)                    │
│  1. 写入 *.tmp                           │
│  2. rename *.tmp → *.json               │
│  3. 写入 *.png                           │
└────────────────┬────────────────────────┘
                 │
         ┌───────┴───────┐
         │               │
         ▼               ▼
┌─────────────┐   ┌─────────────┐
│   成功       │   │   失败       │
│ setStatus   │   │ 重试 (3次)   │
│ ('saved')   │   │ 指数退避     │
└─────────────┘   └──────┬──────┘
                         │
                         ▼
                 ┌─────────────┐
                 │  全部失败    │
                 │ 显示错误提示 │
                 │ 保留内存状态 │
                 └─────────────┘
```

---

*文档版本: 1.0.0*
*最后更新: 2026-06-12*
