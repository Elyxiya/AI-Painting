import React from 'react';
import { Rect, Ellipse, Line, Path, Text } from 'react-konva';
import type {
  Shape,
  RectangleShape,
  EllipseShape,
  LineShape,
  PathShape,
  TextShape,
} from '@/shared/types';

interface CanvasShapeProps {
  shape: Shape;
}

export const CanvasShape: React.FC<CanvasShapeProps> = ({ shape }) => {
  const commonProps = {
    id: shape.id,
    x: shape.transform.x,
    y: shape.transform.y,
    rotation: shape.transform.rotation,
    scaleX: shape.transform.scaleX,
    scaleY: shape.transform.scaleY,
    opacity: shape.opacity,
    visible: shape.visible,
    listening: !shape.locked,
  };

  switch (shape.type) {
    case 'rectangle': {
      const s = shape as RectangleShape;
      return (
        <Rect
          {...commonProps}
          width={s.width}
          height={s.height}
          fill={s.fill}
          stroke={s.stroke}
          strokeWidth={s.strokeWidth}
          cornerRadius={s.cornerRadius}
        />
      );
    }

    case 'ellipse': {
      const s = shape as EllipseShape;
      return (
        <Ellipse
          {...commonProps}
          radiusX={s.radiusX}
          radiusY={s.radiusY}
          fill={s.fill}
          stroke={s.stroke}
          strokeWidth={s.strokeWidth}
        />
      );
    }

    case 'line': {
      const s = shape as LineShape;
      return (
        <Line
          {...commonProps}
          points={s.points}
          tension={s.tension}
          lineCap={s.lineCap}
          lineJoin={s.lineJoin}
          stroke={s.stroke}
          strokeWidth={s.strokeWidth}
          fill={s.fill}
        />
      );
    }

    case 'path': {
      const s = shape as PathShape;
      return (
        <Path
          {...commonProps}
          data={s.data}
          fill={s.fill}
          stroke={s.stroke}
          strokeWidth={s.strokeWidth}
        />
      );
    }

    case 'text': {
      const s = shape as TextShape;
      const fontStyleStr = [
        s.fontStyle === 'italic' ? 'italic' : '',
        s.fontWeight === 'bold' ? 'bold' : '',
      ]
        .filter(Boolean)
        .join(' ');
      return (
        <Text
          {...commonProps}
          text={s.text}
          fontSize={s.fontSize}
          fontFamily={s.fontFamily}
          fontStyle={fontStyleStr || undefined}
          fill={s.fill}
          align={s.align}
        />
      );
    }

    default:
      return null;
  }
};
