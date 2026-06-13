import { useCallback, useRef, type RefObject } from 'react';
import type Konva from 'konva';
import { useCanvasStore } from '@/stores/canvas.store';
import { useToolStore } from '@/stores/tool.store';
import type {
  RectangleShape,
  EllipseShape,
  LineShape,
  Point,
} from '@/shared/types';

const DEFAULT_TRANSFORM = {
  x: 0,
  y: 0,
  rotation: 0,
  scaleX: 1,
  scaleY: 1,
  skewX: 0,
  skewY: 0,
};

export function useToolHandlers(stageRef: RefObject<Konva.Stage | null>) {
  const addShape = useCanvasStore((s) => s.addShape);
  const { activeTool, brush, startDrawing, updateDrawing, updateTempPoints, endDrawing } =
    useToolStore();
  const penPointsRef = useRef<number[]>([]);

  const handleMouseDown = useCallback(
    (_e: Konva.KonvaEventObject<MouseEvent>) => {
      if (activeTool === 'select' || activeTool === 'hand' || activeTool === 'zoom') return;

      const stage = stageRef.current;
      if (!stage) return;

      const pos = stage.getPointerPosition();
      if (!pos) return;

      const transform = stage.getAbsoluteTransform().copy().invert();
      const realPos = transform.point(pos) as Point;

      startDrawing(realPos.x, realPos.y);
      penPointsRef.current = [realPos.x, realPos.y];
    },
    [activeTool, stageRef, startDrawing],
  );

  const handleMouseMove = useCallback(
    (_e: Konva.KonvaEventObject<MouseEvent>) => {
      if (activeTool === 'select' || activeTool === 'hand' || activeTool === 'zoom') return;

      const stage = stageRef.current;
      if (!stage) return;

      const pos = stage.getPointerPosition();
      if (!pos) return;

      const transform = stage.getAbsoluteTransform().copy().invert();
      const realPos = transform.point(pos) as Point;

      updateDrawing(realPos.x, realPos.y);

      if (activeTool === 'pen' || activeTool === 'eraser') {
        penPointsRef.current = [...penPointsRef.current, realPos.x, realPos.y];
        updateTempPoints([...penPointsRef.current]);
      }
    },
    [activeTool, stageRef, updateDrawing, updateTempPoints],
  );

  const handleMouseUp = useCallback(
    (_e: Konva.KonvaEventObject<MouseEvent>) => {
      if (activeTool === 'select' || activeTool === 'hand' || activeTool === 'zoom') return;

      const stage = stageRef.current;
      if (!stage) return;

      const pos = stage.getPointerPosition();
      if (!pos) return;

      const transform = stage.getAbsoluteTransform().copy().invert();
      const endPos = transform.point(pos) as Point;
      const { startPoint } = useToolStore.getState().drawing;

      if (!startPoint) return;

      const color = activeTool === 'eraser' ? '#ffffff' : brush.color;

      switch (activeTool) {
        case 'rectangle': {
          const x = Math.min(startPoint.x, endPos.x);
          const y = Math.min(startPoint.y, endPos.y);
          const w = Math.abs(endPos.x - startPoint.x);
          const h = Math.abs(endPos.y - startPoint.y);
          if (w < 2 && h < 2) break;
          const shape: Omit<RectangleShape, 'id'> = {
            type: 'rectangle',
            name: '矩形',
            visible: true,
            locked: false,
            opacity: brush.opacity,
            blendMode: 'normal',
            transform: { ...DEFAULT_TRANSFORM, x, y },
            layerId: '',
            width: w,
            height: h,
            fill: color,
            stroke: color,
            strokeWidth: brush.size,
          };
          addShape(shape);
          break;
        }

        case 'ellipse': {
          const cx = (startPoint.x + endPos.x) / 2;
          const cy = (startPoint.y + endPos.y) / 2;
          const rx = Math.abs(endPos.x - startPoint.x) / 2;
          const ry = Math.abs(endPos.y - startPoint.y) / 2;
          if (rx < 2 && ry < 2) break;
          const shape: Omit<EllipseShape, 'id'> = {
            type: 'ellipse',
            name: '椭圆',
            visible: true,
            locked: false,
            opacity: brush.opacity,
            blendMode: 'normal',
            transform: { ...DEFAULT_TRANSFORM, x: cx, y: cy },
            layerId: '',
            radiusX: rx,
            radiusY: ry,
            fill: color,
            stroke: color,
            strokeWidth: brush.size,
          };
          addShape(shape);
          break;
        }

        case 'line': {
          const shape: Omit<LineShape, 'id'> = {
            type: 'line',
            name: '直线',
            visible: true,
            locked: false,
            opacity: brush.opacity,
            blendMode: 'normal',
            transform: { ...DEFAULT_TRANSFORM },
            layerId: '',
            points: [startPoint.x, startPoint.y, endPos.x, endPos.y],
            tension: 0,
            lineCap: 'round',
            lineJoin: 'miter',
            stroke: color,
            strokeWidth: brush.size,
          };
          addShape(shape);
          break;
        }

        case 'pen':
        case 'eraser': {
          const points = penPointsRef.current;
          if (points.length < 4) break;
          const shape: Omit<LineShape, 'id'> = {
            type: 'line',
            name: activeTool === 'eraser' ? '橡皮擦' : '画笔',
            visible: true,
            locked: false,
            opacity: brush.opacity,
            blendMode: 'normal',
            transform: { ...DEFAULT_TRANSFORM },
            layerId: '',
            points,
            tension: 0.5,
            lineCap: 'round',
            lineJoin: 'round',
            stroke: color,
            strokeWidth: brush.size,
          };
          addShape(shape);
          penPointsRef.current = [];
          break;
        }

        default:
          break;
      }

      endDrawing();
    },
    [activeTool, brush, stageRef, addShape, endDrawing],
  );

  return { handleMouseDown, handleMouseMove, handleMouseUp };
}
