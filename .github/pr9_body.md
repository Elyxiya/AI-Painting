# PR-09: 自动保存与状态通知

## 功能描述
每隔 60 秒自动保存项目，保存时在状态栏显示保存状态（已保存 / 保存中 / 保存失败）。

## 实现思路
- `fileStore` 管理 `status: 'saved' | 'modified' | 'saving' | 'error'`
- 状态变更时触发通知：`file:modified` → 显示未保存标记 → 定时器到期 → `file:saving` → IPC 保存 → `file:saved`
- 状态栏组件订阅 `fileStore.status` 实时显示

## 测试方式
```bash
npm run typecheck
npm run lint
npm run test
```

## 关联内容
- 重点文件: src/stores/file.store.ts, src/hooks/useAutoSave.ts, src/components/StatusBar/StatusBar.tsx
