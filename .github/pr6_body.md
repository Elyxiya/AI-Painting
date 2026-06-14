# PR-06: PTT 按住说话按钮

## 依赖
- 基于 PR-04 (layer-system) + PR-05 (whisper-asr)，本分支包含前两个 PR 的所有变更

## 功能描述
界面底部居中显示圆形 PTT 按钮，按住录音，松开识别。按钮状态：空闲（蓝色）、录音中（红色闪烁）、识别中（黄色）。

## 实现思路
- `PressToTalkButton` 组件，监听 mousedown/mouseup/touchstart/touchend
- 按下时调用 `whisperService.startRecording()`，松开时调用 `stopRecording()`
- 识别结果存入 `voiceStore.currentTranscript`

## 测试方式
```bash
npm run typecheck
npm run lint
npm run test
```

## 关联内容
- 重点文件: src/components/PressToTalk/PressToTalkButton.tsx, src/components/PressToTalk/PressToTalkPanel.tsx
