import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MenuBar } from './MenuBar';
import { useFileStore } from '@/stores/file.store';
import { useCanvasStore } from '@/stores/canvas.store';
import { useUIStore } from '@/stores/ui.store';
import { useHistoryStore } from '@/stores/history.store';

vi.mock('@/services/fileService', () => ({
  fileService: {
    save: vi.fn(),
    load: vi.fn(),
    newProject: vi.fn(),
  },
  newProject: vi.fn(() => ({
    version: '1.0',
    canvas: { width: 1920, height: 1080, shapes: {} },
    file: { currentProject: null },
  })),
  deserializeProject: vi.fn(),
}));

import { fileService, newProject } from '@/services/fileService';

describe('MenuBar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useFileStore.getState().reset();
    useCanvasStore.getState().reset();
    useUIStore.getState().setSidebarVisible(true);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders all main menu triggers', () => {
    render(<MenuBar />);
    expect(screen.getByTestId('menu-file')).toBeInTheDocument();
    expect(screen.getByTestId('menu-edit')).toBeInTheDocument();
    expect(screen.getByTestId('menu-view')).toBeInTheDocument();
  });

  it('opens the file menu on click', () => {
    render(<MenuBar />);
    fireEvent.click(screen.getByTestId('menu-file'));
    expect(screen.getByTestId('menu-item-new')).toBeInTheDocument();
    expect(screen.getByTestId('menu-item-save')).toBeInTheDocument();
    expect(screen.getByTestId('menu-item-open')).toBeInTheDocument();
    expect(screen.getByTestId('menu-item-export')).toBeInTheDocument();
  });

  it('triggers a save through fileService when "save" is clicked', async () => {
    vi.mocked(fileService.save).mockResolvedValue('/tmp/proj.json');

    render(<MenuBar />);
    fireEvent.click(screen.getByTestId('menu-file'));
    fireEvent.click(screen.getByTestId('menu-item-save'));

    await waitFor(() => {
      expect(fileService.save).toHaveBeenCalledTimes(1);
    });
    expect(useFileStore.getState().status).toBe('saved');
  });

  it('marks status as error if save throws', async () => {
    vi.mocked(fileService.save).mockRejectedValue(new Error('disk full'));

    render(<MenuBar />);
    fireEvent.click(screen.getByTestId('menu-file'));
    fireEvent.click(screen.getByTestId('menu-item-save'));

    await waitFor(() => {
      expect(useFileStore.getState().status).toBe('error');
    });
  });

  it('new project resets file status to "new"', () => {
    useFileStore.getState().setStatus('saved');
    render(<MenuBar />);
    fireEvent.click(screen.getByTestId('menu-file'));
    fireEvent.click(screen.getByTestId('menu-item-new'));
    expect(useFileStore.getState().status).toBe('new');
    expect(newProject).toHaveBeenCalled();
  });

  it('open project loads state when IPC returns JSON', async () => {
    const project = {
      version: '1.0',
      canvas: {
        width: 800,
        height: 600,
        backgroundColor: '#fff',
        layers: { 'layer-default': { id: 'layer-default', name: 'l1', visible: true, locked: false, opacity: 1, blendMode: 'normal' as const, shapeIds: [] } },
        shapes: {},
        layerOrder: ['layer-default'],
        activeLayerId: 'layer-default',
        selection: { shapeIds: [], bounds: null },
        viewport: { x: 0, y: 0, scale: 1, rotation: 0 },
        isExporting: false,
      },
      tool: {
        activeTool: 'select' as const,
        brush: { color: '#000', size: 4, opacity: 1, hardness: 1 },
        colors: { primary: '#000', secondary: '#fff', recent: [] },
        drawing: { isDrawing: false, startPoint: null, currentPoint: null, tempPoints: [], tempShapeId: null },
      },
      file: { currentProject: null },
      ui: { language: 'zh-CN' as const, theme: 'light' as const, sidebar: { visible: true, width: 250, activeTab: 'layers' as const } },
    };
    vi.mocked(fileService.load).mockResolvedValue(project);

    render(<MenuBar />);
    fireEvent.click(screen.getByTestId('menu-file'));
    fireEvent.click(screen.getByTestId('menu-item-open'));

    await waitFor(() => {
      expect(useFileStore.getState().status).toBe('saved');
    });
    expect(useCanvasStore.getState().width).toBe(800);
  });

  it('edit menu undo is disabled when history is empty', () => {
    render(<MenuBar />);
    fireEvent.click(screen.getByTestId('menu-edit'));
    expect(screen.getByTestId('menu-item-undo')).toBeDisabled();
  });

  it('undo is enabled after historyStore gains a past entry', () => {
    useHistoryStore.setState({
      past: [
        {
          width: 1920, height: 1080, backgroundColor: '#fff',
          layers: {}, shapes: {}, layerOrder: [], activeLayerId: 'layer-default',
          selection: { shapeIds: [], bounds: null },
          viewport: { x: 0, y: 0, scale: 1, rotation: 0 },
          isExporting: false,
        },
      ],
      future: [],
    });

    render(<MenuBar />);
    fireEvent.click(screen.getByTestId('menu-edit'));
    expect(screen.getByTestId('menu-item-undo')).not.toBeDisabled();
  });

  it('undo button dispatches to executeCommand and restores the previous canvas state', () => {
    // Push a snapshot where shapes is empty, then add a shape so undo restores it.
    useHistoryStore.setState({
      past: [
        {
          width: 1920, height: 1080, backgroundColor: '#fff',
          layers: {}, shapes: {}, layerOrder: [], activeLayerId: 'layer-default',
          selection: { shapeIds: [], bounds: null },
          viewport: { x: 0, y: 0, scale: 1, rotation: 0 },
          isExporting: false,
        },
      ],
      future: [],
    });
    useCanvasStore.getState().addShape({
      type: 'rectangle', name: 'r', visible: true, locked: false, opacity: 1, blendMode: 'normal',
      transform: { x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1, skewX: 0, skewY: 0 },
      width: 10, height: 10, fill: '#000',
    });
    expect(Object.keys(useCanvasStore.getState().shapes)).toHaveLength(1);

    render(<MenuBar />);
    fireEvent.click(screen.getByTestId('menu-edit'));
    fireEvent.click(screen.getByTestId('menu-item-undo'));

    expect(Object.keys(useCanvasStore.getState().shapes)).toHaveLength(0);
  });

  it('view menu toggles sidebar visibility', () => {
    render(<MenuBar />);
    fireEvent.click(screen.getByTestId('menu-view'));
    const sidebarToggle = screen.getByTestId('menu-item-toggle-sidebar');
    expect(sidebarToggle).toBeInTheDocument();
    fireEvent.click(sidebarToggle);
    expect(useUIStore.getState().sidebar.visible).toBe(false);
  });

  it('export menu item fires the onExportRequest callback', () => {
    const onExportRequest = vi.fn();
    render(<MenuBar onExportRequest={onExportRequest} />);
    fireEvent.click(screen.getByTestId('menu-file'));
    fireEvent.click(screen.getByTestId('menu-item-export'));
    expect(onExportRequest).toHaveBeenCalledTimes(1);
  });
});
