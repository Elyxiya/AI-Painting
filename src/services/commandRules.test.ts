import { describe, it, expect } from 'vitest';
import { mapColorAlias, mapShapeAlias } from './commandRules';

describe('mapColorAlias', () => {
  it('maps red color alias to #FF0000', () => {
    expect(mapColorAlias('红')).toBe('#FF0000');
  });

  it('maps blue color alias to #0000FF', () => {
    expect(mapColorAlias('蓝')).toBe('#0000FF');
  });

  it('maps green color alias to #00FF00', () => {
    expect(mapColorAlias('绿')).toBe('#00FF00');
  });

  it('maps yellow color alias to #FFFF00', () => {
    expect(mapColorAlias('黄')).toBe('#FFFF00');
  });

  it('maps black color alias to #000000', () => {
    expect(mapColorAlias('黑')).toBe('#000000');
  });

  it('maps white color alias to #FFFFFF', () => {
    expect(mapColorAlias('白')).toBe('#FFFFFF');
  });

  it('maps orange color alias to #FFA500', () => {
    expect(mapColorAlias('橙')).toBe('#FFA500');
  });

  it('maps purple color alias to #800080', () => {
    expect(mapColorAlias('紫')).toBe('#800080');
  });

  it('maps gray color alias to #808080', () => {
    expect(mapColorAlias('灰')).toBe('#808080');
  });

  it('maps pink color alias to #FFC0CB', () => {
    expect(mapColorAlias('粉色')).toBe('#FFC0CB');
  });

  it('returns hex color as-is', () => {
    expect(mapColorAlias('#FF0000')).toBe('#FF0000');
    expect(mapColorAlias('#abc')).toBe('#abc');
  });

  it('returns unknown color alias unchanged', () => {
    expect(mapColorAlias('不存在')).toBe('不存在');
    expect(mapColorAlias('金色')).toBe('金色');
  });
});

describe('mapShapeAlias', () => {
  it('maps 矩形 to rectangle', () => {
    expect(mapShapeAlias('矩形')).toBe('rectangle');
  });

  it('maps 长方形 to rectangle', () => {
    expect(mapShapeAlias('长方形')).toBe('rectangle');
  });

  it('maps 正方形 to rectangle', () => {
    expect(mapShapeAlias('正方形')).toBe('rectangle');
  });

  it('maps 圆 to ellipse', () => {
    expect(mapShapeAlias('圆')).toBe('ellipse');
  });

  it('maps 圆形 to ellipse', () => {
    expect(mapShapeAlias('圆形')).toBe('ellipse');
  });

  it('maps 椭圆 to ellipse', () => {
    expect(mapShapeAlias('椭圆')).toBe('ellipse');
  });

  it('maps 圆圈 to ellipse', () => {
    expect(mapShapeAlias('圆圈')).toBe('ellipse');
  });

  it('maps 直线 to line', () => {
    expect(mapShapeAlias('直线')).toBe('line');
  });

  it('maps 线 to line', () => {
    expect(mapShapeAlias('线')).toBe('line');
  });

  it('maps 文字 to text', () => {
    expect(mapShapeAlias('文字')).toBe('text');
  });

  it('maps 文本 to text', () => {
    expect(mapShapeAlias('文本')).toBe('text');
  });

  it('maps 图片 to image', () => {
    expect(mapShapeAlias('图片')).toBe('image');
  });

  it('maps 画笔 to path', () => {
    expect(mapShapeAlias('画笔')).toBe('path');
  });

  it('maps 自由 to path', () => {
    expect(mapShapeAlias('自由')).toBe('path');
  });

  it('returns null for unknown shape alias', () => {
    expect(mapShapeAlias('不存在')).toBeNull();
    expect(mapShapeAlias('三角形')).toBeNull();
  });
});
