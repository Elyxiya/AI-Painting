# PR-05: Whisper 语音识别

## 依赖
- 基于 PR-04 (layer-system)，本分支包含 PR-04 的所有变更

## 功能描述
集成 Whisper WebAssembly 模型 (base) 在浏览器端进行语音转文字，支持中文和英文。

## 实现思路
- 使用 `@xenova/transformers` 加载 Whisper base 模型（WASM/WebGL 后端）
- 录音通过 `MediaRecorder` API 采集 PCM 数据
- 音频片段传入模型推理，返回文字结果
- 识别结果通过 Zustand `voiceStore` 管理

## 测试方式
```bash
npm run typecheck
npm run lint
npm run test
```

## 关联内容
- 重点文件: src/services/whisper.service.ts, src/stores/voice.store.ts, src/hooks/useWhisper.ts
