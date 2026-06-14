# PR-04: 多图层系统

## Summary
- 新增 `LayerPanel` 组件：新建 / 删除 / 隐藏 / 锁定 / 重命名图层
- 扩展 `canvasStore`：`activeLayerId`、`setActiveLayer`、`canDrawOnActiveLayer`、新建图层自动激活
- 16 个图层状态单元测试 + 9 个组件集成测试
- 修复 `getActiveLayerId` 优先尊重 `activeLayerId`（之前只取 layerOrder 第一个）

## Test Plan
- [x] `npm run typecheck` 零错误
- [x] `npm run lint` 零警告
- [x] `npm run test` 29/29 通过
  - 16 个图层状态测试
  - 9 个 LayerPanel 组件测试
  - 4 个 App 布局测试

## Checklist
- [x] 每个 PR 独立可运行（main 分支已合入 PR-01~03，本 PR 在其之上叠加）
- [x] 测试金字塔：单元测试（store 状态）+ 集成测试（组件交互）
- [x] TDD 红-绿-重构循环：先写测试看到失败，再实现
- [x] 锁定的图层删除按钮被禁用
- [x] 删除最后一个图层被拒绝
- [x] 删除图层级联清理其所有形状
- [x] 图层顺序语义：layerOrder[0] = 面板最上 = Konva 最上层
