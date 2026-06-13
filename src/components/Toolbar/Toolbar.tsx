import React from 'react';
import { useToolStore } from '@/stores/tool.store';
import type { ToolType } from '@/shared/types';
import styles from './Toolbar.module.css';

const TOOLS: { type: ToolType; label: string; icon: string }[] = [
  { type: 'select', label: '选择', icon: '↖' },
  { type: 'pen', label: '画笔', icon: '✏' },
  { type: 'eraser', label: '橡皮', icon: '◯' },
  { type: 'rectangle', label: '矩形', icon: '▭' },
  { type: 'ellipse', label: '椭圆', icon: '○' },
  { type: 'line', label: '直线', icon: '╱' },
  { type: 'text', label: '文字', icon: 'T' },
  { type: 'hand', label: '拖拽', icon: '✋' },
  { type: 'zoom', label: '缩放', icon: '🔍' },
];

interface ToolbarProps {
  onColorChange?: (color: string) => void;
  onBrushSizeChange?: (size: number) => void;
}

export const Toolbar: React.FC<ToolbarProps> = ({ onColorChange, onBrushSizeChange }) => {
  const { activeTool, setActiveTool, brush, setPrimaryColor, swapColors } = useToolStore();

  return (
    <div className={styles.toolbar}>
      <div className={styles.toolGroup}>
        {TOOLS.map((tool) => (
          <button
            key={tool.type}
            className={`${styles.toolBtn} ${activeTool === tool.type ? styles.active : ''}`}
            onClick={() => setActiveTool(tool.type)}
            title={tool.label}
          >
            {tool.icon}
          </button>
        ))}
      </div>

      <div className={styles.divider} />

      <div className={styles.colorGroup}>
        <button
          className={styles.colorBtn}
          style={{ backgroundColor: useToolStore.getState().colors.primary }}
          onClick={() => {
            const input = document.createElement('input');
            input.type = 'color';
            input.value = useToolStore.getState().colors.primary;
            input.addEventListener('input', (e) => {
              const val = (e.target as HTMLInputElement).value;
              setPrimaryColor(val);
              onColorChange?.(val);
            });
            input.click();
          }}
          title="前景色"
        />
        <button
          className={styles.colorBtn}
          style={{ backgroundColor: useToolStore.getState().colors.secondary }}
          title="背景色"
        />
        <button className={styles.swapBtn} onClick={swapColors} title="交换颜色">
          ⇄
        </button>
      </div>

      <div className={styles.divider} />

      <div className={styles.brushGroup}>
        <label className={styles.brushLabel}>
          <span>大小</span>
          <input
            type="range"
            min={1}
            max={100}
            value={brush.size}
            onChange={(e) => onBrushSizeChange?.(Number(e.target.value))}
            className={styles.brushSlider}
          />
          <span className={styles.brushValue}>{brush.size}</span>
        </label>
      </div>
    </div>
  );
};
