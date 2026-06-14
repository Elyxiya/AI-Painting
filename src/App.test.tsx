import { test, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('@/components/canvas/Canvas', () => ({
  Canvas: () => <div data-testid="mock-canvas">Canvas</div>,
}));

vi.mock('@/hooks/useAutoSave', () => ({
  useAutoSave: () => undefined,
}));

vi.mock('@/hooks/useVoiceCommand', () => ({
  useVoiceCommand: () => undefined,
}));

vi.mock('@/hooks/useKeyboardShortcuts', () => ({
  useKeyboardShortcuts: () => undefined,
}));

vi.mock('@/stores/canvas.store.history', () => ({
  attachCanvasHistory: () => () => undefined,
}));

import App from './App';

test('App renders without crashing', () => {
  render(<App />);
  expect(screen.getByTestId('mock-canvas')).toBeInTheDocument();
});

test('App renders toolbar with tool buttons', () => {
  render(<App />);
  expect(screen.getByTitle('选择')).toBeInTheDocument();
  expect(screen.getByTitle('画笔')).toBeInTheDocument();
  expect(screen.getByTitle('橡皮')).toBeInTheDocument();
});

test('App renders brush size control', () => {
  render(<App />);
  expect(screen.getByTitle('前景色')).toBeInTheDocument();
  const slider = screen.getByRole('slider');
  expect(slider).toBeInTheDocument();
});

test('App renders canvas area', () => {
  render(<App />);
  const appDiv = document.getElementById('app');
  expect(appDiv).toBeInTheDocument();
  expect(screen.getByTestId('mock-canvas')).toBeInTheDocument();
});

test('App renders the UI shell: menu bar, status bar, press-to-talk panel, layer panel', () => {
  render(<App />);
  expect(screen.getByTestId('menu-bar')).toBeInTheDocument();
  expect(screen.getByTestId('status-bar')).toBeInTheDocument();
  expect(screen.getByTestId('ptt-panel')).toBeInTheDocument();
  expect(screen.getByTestId('ptt-button')).toBeInTheDocument();
  // LayerPanel renders its own root; assert via the sidebar presence.
  expect(document.querySelector('[class*="sidebar"]')).toBeInTheDocument();
});
