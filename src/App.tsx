import { Canvas } from '@/components/canvas/Canvas';
import { Toolbar } from '@/components/Toolbar/Toolbar';
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
      </div>
    </div>
  );
}

export default App;
