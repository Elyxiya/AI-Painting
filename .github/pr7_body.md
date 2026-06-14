# PR-07: 正则命令解析引擎

## 功能描述
将语音识别文字解析为绘图命令并执行。支持的命令模式：
- `画[颜色][形状]` → 如 "画红色矩形"、"画蓝色的圆"
- `删除` → 删除选中形状

## 实现思路
- `commandParser.ts` 维护规则列表，每条规则包含正则 + action handler
- 规则按优先级顺序匹配，命中后执行对应状态更新
- 支持颜色别名映射（"红"→"#FF0000", "蓝"→"#0000FF"）

## 测试方式
```bash
npm run typecheck
npm run lint
npm run test
```

## 关联内容
- 重点文件: src/services/commandParser.ts, src/services/commandRules.ts, src/services/commandExecutor.ts
