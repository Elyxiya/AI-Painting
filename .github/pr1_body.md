## 功能描述
建立项目基础配置与目录结构，包含 shared types、constants、IPC 通道、EventBus 事件总线，以及 Electron main/preload 的基础 IPC 处理。

## 实现思路
- 使用 electron-vite 作为构建工具，整合 Vite + Electron
- 主进程处理窗口创建和 IPC 注册，渲染进程运行 React 应用
- Preload 脚本通过 `contextBridge` 安全暴露 `electronAPI`
- 基础目录结构：`src/shared/`、`electron/`

## 测试方式
```bash
npm run typecheck  # 零类型错误
npm run lint       # 零警告
npm run test       # Vitest 单元测试通过
```

## 关联内容
- 重点文件: src/shared/, electron/main.ts, electron/preload.ts
