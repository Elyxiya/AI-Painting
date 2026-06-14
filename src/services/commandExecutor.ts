import type { Command } from './commandParser';
import type {
  ShapeType,
  Shape,
  RectangleShape,
  EllipseShape,
  LineShape,
  PathShape,
  TextShape,
  ImageShape,
} from '@/shared/types';

type ShapeData =
  | Omit<RectangleShape, 'id' | 'layerId'>
  | Omit<EllipseShape, 'id' | 'layerId'>
  | Omit<LineShape, 'id' | 'layerId'>
  | Omit<PathShape, 'id' | 'layerId'>
  | Omit<TextShape, 'id' | 'layerId'>
  | Omit<ImageShape, 'id' | 'layerId'>;

interface ExecuteContext {
  canvasStore: {
    getState: () => {
      getActiveLayerId: () => string;
      addShape: (shape: ShapeData & { layerId?: string }) => string;
      deleteShape: (id: string) => void;
      shapes: Record<string, Shape>;
      selection: { shapeIds: string[] };
    };
    historyStore?: {
      undo: () => void;
      redo: () => void;
    };
  };
}

/**
 * Executes a parsed command by updating the canvas store state.
 */
export function executeCommand(cmd: Command, ctx: ExecuteContext): void {
  const state = ctx.canvasStore.getState();

  switch (cmd.command) {
    case 'drawShape': {
      const { color, shapeType } = cmd;
      const layerId = state.getActiveLayerId();
      const shapeData = createShapeData(shapeType, color, layerId);
      state.addShape(shapeData);
      break;
    }

    case 'delete': {
      for (const id of state.selection.shapeIds) {
        state.deleteShape(id);
      }
      break;
    }

    case 'clearAll': {
      for (const id of Object.keys(state.shapes)) {
        state.deleteShape(id);
      }
      break;
    }

    case 'undo': {
      // Will be implemented when history store is added (PR-09).
      break;
    }

    case 'redo': {
      // Will be implemented when history store is added (PR-09).
      break;
    }
  }
}

function createShapeData(
  shapeType: ShapeType,
  color: string,
  layerId: string,
): ShapeData {
  const base = {
    name: shapeType,
    visible: true,
    locked: false,
    opacity: 1,
    blendMode: 'normal' as const,
    transform: {
      x: 100,
      y: 100,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      skewX: 0,
      skewY: 0,
    },
    layerId,
  };

  switch (shapeType) {
    case 'rectangle':
      return {
        ...base,
        type: 'rectangle',
        width: 100,
        height: 100,
        fill: color,
      };

    case 'ellipse':
      return {
        ...base,
        type: 'ellipse',
        radiusX: 50,
        radiusY: 50,
        fill: color,
      };

    case 'line':
      return {
        ...base,
        type: 'line',
        points: [0, 0, 100, 100],
        lineCap: 'round' as const,
        lineJoin: 'round' as const,
        stroke: color,
        strokeWidth: 2,
      };

    case 'path':
      return {
        ...base,
        type: 'path',
        data: '',
        stroke: color,
        strokeWidth: 2,
      };

    case 'text':
      return {
        ...base,
        type: 'text',
        text: 'Text',
        fontSize: 24,
        fontFamily: 'Arial',
        fill: color,
      };

    case 'image':
      return {
        ...base,
        type: 'image',
        src: '',
        width: 100,
        height: 100,
      };

    default:
      return {
        ...base,
        type: 'rectangle',
        width: 100,
        height: 100,
        fill: color,
      };
  }
}
