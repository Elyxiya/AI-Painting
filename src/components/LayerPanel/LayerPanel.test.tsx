import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LayerPanel } from './LayerPanel';
import { useCanvasStore } from '@/stores/canvas.store';

describe('LayerPanel', () => {
  beforeEach(() => {
    useCanvasStore.getState().reset();
  });

  it('renders a panel with a header', () => {
    render(<LayerPanel />);
    expect(screen.getByTestId('layer-panel')).toBeInTheDocument();
    expect(screen.getByText('图层')).toBeInTheDocument();
  });

  it('renders a default layer on mount', () => {
    render(<LayerPanel />);
    const items = screen.getAllByTestId('layer-item');
    expect(items.length).toBeGreaterThan(0);
  });

  it('adds a new layer when the + button is clicked', async () => {
    const user = userEvent.setup();
    const before = useCanvasStore.getState().layerOrder.length;
    render(<LayerPanel />);
    await user.click(screen.getByTestId('btn-add-layer'));
    expect(useCanvasStore.getState().layerOrder.length).toBe(before + 1);
  });

  it('deletes a layer when the trash button is clicked', async () => {
    const user = userEvent.setup();
    const id = useCanvasStore.getState().addLayer('to-delete');
    expect(useCanvasStore.getState().layers[id]).toBeDefined();
    render(<LayerPanel />);
    const deleteBtn = screen.getByTestId(`btn-delete-layer-${id}`);
    await user.click(deleteBtn);
    expect(useCanvasStore.getState().layers[id]).toBeUndefined();
  });

  it('disables the delete button for the last layer', () => {
    useCanvasStore.getState().reset();
    const onlyId = useCanvasStore.getState().layerOrder[0]!;
    render(<LayerPanel />);
    const deleteBtn = screen.getByTestId(`btn-delete-layer-${onlyId}`);
    expect(deleteBtn).toBeDisabled();
  });

  it('toggles a layer\'s visibility when the eye button is clicked', async () => {
    const user = userEvent.setup();
    const id = useCanvasStore.getState().addLayer('eye');
    expect(useCanvasStore.getState().layers[id]!.visible).toBe(true);
    render(<LayerPanel />);
    await user.click(screen.getByTestId(`btn-toggle-visible-${id}`));
    expect(useCanvasStore.getState().layers[id]!.visible).toBe(false);
    await user.click(screen.getByTestId(`btn-toggle-visible-${id}`));
    expect(useCanvasStore.getState().layers[id]!.visible).toBe(true);
  });

  it('toggles a layer\'s locked state when the lock button is clicked', async () => {
    const user = userEvent.setup();
    const id = useCanvasStore.getState().addLayer('lock');
    expect(useCanvasStore.getState().layers[id]!.locked).toBe(false);
    render(<LayerPanel />);
    await user.click(screen.getByTestId(`btn-toggle-locked-${id}`));
    expect(useCanvasStore.getState().layers[id]!.locked).toBe(true);
  });

  it('renames a layer when its label is double-clicked then edited', async () => {
    const user = userEvent.setup();
    const id = useCanvasStore.getState().addLayer('原名');
    render(<LayerPanel />);
    const nameSpan = screen.getByTestId(`layer-name-${id}`);
    await user.dblClick(nameSpan);
    const input = screen.getByTestId(`layer-name-input-${id}`) as HTMLInputElement;
    await user.clear(input);
    await user.type(input, '新名称{enter}');
    expect(useCanvasStore.getState().layers[id]!.name).toBe('新名称');
  });

  it('renders layers in the order defined by layerOrder (top = front)', () => {
    const a = useCanvasStore.getState().addLayer('A');
    const b = useCanvasStore.getState().addLayer('B');
    useCanvasStore.getState().reorderLayers([b, a]);
    render(<LayerPanel />);
    const items = screen.getAllByTestId('layer-item');
    const ids = items.map((el) => el.getAttribute('data-layer-id'));
    expect(ids).toEqual([b, a]);
  });
});
