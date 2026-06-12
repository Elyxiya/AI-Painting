import React, { useRef, useCallback, useEffect, useState } from 'react';
import { Stage, Layer, Rect } from 'react-konva';
import type Konva from 'konva';
import { useCanvasStore } from '@/stores/canvas.store';
import { useToolStore } from '@/stores/tool.store';
import { CanvasShape } from './CanvasShape';
import { ToolOverlay } from './ToolOverlay';
import { useToolHandlers } from '@/hooks/useToolHandlers';
import styles from './Canvas.module.css';

export const Canvas: React.FC = () => {
  const stageRef = useRef<Konva.Stage>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [stageSize, setStageSize] = useState({ width: 800, height: 600 });

  const { width, height, layers, shapes, layerOrder, viewport, backgroundColor, setViewport, setScale } =
    useCanvasStore();
  const { activeTool, drawing } = useToolStore();
  const { handleMouseDown, handleMouseMove, handleMouseUp } = useToolHandlers(stageRef);

  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        setStageSize({
          width: containerRef.current.offsetWidth,
          height: containerRef.current.offsetHeight,
        });
      }
    };

    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  const handleWheel = useCallback(
    (e: Konva.KonvaEventObject<WheelEvent>) => {
      e.evt.preventDefault();
      const scaleBy = 1.05;
      const oldScale = viewport.scale;
      const pointer = stageRef.current?.getPointerPosition();
      if (!pointer) return;

      const mousePointTo = {
        x: (pointer.x - viewport.x) / oldScale,
        y: (pointer.y - viewport.y) / oldScale,
      };

      const direction = e.evt.deltaY > 0 ? -1 : 1;
      const newScale =
        direction > 0 ? oldScale * scaleBy : oldScale / scaleBy;
      const clampedScale = Math.max(0.1, Math.min(10, newScale));

      setViewport({
        scale: clampedScale,
        x: pointer.x - mousePointTo.x * clampedScale,
        y: pointer.y - mousePointTo.y * clampedScale,
      });
      setScale(clampedScale);
    },
    [viewport, setViewport, setScale],
  );

  const getCursor = () => {
    switch (activeTool) {
      case 'hand':
        return drawing.isDrawing ? 'grabbing' : 'grab';
      case 'zoom':
        return 'zoom-in';
      case 'select':
        return 'default';
      default:
        return 'crosshair';
    }
  };

  return (
    <div
      ref={containerRef}
      className={styles.container}
      style={{ cursor: getCursor() }}
    >
      <Stage
        ref={stageRef}
        width={stageSize.width}
        height={stageSize.height}
        x={viewport.x}
        y={viewport.y}
        scaleX={viewport.scale}
        scaleY={viewport.scale}
        rotation={viewport.rotation}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
      >
        <Layer listening={false}>
          <Rect
            x={0}
            y={0}
            width={width}
            height={height}
            fill={backgroundColor}
            listening={false}
          />
        </Layer>

        {layerOrder.map((layerId) => {
          const layer = layers[layerId];
          if (!layer) return null;
          return (
            <Layer
              key={layerId}
              opacity={layer.opacity}
              visible={layer.visible}
              listening={!layer.locked}
            >
              {layer.shapeIds.map((shapeId) => {
                const shape = shapes[shapeId];
                if (!shape || !shape.visible) return null;
                return <CanvasShape key={shapeId} shape={shape} />;
              })}
            </Layer>
          );
        })}

        <Layer listening={false}>
          <ToolOverlay />
        </Layer>
      </Stage>
    </div>
  );
};
