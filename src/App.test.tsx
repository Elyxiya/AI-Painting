import { test, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { vi } from 'vitest';

vi.mock('@/components/canvas/Canvas', () => ({
  Canvas: () => <div data-testid="mock-canvas">Canvas</div>,
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
