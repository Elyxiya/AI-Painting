import type { ShapeType } from '@/shared/types';

const COLOR_ALIASES: Record<string, string> = {
  红色: '#FF0000',
  蓝色: '#0000FF',
  绿色: '#00FF00',
  黄色: '#FFFF00',
  黑色: '#000000',
  白色: '#FFFFFF',
  橙色: '#FFA500',
  紫色: '#800080',
  灰色: '#808080',
  粉色: '#FFC0CB',
  红: '#FF0000',
  蓝: '#0000FF',
  绿: '#00FF00',
  黄: '#FFFF00',
  黑: '#000000',
  白: '#FFFFFF',
  橙: '#FFA500',
  紫: '#800080',
  灰: '#808080',
};

export function mapColorAlias(chinese: string): string {
  if (chinese.startsWith('#')) {
    return chinese;
  }
  return COLOR_ALIASES[chinese] ?? chinese;
}

const SHAPE_ALIASES: Record<string, ShapeType> = {
  矩形: 'rectangle',
  长方形: 'rectangle',
  正方形: 'rectangle',
  圆: 'ellipse',
  圆形: 'ellipse',
  椭圆: 'ellipse',
  圆圈: 'ellipse',
  直线: 'line',
  线条: 'line',
  线: 'line',
  文字: 'text',
  文本: 'text',
  图片: 'image',
  画笔: 'path',
  自由: 'path',
};

export function mapShapeAlias(chinese: string): ShapeType | null {
  return SHAPE_ALIASES[chinese] ?? null;
}
