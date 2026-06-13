import { Canvas } from '@/components/canvas/Canvas';
import { Toolbar } from '@/components/Toolbar/Toolbar';
import { LayerPanel } from '@/components/LayerPanel/LayerPanel';
import { useToolStore } from '@/stores/tool.store';
import styles from './App.module.css';

function App() {
  const { setPrimaryColor, setBrushSize } = useToolStore();

  return (
    <div id="app" className={styles.app}>
      <div className={styles.layout}>
        <Toolbar
          onColorChange={setPrimaryColor}
          onBrushSizeChange={setBrushSize}
        />
        <div className={styles.canvasArea}>
          <Canvas />
        </div>
        <div className={styles.sidebar}>
          <LayerPanel />
        </div>
      </div>
    </div>
  );
}

export default App;
