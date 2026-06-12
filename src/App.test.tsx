import { test, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from './App';

test('App renders without crashing', () => {
  render(<App />);
  expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
});

test('App displays AI-Painting title', () => {
  render(<App />);
  expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('AI-Painting');
});

test('App shows status panel', () => {
  render(<App />);
  expect(screen.getByTestId('app-status')).toHaveTextContent('就绪');
});

test('App shows feature list', () => {
  render(<App />);
  expect(screen.getByText('画布引擎 (Konva.js)')).toBeInTheDocument();
  expect(screen.getByText('语音交互 (Whisper)')).toBeInTheDocument();
  expect(screen.getByText('文件保存 (JSON + PNG)')).toBeInTheDocument();
});
