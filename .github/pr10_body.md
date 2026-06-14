# PR-10: 项目导出（PNG/JPEG）

## 功能描述
将当前画布导出为 PNG 或 JPEG 图片，支持自定义分辨率（1x / 2x / 3x）。

## 实现思路
- 使用 Konva `stage.toDataURL()` 导出画布内容
- 通过 `file:export-png` IPC 保存到用户指定路径
- 导出对话框支持格式选择和分辨率选择

## 测试方式
```bash
npm run typecheck
npm run lint
npm run test
```

## 关联内容
- 重点文件: src/renderer/services/exportService.ts, src/renderer/components/ExportDialog/ExportDialog.tsx
