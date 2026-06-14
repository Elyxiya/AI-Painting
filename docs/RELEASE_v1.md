# AI-Painting v1.0 Release Notes

> 发布日期：2026-06-14

---

## 安装

```bash
npm install
npm run electron:build
# 产物: release/AI-Painting Setup x.x.x.exe
```

---

## v1.0 功能清单

| 模块 | 功能 | PR |
|------|------|-----|
| **画布** | Konva Stage + Layer 架构、滚轮缩放（0.1x-10x）、拖拽平移 | PR-02 |
| **绘图工具** | 矩形、椭圆、直线、画笔（自由路径）、文字、图片插入、分组、选择、橡皮、抓手、缩放 | PR-03 |
| **图层** | 多图层创建/删除/重命名/隐藏/锁定/排序、图层归属形状 | PR-04 |
| **语音识别** | Whisper WASM base 模型端侧转文字（中文/英文） | PR-05 |
| **按住说话按钮** | PTT 按住录音、松开识别、状态动画（idle/recording/transcribing/error） | PR-06 |
| **语音命令解析** | 正则规则引擎：画[颜色][形状]、删除、撤销、重做、清空；支持中英文 | PR-07 |
| **文件保存/加载** | Electron IPC 主进程文件对话框，新建/打开/保存 `.aip` 项目文件 | PR-08 |
| **自动保存** | 60 秒间隔自动保存、状态栏通知（已保存/保存中/保存失败） | PR-09 |
| **导出 PNG/JPEG** | Konva Stage → dataURL → 浏览器下载，支持 1x/2x/3x 分辨率 | PR-10 |
| **UI Shell 集成** | 完整布局（MenuBar/Toolbar/Canvas/LayerPanel/StatusBar/PTT 浮层） | PR-11 |
| **撤销/重做** | 50 步历史栈（Ctrl+Z/Y）、中间件自动快照、MenuBar 集成 | PR-12 |
| **Electron 打包** | NSIS 安装包 + 便携版 .exe | PR-13 |

---

## v1.0 已知限制

- LLM 意图理解暂未接入（计划 v2，DeepSeek API）
- Porcupine 唤醒词检测暂未接入（计划 v2）
- 撤销/重做在文件新建/打开时清空历史栈
- 麦克风权限需浏览器/系统授权
- 导出为浏览器下载（尚无主进程文件写入）

---

## 测试覆盖

- **306 个测试**（Vitest 单元 + 集成）
- typecheck `tsc --noEmit` 零错误
- ESLint 零警告
- Playwright E2E 可用

---

## 技术栈

| 组件 | 版本 |
|------|------|
| React | 18.3 |
| TypeScript | 5.7 |
| Konva.js | 9.3 |
| Zustand | 5.0 |
| Electron | 33 |
| Vite | 6 |
| Vitest | 2 |
| electron-builder | 25 |

---

## 路线图

- **v1.0** (当前) — MVP：画布 + 语音 + 保存 + 打包
- **v2.0** — LLM 意图理解、唤醒词检测、Web Speech API 降级
- **v3.0** — 多窗口同步、LOD 性能优化、协作绘图
