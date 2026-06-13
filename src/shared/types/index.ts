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

export interface Transform {
  x: number;
  y: number;
  rotation: number;
  scaleX: number;
  scaleY: number;
  skewX: number;
  skewY: number;
}

export interface ShapeBase {
  id: string;
  type: ShapeType;
  layerId: string;
  name: string;
  visible: boolean;
  locked: boolean;
  opacity: number;
  blendMode: BlendMode;
  transform: Transform;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
}

export interface RectangleShape extends ShapeBase {
  type: 'rectangle';
  width: number;
  height: number;
  cornerRadius?: number;
}

export interface EllipseShape extends ShapeBase {
  type: 'ellipse';
  radiusX: number;
  radiusY: number;
}

export interface LineShape extends ShapeBase {
  type: 'line';
  points: number[];
  tension?: number;
  lineCap?: 'butt' | 'round' | 'square';
  lineJoin?: 'miter' | 'round' | 'bevel';
}

export interface PathShape extends ShapeBase {
  type: 'path';
  data: string;
}

export interface TextShape extends ShapeBase {
  type: 'text';
  text: string;
  fontSize: number;
  fontFamily: string;
  fontStyle?: 'normal' | 'italic';
  fontWeight?: 'normal' | 'bold';
  align?: 'left' | 'center' | 'right';
}

export interface ImageShape extends ShapeBase {
  type: 'image';
  src: string;
  width: number;
  height: number;
}

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

export interface Layer {
  id: string;
  name: string;
  visible: boolean;
  locked: boolean;
  opacity: number;
  blendMode: BlendMode;
  shapeIds: string[];
}

export interface Viewport {
  x: number;
  y: number;
  scale: number;
  rotation: number;
}

export interface CanvasState {
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
  viewport: Viewport;
}

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

export interface BrushSettings {
  color: string;
  size: number;
  opacity: number;
  hardness: number;
}

// ═══════════════════════════════════════════════════════════════
// 绘图工具状态（运行时，不持久化）
// ═══════════════════════════════════════════════════════════════

export interface DrawingState {
  isDrawing: boolean;
  startPoint: Point | null;
  currentPoint: Point | null;
  tempPoints: number[];
  tempShapeId: string | null;
}

export interface ToolState {
  activeTool: ToolType;
  brush: BrushSettings;
  colors: {
    primary: string;
    secondary: string;
    recent: string[];
  };
  drawing: DrawingState;
}

// ═══════════════════════════════════════════════════════════════
// UI 相关类型
// ═══════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════
// 语音相关类型
// ═══════════════════════════════════════════════════════════════

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
    params: Record<string, unknown>;
  };
  error?: string;
}

export interface VoiceState {
  transcription: {
    status: TranscriptionStatus;
    interimText: string;
    finalText: string;
  };
  commandQueue: VoiceCommand[];
  settings: {
    language: string;
    continuousMode: boolean;
  };
}

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

export interface FileState {
  status: FileStatus;
  currentProject: ProjectFile | null;
  autoSave: {
    enabled: boolean;
    interval: number;
    lastSave: number | null;
  };
}

// ═══════════════════════════════════════════════════════════════
// UI 相关类型
// ═══════════════════════════════════════════════════════════════

export interface UIState {
  language: 'zh-CN' | 'en-US';
  theme: 'light' | 'dark' | 'system';
  sidebar: {
    visible: boolean;
    width: number;
    activeTab: 'layers' | 'tools' | 'properties';
  };
}

// ═══════════════════════════════════════════════════════════════
// 完整项目状态（用于持久化）
// ═══════════════════════════════════════════════════════════════

export interface ProjectState {
  version: string;
  canvas: CanvasState;
  tool: ToolState;
  file: {
    currentProject: ProjectFile | null;
  };
  ui: UIState;
}
