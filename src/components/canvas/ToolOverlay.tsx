import React from 'react';
import { Rect, Ellipse, Line } from 'react-konva';
import { useToolStore } from '@/stores/tool.store';

export const ToolOverlay: React.FC = () => {
  const { activeTool, brush, drawing } = useToolStore();

  if (!drawing.isDrawing || !drawing.startPoint || !drawing.currentPoint) {
    return null;
  }

  const { startPoint, currentPoint, tempPoints } = drawing;
  const color = brush.color;
  const opacity = brush.opacity;
  const strokeWidth = brush.size;

  switch (activeTool) {
    case 'rectangle': {
      const x = Math.min(startPoint.x, currentPoint.x);
      const y = Math.min(startPoint.y, currentPoint.y);
      const w = Math.abs(currentPoint.x - startPoint.x);
      const h = Math.abs(currentPoint.y - startPoint.y);
      if (w < 2 && h < 2) return null;
      return (
        <Rect
          x={x}
          y={y}
          width={w}
          height={h}
          stroke={color}
          strokeWidth={strokeWidth}
          opacity={opacity}
          dash={[4, 4]}
          listening={false}
        />
      );
    }

    case 'ellipse': {
      const cx = (startPoint.x + currentPoint.x) / 2;
      const cy = (startPoint.y + currentPoint.y) / 2;
      const rx = Math.abs(currentPoint.x - startPoint.x) / 2;
      const ry = Math.abs(currentPoint.y - startPoint.y) / 2;
      if (rx < 2 && ry < 2) return null;
      return (
        <Ellipse
          x={cx}
          y={cy}
          radiusX={rx}
          radiusY={ry}
          stroke={color}
          strokeWidth={strokeWidth}
          opacity={opacity}
          dash={[4, 4]}
          listening={false}
        />
      );
    }

    case 'line': {
      return (
        <Line
          points={[startPoint.x, startPoint.y, currentPoint.x, currentPoint.y]}
          stroke={color}
          strokeWidth={strokeWidth}
          opacity={opacity}
          dash={[4, 4]}
          lineCap="round"
          listening={false}
        />
      );
    }

    case 'pen':
    case 'eraser': {
      const eraserColor = activeTool === 'eraser' ? '#ffffff' : color;
      if (tempPoints.length < 4) {
        return (
          <Line
            points={[startPoint.x, startPoint.y, currentPoint.x, currentPoint.y]}
            stroke={eraserColor}
            strokeWidth={strokeWidth}
            opacity={opacity}
            lineCap="round"
            lineJoin="round"
            tension={0.5}
            listening={false}
          />
        );
      }
      return (
        <Line
          points={tempPoints}
          stroke={eraserColor}
          strokeWidth={strokeWidth}
          opacity={opacity}
          lineCap="round"
          lineJoin="round"
          tension={0.5}
          listening={false}
        />
      );
    }

    case 'select': {
      const x = Math.min(startPoint.x, currentPoint.x);
      const y = Math.min(startPoint.y, currentPoint.y);
      const w = Math.abs(currentPoint.x - startPoint.x);
      const h = Math.abs(currentPoint.y - startPoint.y);
      return (
        <Rect
          x={x}
          y={y}
          width={w}
          height={h}
          stroke="#7c3aed"
          strokeWidth={1}
          dash={[4, 4]}
          listening={false}
        />
      );
    }

    default:
      return null;
  }
};
