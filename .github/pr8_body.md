# PR-08: 文件保存与加载（主进程 IPC）

## 功能描述
通过 Electron IPC 将项目状态从渲染进程保存到主进程的 JSON 文件，支持新建项目、打开项目、保存（Ctrl+S）。

## 实现思路
- 主进程注册 `file:save`、`file:open`、`file:new` IPC 通道
- 使用 Electron `dialog` API 显示原生文件选择框
- JSON 文件格式：`{ version, metadata, canvas, layers, shapes, viewport, settings }`
- 保存时通过 Preload `electronAPI.file.save()` 调用

## 测试方式
```bash
npm run typecheck
npm run lint
npm run test
```

## 关联内容
- 重点文件: src/main/ipc/file.ipc.ts, src/preload/index.ts, src/renderer/services/fileService.ts
