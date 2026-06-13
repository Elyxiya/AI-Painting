import '@testing-library/jest-dom';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

// Mock Konva to avoid Node.js canvas dependency in jsdom
vi.mock('konva', () => {
  const EventEmitter = {
    on: vi.fn(),
    off: vi.fn(),
    fire: vi.fn(),
    listen: vi.fn(),
    setListening: vi.fn(),
    create: vi.fn(),
  };

  return {
    Konva: { EventEmitter },
    Stage: vi.fn(),
    Layer: vi.fn(),
    Rect: vi.fn(),
    Ellipse: vi.fn(),
    Line: vi.fn(),
    Path: vi.fn(),
    Text: vi.fn(),
    default: {
      Stage: vi.fn(),
      Layer: vi.fn(),
      Rect: vi.fn(),
      Ellipse: vi.fn(),
      Line: vi.fn(),
      Path: vi.fn(),
      Text: vi.fn(),
    },
  };
});

vi.mock('react-konva', () => ({
  Stage: vi.fn(),
  Layer: vi.fn(),
  Rect: vi.fn(),
  Ellipse: vi.fn(),
  Line: vi.fn(),
  Path: vi.fn(),
  Text: vi.fn(),
}));

afterEach(() => {
  cleanup();
});
