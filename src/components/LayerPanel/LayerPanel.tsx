import React, { useState } from 'react';
import { useCanvasStore } from '@/stores/canvas.store';
import styles from './LayerPanel.module.css';

export const LayerPanel: React.FC = () => {
  const layers = useCanvasStore((s) => s.layers);
  const layerOrder = useCanvasStore((s) => s.layerOrder);
  const addLayer = useCanvasStore((s) => s.addLayer);
  const deleteLayer = useCanvasStore((s) => s.deleteLayer);
  const updateLayer = useCanvasStore((s) => s.updateLayer);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftName, setDraftName] = useState('');
  const [activeLayerId, setActiveLayerId] = useState<string | null>(null);

  const commitRename = (id: string) => {
    const trimmed = draftName.trim();
    if (trimmed) {
      updateLayer(id, { name: trimmed });
    }
    setEditingId(null);
    setDraftName('');
  };

  // The store's layerOrder is ordered top→bottom (visual order, like
  // Photoshop/Sketch panels). We render them in the same order, top to bottom.
  const displayOrder = layerOrder;

  return (
    <div className={styles.panel} data-testid="layer-panel">
      <div className={styles.header}>
        <span>图层</span>
        <button
          className={styles.addBtn}
          data-testid="btn-add-layer"
          onClick={() => addLayer()}
          title="新建图层"
        >
          +
        </button>
      </div>

      <div className={styles.list}>
        {displayOrder.map((layerId) => {
          const layer = layers[layerId];
          if (!layer) return null;
          const isOnly = layerOrder.length <= 1;
          return (
            <div
              key={layerId}
              className={[
                styles.item,
                activeLayerId === layerId ? styles.active : '',
                !layer.visible ? styles.invisible : '',
              ]
                .filter(Boolean)
                .join(' ')}
              data-testid="layer-item"
              data-layer-id={layerId}
              onClick={() => setActiveLayerId(layerId)}
            >
              <button
                className={styles.iconBtn}
                data-testid={`btn-toggle-visible-${layerId}`}
                onClick={(e) => {
                  e.stopPropagation();
                  updateLayer(layerId, { visible: !layer.visible });
                }}
                title={layer.visible ? '隐藏图层' : '显示图层'}
                aria-label="toggle visibility"
              >
                {layer.visible ? '👁' : '⊘'}
              </button>
              <button
                className={styles.iconBtn}
                data-testid={`btn-toggle-locked-${layerId}`}
                onClick={(e) => {
                  e.stopPropagation();
                  updateLayer(layerId, { locked: !layer.locked });
                }}
                title={layer.locked ? '解锁图层' : '锁定图层'}
                aria-label="toggle lock"
              >
                {layer.locked ? '🔒' : '🔓'}
              </button>
              {editingId === layerId ? (
                <input
                  className={styles.nameInput}
                  data-testid={`layer-name-input-${layerId}`}
                  value={draftName}
                  autoFocus
                  onChange={(e) => setDraftName(e.target.value)}
                  onBlur={() => commitRename(layerId)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') commitRename(layerId);
                    if (e.key === 'Escape') {
                      setEditingId(null);
                      setDraftName('');
                    }
                  }}
                />
              ) : (
                <span
                  className={styles.name}
                  data-testid={`layer-name-${layerId}`}
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    setEditingId(layerId);
                    setDraftName(layer.name);
                  }}
                >
                  {layer.name}
                </span>
              )}
              <button
                className={styles.iconBtn}
                data-testid={`btn-delete-layer-${layerId}`}
                onClick={(e) => {
                  e.stopPropagation();
                  deleteLayer(layerId);
                }}
                disabled={isOnly}
                title={isOnly ? '至少保留一个图层' : '删除图层'}
                aria-label="delete layer"
              >
                🗑
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default LayerPanel;
