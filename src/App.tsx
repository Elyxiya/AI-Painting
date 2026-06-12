import { useEffect, useState } from 'react';
import './App.css';

function App() {
  const [appVersion, setAppVersion] = useState<string>('');
  const [platform, setPlatform] = useState<string>('');

  useEffect(() => {
    if (window.electronAPI) {
      window.electronAPI.getAppVersion().then(setAppVersion);
      window.electronAPI.getPlatform().then(setPlatform);
    } else {
      setAppVersion('dev');
      setPlatform('web');
    }
  }, []);

  return (
    <div className="app">
      <header className="app-header">
        <h1>AI-Painting</h1>
        <p className="subtitle">Electron + Konva.js 智能绘图应用</p>
      </header>

      <main className="app-main">
        <section className="status-panel">
          <div className="status-item">
            <span className="status-label">版本</span>
            <span className="status-value" data-testid="app-version">{appVersion || '加载中...'}</span>
          </div>
          <div className="status-item">
            <span className="status-label">平台</span>
            <span className="status-value" data-testid="platform">{platform || '检测中...'}</span>
          </div>
          <div className="status-item">
            <span className="status-label">状态</span>
            <span className="status-value status-ready" data-testid="app-status">就绪</span>
          </div>
        </section>

        <section className="info-panel">
          <h2>功能模块</h2>
          <ul>
            <li>画布引擎 (Konva.js)</li>
            <li>绘图工具 (7种工具)</li>
            <li>图层管理</li>
            <li>语音交互 (Whisper)</li>
            <li>文件保存 (JSON + PNG)</li>
            <li>命令解析引擎</li>
          </ul>
        </section>
      </main>
    </div>
  );
}

export default App;
