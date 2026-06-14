# 🎨 AI-Painting

> Electron + Konva.js 智能绘图应用 — 支持 7 种绘图工具、多图层管理、语音控制与 AI 辅助创作


---

## 📖 目录

- [技术栈](#-技术栈)
- [功能概览](#-功能概览)
- [项目结构](#-项目结构)
- [快速开始](#-快速开始)
- [可用脚本](#-可用脚本)
- [架构设计](#-架构设计)
- [开发规范](#-开发规范)
- [路线图](#-路线图)

---

## 🛠 技术栈

| 层级 | 技术 |
|------|------|
| **框架** | React 18 + TypeScript 5.7 |
| **画布引擎** | Konva.js 9 + react-konva 18 |
| **状态管理** | Zustand 5 (immer + persist) |
| **桌面容器** | Electron 33 |
| **构建工具** | Vite 6 + vite-plugin-electron |
| **单元测试** | Vitest 2 + Testing Library |
| **E2E 测试** | Playwright |
| **代码质量** | ESLint 9 + Prettier 3 |
| **CI/CD** | GitHub Actions |

---

## ✨ 功能概览

### 已完成（v1.0 MVP）

- **🖌 7 种绘图工具**：选择、画笔、橡皮、矩形、椭圆、直线、文字、抓手、缩放
- **🎨 颜色管理**：前景色/背景色选择器、最近使用颜色（最多 10 个）
- **📏 笔刷调节**：大小滑块（1–100）、透明度、硬度
- **🔍 无限画布**：滚轮缩放（0.1×–10×）、拖拽平移、响应式尺寸
- **📐 绘制预览**：拖拽时显示虚线预览（矩形选框、椭圆、直线、画笔实时线条）
- **📚 图层面板**：多图层创建/删除/隐藏/锁定、图层顺序管理
- **💾 文件系统**：原生文件对话框（新建/打开/保存 `.aip` 项目文件）、60 秒自动保存、状态通知
- **🖼 导出 PNG/JPEG**：支持 1x/2x/3x 分辨率
- **🎤 语音识别**：Whisper WASM 端侧转文字
- **📢 PTT 按住说话按钮**：状态指示（空闲/录音中/识别中）
- **🗣 语音命令解析**：正则规则引擎，支持"画红色矩形"/"删除"/"撤销"/"重做"
- **↩ 撤销/重做**：50 步历史栈（Ctrl+Z / Ctrl+Y）
- **🌗 主题支持**：亮色/暗色/跟随系统
- **🌐 国际化**：中文 / English 切换
- **🪟 Electron 打包**：NSIS 安装包 + 便携版 .exe

### 规划中（v2+）

- **🤖 AI 助手**：自然语言生成图形、智能排版建议（DeepSeek API）
- **📦 自动保存**：可配置间隔的本地自动备份
- **↩ 撤销/重做**：完整历史记录栈
- **🖼 导出**：PNG / JPEG / SVG 导出
- **📚 图层面板**：可视化图层列表、拖拽排序、混合模式

---

## 📁 项目结构

```
ai-painting/
├── index.html                     # 入口 HTML（严格 CSP）
├── package.json                   # 依赖 & 脚本 & electron-builder 配置
├── vite.config.ts                 # Vite 构建配置
├── vitest.config.ts               # Vitest 测试配置
├── tsconfig.json                  # TypeScript 配置
├── playwright.config.ts           # Playwright E2E 配置
├── electron/                      # Electron 主进程 & 预加载
│   ├── main.ts                    #   窗口创建、IPC 处理、文件对话框
│   └── preload.ts                 #   contextBridge 安全暴露 API
├── src/                           # 渲染进程源代码
│   ├── main.tsx                   #   React 入口
│   ├── App.tsx                    #   主布局（Toolbar + Canvas）
│   ├── index.css                  #   全局样式 & CSS 自定义属性（暗色主题）
│   ├── components/
│   │   ├── Toolbar/               #   左侧工具栏
│   │   │   ├── Toolbar.tsx        #     工具按钮、取色器、笔刷滑块
│   │   │   └── Toolbar.module.css
│   │   └── canvas/                #   画布组件
│   │       ├── Canvas.tsx         #     Konva Stage 封装、视口缩放
│   │       ├── CanvasShape.tsx    #     按类型分发渲染图形
│   │       ├── ToolOverlay.tsx    #     绘制虚线预览
│   │       └── Canvas.module.css
│   ├── hooks/
│   │   └── useToolHandlers.ts     #   鼠标事件 → 坐标转换 → 图形创建
│   ├── stores/                    #   Zustand 分片状态
│   │   ├── index.ts               #     统一导出
│   │   ├── canvas.store.ts        #     图形/图层/视口（immer）
│   │   ├── tool.store.ts          #     工具/笔刷/颜色（persist）
│   │   ├── file.store.ts          #     文件状态/自动保存
│   │   └── ui.store.ts            #     语言/主题/侧栏（persist）
│   ├── shared/                    #   共享模块
│   │   ├── types/index.ts         #     全部 TS 类型定义
│   │   ├── constants.ts           #     应用常量
│   │   ├── ipc.ts                 #     IPC 通道 & 请求/响应类型
│   │   └── EventBus.ts            #     发布订阅事件总线
│   ├── test/
│   │   └── setup.ts               #   测试环境初始化
│   └── __mocks__/                 #   第三方 Mock
│       ├── konva.tsx
│       └── react-konva.tsx
├── docs/                          # 文档
│   ├── ARCHITECTURE.md            #   架构设计文档
│   ├── PLAN.md                    #   开发计划
│   ├── PULL_REQUESTS.md           #   PR 拆分方案
│   └── 开发提交规范.md             #   Git 规范
└── .github/workflows/
    └── ci.yml                     # CI 流水线
```

---

## 🚀 快速开始

### 环境要求

- **Node.js** ≥ 18
- **npm** ≥ 9

### 安装与运行

```bash
# 克隆仓库
git clone https://github.com/Elyxiya/ai-painting.git
cd ai-painting

# 安装依赖
npm install

# 浏览器开发模式（仅前端）
npm run dev

# Electron 桌面开发模式
npm run electron:dev

# 构建 Windows .exe
npm run electron:build  # 或 npm run build:win
```

产物：`release/AI-Painting Setup x.x.x.exe`（NSIS 安装包）或
`release/win-unpacked/AI-Painting.exe`（便携版）。

浏览器开发模式在 `http://localhost:5173` 启动 Vite 开发服务器，支持 HMR 热更新。
Electron 模式会同时启动 Electron 窗口和 Vite 开发服务器。

---

## 📜 可用脚本

| 脚本 | 说明 |
|------|------|
| `npm run dev` | 启动 Vite 开发服务器（浏览器模式） |
| `npm run electron:dev` | Electron 桌面开发模式 |
| `npm run build` | TypeScript 检查 + Vite 生产构建 |
| `npm run electron:build` | 完整构建 + electron-builder 打包 |
| `npm run typecheck` | TypeScript 类型检查 |
| `npm run lint` | ESLint 代码检查 |
| `npm run lint:fix` | ESLint 自动修复 |
| `npm run format` | Prettier 格式化 |
| `npm run test` | 运行 Vitest 单元测试 |
| `npm run test:watch` | 监听模式测试 |
| `npm run test:e2e` | Playwright E2E 测试 |
| `npm run test:e2e:ui` | Playwright UI 模式 |

---

## 🏗 架构设计

### 数据流

```
用户交互 (鼠标/键盘)
       │
       ▼
useToolHandlers                    ← 屏幕坐标 → 画布坐标转换
       │                             绘图生命周期管理
       ▼
┌──────────────────┐
│   Zustand Stores  │
│  ┌──────────────┐ │
│  │  toolStore   │ │              ← 工具/笔刷/颜色/绘制状态
│  │  canvasStore │ │              ← 图形/图层/视口/选区 (immer)
│  │  fileStore   │ │              ← 文件状态/自动保存
│  │  uiStore     │ │              ← 语言/主题/侧栏
│  └──────────────┘ │
└────────┬─────────┘
         │ React 响应式渲染
         ▼
┌──────────────────┐
│   Konva 画布       │
│  Canvas.tsx       │              ← Stage + Layer 架构
│  CanvasShape.tsx  │              ← 按类型分发渲染
│  ToolOverlay.tsx  │              ← 绘制虚线预览
└──────────────────┘
         │
         ▼
Electron IPC                       ← 原生文件对话框、窗口控制
```

### 状态管理设计

- **canvasStore** — 使用 `immer` 中间件，支持可变风格更新不可变状态
- **toolStore** — 使用 `persist` 中间件 + `partialize` 排除瞬态绘制状态
- **uiStore** — 使用 `persist` 中间件，持久化主题/语言偏好
- **EventBus** — 发布/订阅模式，用于跨 store 解耦通信

### 安全策略

- Electron `contextIsolation: true` + `nodeIntegration: false`
- 通过 `contextBridge` 安全暴露有限 API
- 严格 CSP：`script-src 'self'`，禁止内联脚本

---

## 📝 开发规范

### 分支命名

```
feat/canvas-toolbar    # 新功能
fix/upload-crash       # 缺陷修复
refactor/store-utils   # 代码重构
docs/api-reference     # 文档更新
```

### Commit 格式

```
type(scope): description

示例：
feat(canvas): 添加工具栏组件
fix(styles): 修复深色模式下颜色对比度问题
refactor(store): 抽取公共类型定义
test(canvas): 添加 Canvas 渲染测试
```

### PR 流程

1. 从 `main` 创建功能分支
2. 开发 + 定期 rebase `main`
3. 提交 PR（标题格式：`[类型]: 说明`）
4. 确保 CI 全部通过（typecheck + lint + test + e2e）
5. **Squash and merge** → 删除分支

详细规范见 [docs/开发提交规范.md](docs/开发提交规范.md)。

---

## 🗺 路线图

| 版本 | 目标 | 状态 |
|------|------|------|
| **v0.1** | 项目脚手架、画布渲染、7 种绘图工具 | ✅ 已完成 |
| **v1.0** | 画布增强 + 语音控制 + 文件保存 + Electron 打包 | ✅ 已完成 |
| **v2.0** | LLM 指令解析 + 唤醒词 | 📋 规划中 |
| **v3.0** | 多窗口同步 + 性能优化 + 协作绘图 | 📋 规划中 |

详见 [docs/PLAN.md](docs/PLAN.md) 和 [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)。

---

## 📄 License

MIT
