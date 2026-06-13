import { test, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from './App';

test('App renders without crashing', () => {
  render(<App />);
  expect(screen.getByTestId('app-status')).toBeInTheDocument();
});

test('App shows ready status', () => {
  render(<App />);
  expect(screen.getByTestId('app-status')).toHaveTextContent('就绪');
});
