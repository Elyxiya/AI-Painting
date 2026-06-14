import { describe, it, expect } from 'vitest';
import { parseCommand } from './commandParser';

describe('parseCommand - drawShape', () => {
  function expectDraw(result: ReturnType<typeof parseCommand>, color: string, shape: string) {
    expect(result).not.toBeNull();
    if (result?.command === 'drawShape') {
      expect(result.color).toBe(color);
      expect(result.shapeType).toBe(shape);
    } else {
      throw new Error(`Expected drawShape command, got ${result?.command}`);
    }
  }

  it('parses 画红色矩形 as drawShape command with red rectangle', () => {
    const result = parseCommand('画红色矩形');
    expect(result?.command).toBe('drawShape');
    expectDraw(result, '#FF0000', 'rectangle');
  });

  it('parses 画蓝色的圆 as drawShape command with blue ellipse', () => {
    const result = parseCommand('画蓝色的圆');
    expect(result?.command).toBe('drawShape');
    expectDraw(result, '#0000FF', 'ellipse');
  });

  it('parses 画绿色直线 as drawShape command with green line', () => {
    const result = parseCommand('画绿色直线');
    expect(result?.command).toBe('drawShape');
    expectDraw(result, '#00FF00', 'line');
  });

  it('parses 画一个红色的矩形 (with quantifier)', () => {
    const result = parseCommand('画一个红色的矩形');
    expect(result?.command).toBe('drawShape');
    expectDraw(result, '#FF0000', 'rectangle');
  });

  it('ignores extra whitespace', () => {
    const result = parseCommand('  画  红色  矩形  ');
    expect(result?.command).toBe('drawShape');
    expectDraw(result, '#FF0000', 'rectangle');
  });

  it('returns a drawShape command with default black for unrecognized color', () => {
    // '彩色' is not in the color alias map; parser falls back to default #000000
    const result = parseCommand('画彩色的矩形');
    expect(result?.command).toBe('drawShape');
    if (result?.command === 'drawShape') {
      expect(result.color).toBe('#000000');
      expect(result.shapeType).toBe('rectangle');
    }
  });

  it('parses 画黄色圆形', () => {
    const result = parseCommand('画黄色圆形');
    expect(result?.command).toBe('drawShape');
    expectDraw(result, '#FFFF00', 'ellipse');
  });

  it('parses 画黑色正方形', () => {
    const result = parseCommand('画黑色正方形');
    expect(result?.command).toBe('drawShape');
    expectDraw(result, '#000000', 'rectangle');
  });

  it('parses 画白色文字', () => {
    const result = parseCommand('画白色文字');
    expect(result?.command).toBe('drawShape');
    expectDraw(result, '#FFFFFF', 'text');
  });

  it('parses 画橙色线条', () => {
    const result = parseCommand('画橙色线条');
    expect(result?.command).toBe('drawShape');
    expectDraw(result, '#FFA500', 'line');
  });

  it('parses 画紫色椭圆', () => {
    const result = parseCommand('画紫色椭圆');
    expect(result?.command).toBe('drawShape');
    expectDraw(result, '#800080', 'ellipse');
  });

  it('parses 画灰色矩形', () => {
    const result = parseCommand('画灰色矩形');
    expect(result?.command).toBe('drawShape');
    expectDraw(result, '#808080', 'rectangle');
  });

  it('parses 画粉色圆圈', () => {
    const result = parseCommand('画粉色圆圈');
    expect(result?.command).toBe('drawShape');
    expectDraw(result, '#FFC0CB', 'ellipse');
  });

  it('parses 画蓝色图片', () => {
    const result = parseCommand('画蓝色图片');
    expect(result?.command).toBe('drawShape');
    expectDraw(result, '#0000FF', 'image');
  });

  it('parses 画绿色画笔', () => {
    const result = parseCommand('画绿色画笔');
    expect(result?.command).toBe('drawShape');
    expectDraw(result, '#00FF00', 'path');
  });

  it('parses 画红色自由', () => {
    const result = parseCommand('画红色自由');
    expect(result?.command).toBe('drawShape');
    expectDraw(result, '#FF0000', 'path');
  });
});

describe('parseCommand - delete', () => {
  it('parses 删除 as delete command', () => {
    expect(parseCommand('删除')?.command).toBe('delete');
  });

  it('parses 删掉 as delete command', () => {
    expect(parseCommand('删掉')?.command).toBe('delete');
  });

  it('parses 清除 as delete command', () => {
    expect(parseCommand('清除')?.command).toBe('delete');
  });
});

describe('parseCommand - undo', () => {
  it('parses 撤销 as undo command', () => {
    expect(parseCommand('撤销')?.command).toBe('undo');
  });
});

describe('parseCommand - redo', () => {
  it('parses 重做 as redo command', () => {
    expect(parseCommand('重做')?.command).toBe('redo');
  });
});

describe('parseCommand - clearAll', () => {
  it('parses 清空 as clearAll command', () => {
    expect(parseCommand('清空')?.command).toBe('clearAll');
  });
});

describe('parseCommand - edge cases', () => {
  it('returns null for empty string', () => {
    expect(parseCommand('')).toBeNull();
  });

  it('returns null for whitespace-only string', () => {
    expect(parseCommand('   ')).toBeNull();
    expect(parseCommand('\t\n')).toBeNull();
  });

  it('returns null for unrecognized command', () => {
    expect(parseCommand('你好世界')).toBeNull();
    expect(parseCommand('打开文件')).toBeNull();
  });

  it('parses English draw command', () => {
    const result = parseCommand('draw red rectangle');
    expect(result?.command).toBe('drawShape');
    if (result?.command === 'drawShape') {
      expect(result.color).toBe('#FF0000');
      expect(result.shapeType).toBe('rectangle');
    }
  });

  it('parses English draw command with blue circle', () => {
    const result = parseCommand('draw blue circle');
    expect(result?.command).toBe('drawShape');
    if (result?.command === 'drawShape') {
      expect(result.color).toBe('#0000FF');
      expect(result.shapeType).toBe('ellipse');
    }
  });
});
