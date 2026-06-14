import { mapColorAlias, mapShapeAlias } from './commandRules';
import type { ShapeType } from '@/shared/types';

export type Command =
  | { command: 'drawShape'; color: string; shapeType: ShapeType }
  | { command: 'delete' }
  | { command: 'undo' }
  | { command: 'redo' }
  | { command: 'clearAll' };

// All color aliases sorted longest-first for greedy matching
const COLOR_LIST = [
  '蓝色', '橙色', '紫色', '灰色', '粉色',
  '红色', '绿色', '黄色', '黑色', '白色',
  '红', '蓝', '绿', '黄', '黑', '白', '橙', '紫', '灰',
];

// All shape aliases sorted longest-first for greedy matching
const SHAPE_LIST = [
  '长方形', '正方形', '圆形', '椭圆', '圆圈', '直线', '矩形',
  '圆', '文字', '文本', '线条', '线', '图片', '画笔', '自由',
];

// Delete command aliases
const DELETE_LIST = ['删除', '删掉', '清除'];
// Undo command aliases
const UNDO_LIST = ['撤销'];
// Redo command aliases
const REDO_LIST = ['重做'];
// Clear command aliases
const CLEAR_LIST = ['清空'];

// English color map
const ENGLISH_COLOR_MAP: Record<string, string> = {
  red: '#FF0000', blue: '#0000FF', green: '#00FF00', yellow: '#FFFF00',
  black: '#000000', white: '#FFFFFF', orange: '#FFA500', purple: '#800080',
  gray: '#808080', grey: '#808080', pink: '#FFC0CB',
};

// English shape map
const ENGLISH_SHAPE_MAP: Record<string, ShapeType> = {
  rectangle: 'rectangle', square: 'rectangle',
  circle: 'ellipse', ellipse: 'ellipse', oval: 'ellipse',
  line: 'line', straightline: 'line',
  text: 'text', image: 'image', path: 'path', freehand: 'path', pencil: 'path',
};

/**
 * Finds the longest-matching color alias within the text (case-insensitive).
 * Returns null if no known color is found.
 */
function findColor(text: string): string | null {
  for (const color of COLOR_LIST) {
    if (text.toLowerCase().includes(color.toLowerCase())) {
      return color;
    }
  }
  return null;
}

/**
 * Finds the longest-matching shape alias within the text (case-insensitive).
 * Returns null if no known shape is found.
 */
function findShape(text: string): string | null {
  for (const shape of SHAPE_LIST) {
    if (text.toLowerCase().includes(shape.toLowerCase())) {
      return shape;
    }
  }
  return null;
}

/**
 * Parses a voice command text into a structured Command object.
 * Returns null if the text does not match any known command pattern.
 *
 * Supported patterns:
 * - "画[颜色][形状]" / "画一个[颜色]的[形状]" / "画[形状]"
 * - "删除" / "删掉" / "清除"
 * - "撤销"
 * - "重做"
 * - "清空"
 * - English: "draw [color] [shape]"
 */
export function parseCommand(text: string): Command | null {
  const trimmed = text.trim();

  if (!trimmed) {
    return null;
  }

  // ── Chinese draw command ─────────────────────────────────────────────────────
  if (trimmed.startsWith('画')) {
    const shape = findShape(trimmed);
    if (!shape) {
      return null;
    }

    const shapeType = mapShapeAlias(shape);
    if (!shapeType) {
      return null;
    }

    const colorAlias = findColor(trimmed);
    let color = '#000000';
    if (colorAlias) {
      color = mapColorAlias(colorAlias);
    }

    return { command: 'drawShape', color, shapeType };
  }

  // ── Delete ─────────────────────────────────────────────────────────────────
  for (const alias of DELETE_LIST) {
    if (trimmed === alias) {
      return { command: 'delete' };
    }
  }

  // ── Undo ───────────────────────────────────────────────────────────────────
  for (const alias of UNDO_LIST) {
    if (trimmed === alias) {
      return { command: 'undo' };
    }
  }

  // ── Redo ───────────────────────────────────────────────────────────────────
  for (const alias of REDO_LIST) {
    if (trimmed === alias) {
      return { command: 'redo' };
    }
  }

  // ── Clear ───────────────────────────────────────────────────────────────────
  for (const alias of CLEAR_LIST) {
    if (trimmed === alias) {
      return { command: 'clearAll' };
    }
  }

  // ── English draw command ───────────────────────────────────────────────────
  const englishMatch = trimmed.match(
    /^\s*draw\s+(?:(red|blue|green|yellow|black|white|orange|purple|gray|grey|pink|#[0-9a-fA-F]{3,6})\s+)?(rectangle|square|circle|ellipse|oval|line|straightline|text|image|path|freehand|pencil)s?\s*$/i,
  );
  if (englishMatch) {
    const colorPart = englishMatch[1];
    const shapePart = englishMatch[2];
    if (!shapePart) {
      return null;
    }

    const shapeType = ENGLISH_SHAPE_MAP[shapePart.toLowerCase()] ?? null;
    if (!shapeType) {
      return null;
    }

    let color = '#000000';
    if (colorPart) {
      const lowerColor = colorPart.toLowerCase();
      color = ENGLISH_COLOR_MAP[lowerColor] ?? colorPart;
    }

    return { command: 'drawShape', color, shapeType };
  }

  return null;
}
