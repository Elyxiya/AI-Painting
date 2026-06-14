import { useState, type FC } from 'react';
import { fileService, newProject } from '@/services/fileService';
import { useFileStore } from '@/stores/file.store';
import { useCanvasStore } from '@/stores/canvas.store';
import { useUIStore } from '@/stores/ui.store';
import { useHistoryStore } from '@/stores/history.store';
import { executeCommand } from '@/services/commandExecutor';
import styles from './MenuBar.module.css';

type OpenMenu = 'file' | 'edit' | 'view' | null;

export interface MenuBarProps {
  onExportRequest?: () => void;
}

export const MenuBar: FC<MenuBarProps> = ({ onExportRequest }) => {
  const [openMenu, setOpenMenu] = useState<OpenMenu>(null);
  const canUndo = useHistoryStore((s) => s.past.length > 0);
  const canRedo = useHistoryStore((s) => s.future.length > 0);

  const handleToggle = (menu: OpenMenu) => {
    setOpenMenu((current) => (current === menu ? null : menu));
  };

  const handleClose = () => setOpenMenu(null);

  const handleNew = () => {
    useFileStore.getState().setStatus('new');
    useFileStore.getState().setCurrentProject(null);
    useHistoryStore.getState().clear();
    newProject();
    handleClose();
  };

  const handleSave = async () => {
    handleClose();
    useFileStore.getState().setSaving();
    try {
      const canvas = useCanvasStore.getState();
      const project = {
        ...newProject(),
        canvas: {
          ...newProject().canvas,
          width: canvas.width,
          height: canvas.height,
          backgroundColor: canvas.backgroundColor,
          layers: canvas.layers,
          shapes: canvas.shapes,
          layerOrder: canvas.layerOrder,
          activeLayerId: canvas.activeLayerId,
          selection: canvas.selection,
          viewport: canvas.viewport,
        },
      };
      await fileService.save(project);
      useFileStore.getState().setSaved();
    } catch {
      useFileStore.getState().setError();
    }
  };

  const handleOpen = async () => {
    handleClose();
    try {
      const project = await fileService.load();
      if (project) {
        useCanvasStore.getState().loadState(project.canvas);
        useHistoryStore.getState().clear();
        useFileStore.getState().setSaved();
      }
    } catch {
      useFileStore.getState().setError();
    }
  };

  const handleExport = () => {
    handleClose();
    onExportRequest?.();
  };

  const handleUndo = () => {
    executeCommand({ command: 'undo' }, {
      canvasStore: { ...useCanvasStore, historyStore: useHistoryStore },
    });
    handleClose();
  };

  const handleRedo = () => {
    executeCommand({ command: 'redo' }, {
      canvasStore: { ...useCanvasStore, historyStore: useHistoryStore },
    });
    handleClose();
  };

  const handleToggleSidebar = () => {
    useUIStore.getState().toggleSidebar();
    handleClose();
  };

  return (
    <div
      className={styles.menuBar}
      data-testid="menu-bar"
      onMouseLeave={handleClose}
    >
      {/* File */}
      <div className={styles.menuItem}>
        <button
          className={`${styles.trigger} ${openMenu === 'file' ? styles.active : ''}`}
          data-testid="menu-file"
          onClick={() => handleToggle('file')}
        >
          文件
        </button>
        {openMenu === 'file' && (
          <ul className={styles.dropdown} data-testid="menu-file-dropdown">
            <li>
              <button data-testid="menu-item-new" onClick={handleNew}>新建项目</button>
            </li>
            <li>
              <button data-testid="menu-item-open" onClick={handleOpen}>打开项目</button>
            </li>
            <li>
              <button data-testid="menu-item-save" onClick={handleSave}>保存</button>
            </li>
            <li>
              <button data-testid="menu-item-export" onClick={handleExport}>导出 PNG</button>
            </li>
          </ul>
        )}
      </div>

      {/* Edit */}
      <div className={styles.menuItem}>
        <button
          className={`${styles.trigger} ${openMenu === 'edit' ? styles.active : ''}`}
          data-testid="menu-edit"
          onClick={() => handleToggle('edit')}
        >
          编辑
        </button>
        {openMenu === 'edit' && (
          <ul className={styles.dropdown} data-testid="menu-edit-dropdown">
            <li>
              <button
                data-testid="menu-item-undo"
                onClick={handleUndo}
                disabled={!canUndo}
              >
                撤销
              </button>
            </li>
            <li>
              <button
                data-testid="menu-item-redo"
                onClick={handleRedo}
                disabled={!canRedo}
              >
                重做
              </button>
            </li>
          </ul>
        )}
      </div>

      {/* View */}
      <div className={styles.menuItem}>
        <button
          className={`${styles.trigger} ${openMenu === 'view' ? styles.active : ''}`}
          data-testid="menu-view"
          onClick={() => handleToggle('view')}
        >
          视图
        </button>
        {openMenu === 'view' && (
          <ul className={styles.dropdown} data-testid="menu-view-dropdown">
            <li>
              <button data-testid="menu-item-toggle-sidebar" onClick={handleToggleSidebar}>
                切换侧边栏
              </button>
            </li>
          </ul>
        )}
      </div>
    </div>
  );
};

export default MenuBar;
