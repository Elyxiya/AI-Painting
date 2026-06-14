import { useState } from 'react';
import { Canvas } from '@/components/canvas/Canvas';
import { Toolbar } from '@/components/Toolbar/Toolbar';
import { LayerPanel } from '@/components/LayerPanel/LayerPanel';
import { MenuBar } from '@/components/MenuBar/MenuBar';
import { StatusBar } from '@/components/StatusBar/StatusBar';
import { PressToTalkPanel } from '@/components/PressToTalk/PressToTalkPanel';
import { ExportDialog } from '@/components/ExportDialog/ExportDialog';
import { useToolStore } from '@/stores/tool.store';
import { useUIStore } from '@/stores/ui.store';
import { useStageRef } from '@/components/canvas/StageRefContext';
import { useVoiceCommand } from '@/hooks/useVoiceCommand';
import { useAutoSave } from '@/hooks/useAutoSave';
import styles from './App.module.css';

function App() {
  const { setPrimaryColor, setBrushSize } = useToolStore();
  const sidebarVisible = useUIStore((s) => s.sidebar.visible);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);

  // Activate background hooks that wire up voice → commands and the
  // 60-second auto-save timer.
  useVoiceCommand();
  useAutoSave();

  // The Konva stage ref is exposed by Canvas via context, so the export
  // dialog can read it from anywhere in the tree.
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
