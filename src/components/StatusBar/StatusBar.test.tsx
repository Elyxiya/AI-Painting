import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StatusBar } from './StatusBar';
import { useFileStore } from '@/stores/file.store';

describe('StatusBar', () => {
  beforeEach(() => {
    useFileStore.getState().reset();
  });

  it('shows "未保存" when status is new', () => {
    render(<StatusBar />);
    expect(screen.getByTestId('status-bar')).toHaveTextContent('未保存');
  });

  it('shows "已保存" when status is saved', () => {
    const store = useFileStore.getState();
    store.setStatus('saved');
    render(<StatusBar />);
    expect(screen.getByTestId('status-bar')).toHaveTextContent('已保存');
  });

  it('shows "已修改" when status is modified', () => {
    const store = useFileStore.getState();
    store.markModified();
    render(<StatusBar />);
    expect(screen.getByTestId('status-bar')).toHaveTextContent('已修改');
  });

  it('shows "保存中..." when status is saving', () => {
    const store = useFileStore.getState();
    store.setSaving();
    render(<StatusBar />);
    expect(screen.getByTestId('status-bar')).toHaveTextContent('保存中...');
  });

  it('shows "保存失败" when status is error', () => {
    const store = useFileStore.getState();
    store.setError();
    render(<StatusBar />);
    expect(screen.getByTestId('status-bar')).toHaveTextContent('保存失败');
  });

  it('has correct class for new status', () => {
    render(<StatusBar />);
    expect(screen.getByTestId('status-bar').className).toContain('status-new');
  });

  it('has correct class for saved status', () => {
    useFileStore.getState().setStatus('saved');
    render(<StatusBar />);
    expect(screen.getByTestId('status-bar').className).toContain('status-saved');
  });

  it('has correct class for modified status', () => {
    useFileStore.getState().markModified();
    render(<StatusBar />);
    expect(screen.getByTestId('status-bar').className).toContain('status-modified');
  });

  it('has correct class for saving status', () => {
    useFileStore.getState().setSaving();
    render(<StatusBar />);
    expect(screen.getByTestId('status-bar').className).toContain('status-saving');
  });

  it('has correct class for error status', () => {
    useFileStore.getState().setError();
    render(<StatusBar />);
    expect(screen.getByTestId('status-bar').className).toContain('status-error');
  });
});
