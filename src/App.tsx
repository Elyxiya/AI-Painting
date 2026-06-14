import { useState, useEffect, useCallback } from 'react';
import { Canvas } from '@/components/canvas/Canvas';
import { Toolbar } from '@/components/Toolbar/Toolbar';
import { LayerPanel } from '@/components/LayerPanel/LayerPanel';
import { MenuBar } from '@/components/MenuBar/MenuBar';
import { StatusBar } from '@/components/StatusBar/StatusBar';
import { PressToTalkPanel } from '@/components/PressToTalk/PressToTalkPanel';
import { ExportDialog } from '@/components/ExportDialog/ExportDialog';
import { useToolStore } from '@/stores/tool.store';
import { useUIStore } from '@/stores/ui.store';
import { useCanvasStore } from '@/stores/canvas.store';
import { useHistoryStore } from '@/stores/history.store';
import { useStageRef } from '@/components/canvas/StageRefContext';
import { useVoiceCommand } from '@/hooks/useVoiceCommand';
import { useAutoSave } from '@/hooks/useAutoSave';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { attachCanvasHistory } from '@/stores/canvas.store.history';
import { executeCommand } from '@/services/commandExecutor';
import styles from './App.module.css';

function App() {
  const { setPrimaryColor, setBrushSize } = useToolStore();
  const sidebarVisible = useUIStore((s) => s.sidebar.visible);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);

  useVoiceCommand();
  useAutoSave();

  // Wire the canvas store to the history store so every mutation is
  // automatically snapshot for undo/redo.
  useEffect(() => attachCanvasHistory(), []);

  const handleUndo = useCallback(() => {
    executeCommand({ command: 'undo' }, {
      canvasStore: { ...useCanvasStore, historyStore: useHistoryStore },
    });
  }, []);

  const handleRedo = useCallback(() => {
    executeCommand({ command: 'redo' }, {
      canvasStore: { ...useCanvasStore, historyStore: useHistoryStore },
    });
  }, []);

  useKeyboardShortcuts({ onUndo: handleUndo, onRedo: handleRedo });

  const stageRef = useStageRef();

  return (
    <div id="app" className={styles.app}>
      <MenuBar onExportRequest={() => setExportDialogOpen(true)} />
      <div className={styles.layout}>
        <Toolbar
          onColorChange={setPrimaryColor}
          onBrushSizeChange={setBrushSize}
        />
        <div className={styles.canvasArea}>
          <Canvas />
          <div className={styles.pttOverlay}>
            <PressToTalkPanel />
          </div>
        </div>
        {sidebarVisible && (
          <div className={styles.sidebar}>
            <LayerPanel />
          </div>
        )}
      </div>
      <StatusBar />
      {exportDialogOpen && stageRef?.current && (
        <ExportDialog
          stage={stageRef.current}
          onClose={() => setExportDialogOpen(false)}
        />
      )}
    </div>
  );
}

export default App;
