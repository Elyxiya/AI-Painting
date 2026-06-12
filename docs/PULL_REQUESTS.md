# AI-Painting PR 拆分计划

> 基于 [PR 提交规范](../.cursor/skills-cursor/pr-submission-standard/SKILL.md)
> 每个 PR 独立可运行，主分支任意时刻保持可用状态。
> 测试策略遵循 [TDD 红-绿-重构循环](../.cursor/skills-cursor/tdd/SKILL.md)

---

## 测试金字塔

```
         ┌──────────────────┐
         │     E2E 测试      │  Playwright（真实浏览器，Electron 真实窗口）
         │  关键路径端到端   │  覆盖核心用户操作流程
         └────────┬─────────┘
                  │  集成测试
         ┌────────▼─────────┐
         │   集成测试        │  Vitest + @vue/test-utils（组件行为）
         │   组件交互逻辑    │  IPC 通信、Store 状态变更、命令解析
         └────────┬─────────┘
                  │  单元测试
         ┌────────▼─────────┐
         │   单元测试        │  Vitest（纯函数、业务逻辑、命令规则）
         │   工具函数        │  Zustand Store 状态转换、颜色映射
         └────────┬─────────┘
                  │  静态检查
         ┌────────▼─────────┐
         │  静态分析 / Lint  │  TypeScript tsc --noEmit + ESLint + Prettier
         │  每次提交强制通过 │  零类型错误、零 lint 警告
         └──────────────────┘
```

### 工具链

| 层级 | 工具 | 用途 |
|------|------|------|
| 静态检查 | `tsc --noEmit` | TypeScript 类型检查 |
| 静态检查 | ESLint + Prettier | 代码风格、格式 |
| 单元测试 | Vitest | 纯函数、Store 状态转换、命令规则 |
| 集成测试 | Vitest + @testing-library/react | React 组件行为、Store 集成 |
| E2E 测试 | Playwright | 真实 Electron 窗口、完整用户流程 |

### TDD 循环（每个 PR 内部）

```
RED:   写一个测试（描述行为，不是实现） → 测试失败
GREEN: 写最小代码让测试通过 → 不考虑未来
REFACTOR: 所有测试通过后，清理代码 → 测试仍需通过
```

### 测试文件结构

```
src/
  renderer/
    components/
      Canvas/CanvasStage.test.tsx    # 集成测试（组件 + Store）
    services/
      commandParser.test.ts          # 单元测试（纯函数）
      commandRules.test.ts           # 单元测试（规则匹配）
    stores/
      canvas.store.test.ts           # 单元测试（状态转换）
      tool.store.test.ts             # 单元测试（状态转换）
    hooks/
      useWhisper.test.ts             # 单元测试（Hook 逻辑）
    __tests__/
      e2e/                           # Playwright E2E 测试
        canvas-basic.spec.ts
        voice-command.spec.ts
        file-save.spec.ts
```

---

## 测试环境配置（PR-01 包含）

### package.json 测试脚本

```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage",
    "test:e2e": "playwright test",
    "typecheck": "tsc --noEmit",
    "lint": "eslint src --ext .ts,.tsx",
    "format": "prettier --write src"
  }
}
```

### vitest.config.ts

```typescript
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
    },
  },
})
```

### playwright.config.ts（E2E）

```typescript
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './src/renderer/__tests__/e2e',
  timeout: 30_000,
  use: {
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'electron',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
})
```

---

## PR-01：项目脚手架

**分支**：`feat/project-scaffold`

**标题**：`chore: 初始化 Electron + Vite + React + TypeScript 项目`

### 功能描述
搭建可运行的 Electron 应用基础框架，包含 Vite 构建配置、Electron 主/渲染进程分离、Preload 脚本安全上下文、基础窗口管理。运行 `npm run dev` 后应能看到空白窗口应用。

### 实现思路
- 使用 `electron-vite` 作为构建工具，整合 Vite + Electron
- 主进程处理窗口创建和 IPC 注册，渲染进程运行 React 应用
- Preload 脚本通过 `contextBridge` 安全暴露 `electronAPI`
- 基础目录结构：`src/main/`、`src/preload/`、`src/renderer/`

### TDD 测试策略

#### 静态检查（RED → GREEN 后）
```bash
# 每个 PR 第一步：静态检查必须通过
npm run typecheck     # tsc --noEmit，零错误
npm run lint          # ESLint 零警告
npm run format        # Prettier 格式正确
```

#### 集成测试（E2E，Playwright）
```typescript
// src/renderer/__tests__/e2e/app-launch.spec.ts
import { test, expect } from '@playwright/test'

test('应用启动后显示空白窗口', async ({ electron }) => {
  const page = await electron.newPage()
  await page.goto('http://localhost:5173')
  // 窗口应该正常加载，无崩溃
  const errors: string[] = []
  page.on('pageerror', err => errors.push(err.message))
  await page.waitForTimeout(2000)
  expect(errors).toHaveLength(0)
})
```

### 测试方式
```bash
npm run typecheck   # 零类型错误
npm run lint        # 零警告
npm run test        # Vitest 单元测试通过
npm run test:e2e    # Playwright E2E 通过
npm run dev         # 手动验证：Electron 窗口正常启动
```

### 重点文件
- `package.json`（含 test/lint/typecheck 脚本）
- `electron.vite.config.ts`、`vitest.config.ts`、`playwright.config.ts`
- `src/main/index.ts`
- `src/preload/index.ts`
- `src/renderer/main.tsx`
- `src/test/setup.ts`

---

## PR-02：添加 Konva 画布组件

**分支**：`feat/konva-canvas`

**标题**：`feat: 添加 Konva 画布组件`

### 功能描述
在 React 中集成 Konva.js Stage，渲染空白画布，支持缩放和平移。画布尺寸默认 1920×1080，可配置。

### 实现思路
- 使用 `react-konva` 包，通过 `Stage` + `Layer` 构建画布
- 使用 Zustand 管理画布尺寸和视口状态（viewport x/y/scale）
- 绑定鼠标滚轮缩放、中键/空格拖拽平移

### TDD 测试策略

#### 单元测试（canvasStore 状态）

```typescript
// src/renderer/stores/canvas.store.test.ts
import { describe, it, expect } from 'vitest'
import { createCanvasStore } from './canvas.store'

describe('canvasStore', () => {
  it('初始化后视口缩放为1，默认尺寸1920x1080', () => {
    const store = createCanvasStore()
    expect(store.getState().viewport.scale).toBe(1)
    expect(store.getState().canvasSize.width).toBe(1920)
    expect(store.getState().canvasSize.height).toBe(1080)
  })

  it('setViewport 更新缩放和平移', () => {
    const store = createCanvasStore()
    store.getState().setViewport({ scale: 2, x: 100, y: 50 })
    const vp = store.getState().viewport
    expect(vp.scale).toBe(2)
    expect(vp.x).toBe(100)
    expect(vp.y).toBe(50)
  })

  it('resetViewport 恢复默认视口', () => {
    const store = createCanvasStore()
    store.getState().setViewport({ scale: 3, x: 200, y: 200 })
    store.getState().resetViewport()
    const vp = store.getState().viewport
    expect(vp.scale).toBe(1)
    expect(vp.x).toBe(0)
    expect(vp.y).toBe(0)
  })
})
```

#### 集成测试（CanvasStage 组件）

```typescript
// src/renderer/components/Canvas/CanvasStage.test.tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CanvasStage } from './CanvasStage'
import { CanvasStoreProvider } from '../../stores/canvas.store'

it('渲染空白 Konva 画布', () => {
  render(
    <CanvasStoreProvider>
      <CanvasStage />
    </CanvasStoreProvider>
  )
  const stage = screen.getByTestId('konva-stage')
  expect(stage).toBeInTheDocument()
})
```

#### E2E 测试（Playwright）

```typescript
// src/renderer/__tests__/e2e/canvas-viewport.spec.ts
test('鼠标滚轮缩放画布', async ({ electron }) => {
  const page = await electron.newPage()
  await page.goto('http://localhost:5173')
  const canvas = page.locator('[data-testid="konva-stage"]')
  const box = await canvas.boundingBox()
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
  await page.mouse.wheel(0, -100) // 放大
  // 缩放值应变为 2（粗粒度验证：检查缩放按钮状态）
})
```

### 测试方式
```bash
npm run typecheck && npm run lint && npm run test && npm run test:e2e
```

### 重点文件
- `src/renderer/components/Canvas/CanvasStage.tsx`
- `src/renderer/stores/canvas.store.ts`
- `src/renderer/types/canvas.types.ts`
- `src/renderer/components/Canvas/CanvasStage.test.tsx`
- `src/renderer/stores/canvas.store.test.ts`

---

## PR-03：实现 7 种绘图工具

**分支**：`feat/drawing-tools`

**标题**：`feat: 实现 7 种绘图工具`

### 功能描述
支持矩形、椭圆、直线、画笔（自由路径）、文本、图片插入、分组工具。工具栏可切换工具，绘图时光标实时预览。

### 实现思路
- 每个工具对应独立的绘制处理器（dragstart/dragmove/dragend 生命周期）
- 使用 Zustand `toolStore` 管理当前工具和工具参数（颜色、粗细、透明度等）
- 绘制完成后将形状数据写入 `canvasStore.shapes`，由 Konva 渲染

### TDD 测试策略

#### 单元测试（toolStore 状态转换）

```typescript
// src/renderer/stores/tool.store.test.ts
describe('toolStore', () => {
  it('默认工具为选择工具', () => {
    const store = createToolStore()
    expect(store.getState().currentTool).toBe('select')
  })

  it('setTool 切换当前工具', () => {
    const store = createToolStore()
    store.getState().setTool('rectangle')
    expect(store.getState().currentTool).toBe('rectangle')
  })

  it('setColor 更新当前颜色', () => {
    const store = createToolStore()
    store.getState().setColor('#FF0000')
    expect(store.getState().currentColor).toBe('#FF0000')
  })

  it('setStrokeWidth 更新线宽', () => {
    const store = createToolStore()
    store.getState().setStrokeWidth(10)
    expect(store.getState().strokeWidth).toBe(10)
  })

  it('每个工具有独立的默认参数', () => {
    const store = createToolStore()
    store.getState().setTool('pencil')
    expect(store.getState().strokeWidth).toBe(2)  // 画笔默认细
    store.getState().setTool('rectangle')
    expect(store.getState().strokeWidth).toBe(2)  // 矩形默认粗
  })
})
```

#### 集成测试（形状创建流程）

```typescript
// src/renderer/__tests__/integration/drawing-tools.test.tsx
describe('绘图工具集成', () => {
  it('选择矩形工具后，画布上增加一个矩形形状', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByTestId('tool-rectangle'))
    const canvas = screen.getByTestId('konva-stage')
    const box = await canvas.boundingBox()
    // 模拟绘制：按下→拖动→松开
    await user.pointer({ keys: '[MouseLeft]', target: canvas, position: { x: 100, y: 100 } })
    await user.pointer({ keys: '[MouseLeft]', target: canvas, position: { x: 200, y: 200 } })
    const shapes = useCanvasStore.getState().shapes
    expect(shapes.filter(s => s.type === 'rectangle')).toHaveLength(1)
  })
})
```

#### E2E 测试

```typescript
// src/renderer/__tests__/e2e/drawing.spec.ts
test('完整绘图流程：选择工具→绘制→保存', async ({ electron }) => {
  const page = await electron.newPage()
  await page.goto('http://localhost:5173')
  await page.click('[data-testid="tool-rectangle"]')
  const canvas = page.locator('[data-testid="konva-stage"]')
  const box = await canvas.boundingBox()
  await page.mouse.move(box.x + 100, box.y + 100)
  await page.mouse.down()
  await page.mouse.move(box.x + 300, box.y + 200)
  await page.mouse.up()
  // 验证形状存在（通过 store 状态）
})
```

### 测试方式
```bash
npm run typecheck && npm run lint && npm run test && npm run test:e2e
```

### 重点文件
- `src/renderer/components/Toolbar/Toolbar.tsx`
- `src/renderer/stores/tool.store.ts`、`src/renderer/stores/tool.store.test.ts`
- `src/renderer/hooks/useDrawingTool.ts`
- `src/renderer/__tests__/integration/drawing-tools.test.tsx`

---

## PR-04：实现多图层系统

**分支**：`feat/layer-system`

**标题**：`feat: 实现多图层系统`

### 功能描述
支持创建/删除图层、图层重命名、图层顺序拖拽调整、图层显示/隐藏、图层锁定。图层面板显示所有图层及缩略图预览。

### 实现思路
- `canvasStore` 中 `layers: Record<string, Layer>` + `layerOrder: string[]` 管理图层
- Konva 每个图层对应一个 `Layer` 节点，图层面板通过拖拽改变 `layerOrder`
- 形状通过 `layerId` 归属图层，切换活动图层后新绘制的形状归属当前图层

### TDD 测试策略

#### 单元测试（图层状态转换）

```typescript
// src/renderer/stores/canvas.store.test.ts（扩展）
describe('图层管理', () => {
  it('createLayer 创建新图层', () => {
    const store = createCanvasStore()
    const id = store.getState().createLayer('背景')
    const layer = store.getState().layers[id]
    expect(layer).toBeDefined()
    expect(layer.name).toBe('背景')
  })

  it('deleteLayer 删除图层', () => {
    const store = createCanvasStore()
    const id = store.getState().createLayer('临时层')
    store.getState().deleteLayer(id)
    expect(store.getState().layers[id]).toBeUndefined()
  })

  it('toggleLayerVisibility 切换图层显示', () => {
    const store = createCanvasStore()
    const id = store.getState().createLayer('测试层')
    store.getState().toggleLayerVisibility(id)
    expect(store.getState().layers[id].visible).toBe(false)
    store.getState().toggleLayerVisibility(id)
    expect(store.getState().layers[id].visible).toBe(true)
  })

  it('toggleLayerLock 切换图层锁定', () => {
    const store = createCanvasStore()
    const id = store.getState().createLayer('锁定层')
    store.getState().toggleLayerLock(id)
    expect(store.getState().layers[id].locked).toBe(true)
  })

  it('reorderLayers 调整图层顺序', () => {
    const store = createCanvasStore()
    const id1 = store.getState().createLayer('A')
    const id2 = store.getState().createLayer('B')
    const id3 = store.getState().createLayer('C')
    store.getState().reorderLayers([id3, id1, id2])
    expect(store.getState().layerOrder).toEqual([id3, id1, id2])
  })

  it('删除活动图层时自动切换到下一个', () => {
    const store = createCanvasStore()
    const id1 = store.getState().createLayer('A')
    const id2 = store.getState().createLayer('B')
    store.getState().setActiveLayer(id1)
    store.getState().deleteLayer(id1)
    expect(store.getState().activeLayerId).toBe(id2)
  })

  it('锁定图层后无法在图层上绘制', () => {
    const store = createCanvasStore()
    const id = store.getState().createLayer('锁定层')
    store.getState().toggleLayerLock(id)
    store.getState().setActiveLayer(id)
    const canDraw = store.getState().canDrawOnActiveLayer()
    expect(canDraw).toBe(false)
  })
})
```

#### 集成测试（图层面板）

```typescript
// src/renderer/components/LayerPanel/LayerPanel.test.tsx
it('点击新建图层按钮创建图层', async () => {
  const user = userEvent.setup()
  render(<LayerPanel />)
  await user.click(screen.getByTestId('btn-add-layer'))
  expect(screen.getByTestId('layer-item')).toBeInTheDocument()
})
```

#### E2E 测试

```typescript
// src/renderer/__tests__/e2e/layer-operations.spec.ts
test('图层创建→隐藏→删除完整流程', async ({ electron }) => {
  // ... 完整 E2E 流程测试
})
```

### 测试方式
```bash
npm run typecheck && npm run lint && npm run test && npm run test:e2e
```

### 重点文件
- `src/renderer/components/LayerPanel/LayerPanel.tsx`
- `src/renderer/components/LayerPanel/LayerItem.tsx`
- `src/renderer/stores/canvas.store.ts`（含图层相关状态）
- `src/renderer/stores/canvas.store.test.ts`

---

## PR-05：添加 Whisper 语音识别

**分支**：`feat/whisper-asr`

**标题**：`feat: 添加 Whisper WASM 语音识别`

### 功能描述
集成 Whisper WebAssembly 模型（base）在浏览器端进行语音转文字，支持中文和英文。

### 实现思路
- 使用 `@xenova/transformers` 加载 Whisper base 模型（WASM/WebGL 后端）
- 录音通过 `MediaRecorder` API 采集 PCM 数据
- 音频片段传入模型推理，返回文字结果
- 识别结果通过 Zustand `voiceStore` 管理

### TDD 测试策略

#### 单元测试（voiceStore 状态）

```typescript
// src/renderer/stores/voice.store.test.ts
describe('voiceStore', () => {
  it('初始化状态为空闲', () => {
    const store = createVoiceStore()
    expect(store.getState().status).toBe('idle')
    expect(store.getState().transcript).toBe('')
  })

  it('startRecording 切换为录音状态', () => {
    const store = createVoiceStore()
    store.getState().startRecording()
    expect(store.getState().status).toBe('recording')
  })

  it('setTranscript 设置识别结果', () => {
    const store = createVoiceStore()
    store.getState().setTranscript('画红色矩形')
    expect(store.getState().transcript).toBe('画红色矩形')
  })

  it('resetTranscript 清空识别结果', () => {
    const store = createVoiceStore()
    store.getState().setTranscript('画一个圆')
    store.getState().resetTranscript()
    expect(store.getState().transcript).toBe('')
  })

  it('状态流转：idle → recording → processing → idle', () => {
    const store = createVoiceStore()
    store.getState().startRecording()
    expect(store.getState().status).toBe('recording')
    store.getState().setProcessing()
    expect(store.getState().status).toBe('processing')
    store.getState().setTranscript('结果')
    expect(store.getState().status).toBe('idle')
  })
})
```

#### 集成测试（Whisper Service Mock）

```typescript
// src/renderer/services/whisper.service.test.ts
// 注意：Whisper WASM 模型无法在 Node.js 测试环境中加载
// 使用 Mock 来测试 service 层的状态流转逻辑

import { describe, it, expect, vi } from 'vitest'

vi.mock('@xenova/transformers', () => ({
  pipeline: vi.fn(() => async () => '测试文字'),
}))

describe('whisperService', () => {
  it('startRecording 更新 voiceStore 状态为 recording', async () => {
    // Mock MediaRecorder
    const mockRecorder = {
      start: vi.fn(),
      stop: vi.fn(),
      state: 'inactive',
    }
    vi.stubGlobal('MediaRecorder', vi.fn(() => mockRecorder))
    vi.stubGlobal('navigator', { mediaDevices: { getUserMedia: vi.fn() } })

    await whisperService.startRecording()
    const store = createVoiceStore()
    expect(store.getState().status).toBe('recording')
  })
})
```

#### E2E 测试（需要麦克风权限）

```typescript
// src/renderer/__tests__/e2e/voice-recognition.spec.ts
test.skip('语音识别端到端（需要麦克风）', async ({ electron }) => {
  // 标记为 skip，CI 环境无麦克风，手动运行
  const page = await electron.newPage()
  await page.goto('http://localhost:5173')
  // ... 完整语音流程
})
```

### 测试方式
```bash
npm run typecheck && npm run lint && npm run test && npm run test:e2e
```

### 重点文件
- `src/renderer/services/whisper.service.ts`
- `src/renderer/stores/voice.store.ts`、`src/renderer/stores/voice.store.test.ts`
- `src/renderer/hooks/useWhisper.ts`

---

## PR-06：添加 PTT 按住说话按钮

**分支**：`feat/ptt-button`

**标题**：`feat: 添加 PTT 按住说话按钮`

### 功能描述
界面底部居中显示圆形 PTT 按钮，按住录音，松开识别。按钮状态：空闲（蓝色）、录音中（红色闪烁）、识别中（黄色）。

### 实现思路
- `PressToTalkButton` 组件，监听 `mousedown`/`mouseup`/`touchstart`/`touchend`
- 按下时调用 `whisperService.startRecording()`，松开时调用 `stopRecording()`
- 识别结果存入 `voiceStore.currentTranscript`
- 录音中通过 CSS 动画显示波形或闪烁效果

### TDD 测试策略

#### 集成测试（按钮状态切换）

```typescript
// src/renderer/components/PressToTalk/PressToTalkButton.test.tsx
describe('PressToTalkButton', () => {
  it('默认状态显示空闲图标', () => {
    render(<PressToTalkButton />)
    expect(screen.getByTestId('ptt-button')).toHaveClass('ptt-idle')
  })

  it('voiceStore 为 recording 时显示红色', async () => {
    const store = createVoiceStore()
    store.getState().startRecording()
    render(<PressToTalkButton />)
    await waitFor(() => {
      expect(screen.getByTestId('ptt-button')).toHaveClass('ptt-recording')
    })
  })

  it('voiceStore 为 processing 时显示黄色', async () => {
    const store = createVoiceStore()
    store.getState().setProcessing()
    render(<PressToTalkButton />)
    await waitFor(() => {
      expect(screen.getByTestId('ptt-button')).toHaveClass('ptt-processing')
    })
  })

  it('mousedown 触发 startRecording', async () => {
    const user = userEvent.setup()
    render(<PressToTalkButton />)
    await user.pointer({ keys: '[MouseLeft]', target: screen.getByTestId('ptt-button') })
    const store = createVoiceStore()
    expect(store.getState().status).toBe('recording')
  })

  it('mouseup 触发 stopRecording', async () => {
    const user = userEvent.setup()
    render(<PressToTalkButton />)
    await user.pointer({ keys: '[MouseLeft>MouseLeft]', target: screen.getByTestId('ptt-button') })
    const store = createVoiceStore()
    expect(store.getState().status).toBe('processing')
  })
})
```

### 测试方式
```bash
npm run typecheck && npm run lint && npm run test && npm run test:e2e
```

### 重点文件
- `src/renderer/components/PressToTalk/PressToTalkButton.tsx`
- `src/renderer/components/PressToTalk/PressToTalkPanel.tsx`
- `src/renderer/components/PressToTalk/PressToTalkButton.test.tsx`

---

## PR-07：实现正则命令解析引擎

**分支**：`feat/command-parser`

**标题**：`feat: 实现正则命令解析引擎`

### 功能描述
将语音识别文字解析为绘图命令并执行。支持的命令模式：
- `画[颜色][形状]` → 如 "画红色矩形"、"画蓝色的圆"
- `删除` → 删除选中形状
- `撤销` / `重做` → 后续 PR 实现

### 实现思路
- `commandParser.ts` 维护规则列表，每条规则包含正则 + action handler
- 规则按优先级顺序匹配，命中后执行对应状态更新
- 支持颜色别名映射（"红"→"#FF0000", "蓝"→"#0000FF"）
- 命令执行后清空 `voiceStore.currentTranscript`，显示执行反馈

### TDD 测试策略

#### 单元测试（命令规则解析，核心！）

```typescript
// src/renderer/services/commandRules.test.ts
describe('颜色别名映射', () => {
  it('中文颜色别名正确映射', () => {
    expect(mapColorAlias('红')).toBe('#FF0000')
    expect(mapColorAlias('蓝')).toBe('#0000FF')
    expect(mapColorAlias('绿')).toBe('#00FF00')
    expect(mapColorAlias('黄')).toBe('#FFFF00')
    expect(mapColorAlias('黑')).toBe('#000000')
    expect(mapColorAlias('白')).toBe('#FFFFFF')
    expect(mapColorAlias('橙')).toBe('#FFA500')
    expect(mapColorAlias('紫')).toBe('#800080')
    expect(mapColorAlias('灰')).toBe('#808080')
  })

  it('十六进制颜色直接返回', () => {
    expect(mapColorAlias('#FF0000')).toBe('#FF0000')
    expect(mapColorAlias('#abc')).toBe('#abc')
  })

  it('未知颜色别名返回原值', () => {
    expect(mapColorAlias('不存在')).toBe('不存在')
  })
})

describe('形状类型映射', () => {
  it('中文形状别名正确映射', () => {
    expect(mapShapeAlias('矩形')).toBe('rectangle')
    expect(mapShapeAlias('长方形')).toBe('rectangle')
    expect(mapShapeAlias('圆')).toBe('ellipse')
    expect(mapShapeAlias('圆形')).toBe('ellipse')
    expect(mapShapeAlias('椭圆')).toBe('ellipse')
    expect(mapShapeAlias('直线')).toBe('line')
    expect(mapShapeAlias('线')).toBe('line')
    expect(mapShapeAlias('圆圈')).toBe('ellipse')
    expect(mapShapeAlias('文字')).toBe('text')
    expect(mapShapeAlias('文本')).toBe('text')
    expect(mapShapeAlias('图片')).toBe('image')
    expect(mapShapeAlias('画笔')).toBe('pencil')
    expect(mapShapeAlias('自由')).toBe('pencil')
  })
})
```

```typescript
// src/renderer/services/commandParser.test.ts
describe('commandParser - drawShape 命令', () => {
  it('解析"画红色矩形"为 drawShape(红色, 矩形)', () => {
    const result = parseCommand('画红色矩形')
    expect(result.command).toBe('drawShape')
    expect(result.color).toBe('#FF0000')
    expect(result.shapeType).toBe('rectangle')
  })

  it('解析"画蓝色的圆"为 drawShape(蓝色, 圆形)', () => {
    const result = parseCommand('画蓝色的圆')
    expect(result.command).toBe('drawShape')
    expect(result.color).toBe('#0000FF')
    expect(result.shapeType).toBe('ellipse')
  })

  it('解析"画绿色直线"为 drawShape(绿色, 直线)', () => {
    const result = parseCommand('画绿色直线')
    expect(result.command).toBe('drawShape')
    expect(result.color).toBe('#00FF00')
    expect(result.shapeType).toBe('line')
  })

  it('解析"画一个红色的矩形"（带量词）', () => {
    const result = parseCommand('画一个红色的矩形')
    expect(result.command).toBe('drawShape')
    expect(result.color).toBe('#FF0000')
    expect(result.shapeType).toBe('rectangle')
  })

  it('忽略多余空格', () => {
    const result = parseCommand('画  红色  矩形  ')
    expect(result.command).toBe('drawShape')
  })

  it('未知命令返回 null', () => {
    const result = parseCommand('你好世界')
    expect(result).toBeNull()
  })

  it('颜色别名不存在时返回 null', () => {
    const result = parseCommand('画彩色的矩形')
    expect(result).toBeNull()
  })
})

describe('commandParser - delete 命令', () => {
  it('解析"删除"为 delete 命令', () => {
    const result = parseCommand('删除')
    expect(result.command).toBe('delete')
  })

  it('解析"删掉"为 delete 命令', () => {
    const result = parseCommand('删掉')
    expect(result.command).toBe('delete')
  })

  it('解析"清除"为 delete 命令', () => {
    const result = parseCommand('清除')
    expect(result.command).toBe('delete')
  })
})

describe('commandParser - 边界情况', () => {
  it('空字符串返回 null', () => {
    expect(parseCommand('')).toBeNull()
  })

  it('纯空格返回 null', () => {
    expect(parseCommand('   ')).toBeNull()
  })

  it('英文命令小写转为大写后匹配', () => {
    const result = parseCommand('draw red rectangle')
    expect(result?.command).toBe('drawShape')
  })
})
```

#### 集成测试（完整命令执行流程）

```typescript
// src/renderer/__tests__/integration/command-execution.test.ts
describe('命令执行集成', () => {
  it('说"画红色矩形"后画布出现对应形状', async () => {
    const store = createCanvasStore()
    store.getState().createLayer('默认')
    executeCommand('画红色矩形')
    const shapes = store.getState().shapes
    expect(shapes).toHaveLength(1)
    expect(shapes[0].type).toBe('rectangle')
    expect(shapes[0].fill).toBe('#FF0000')
  })

  it('说"删除"后删除选中形状', async () => {
    const canvasStore = createCanvasStore()
    canvasStore.getState().createLayer('默认')
    // 先画一个形状
    canvasStore.getState().addShape({ type: 'rectangle', id: 'test-id' })
    canvasStore.getState().selectShape('test-id')
    executeCommand('删除')
    expect(canvasStore.getState().shapes).toHaveLength(0)
  })
})
```

### 测试方式
```bash
npm run typecheck && npm run lint && npm run test && npm run test:e2e
```

### 重点文件
- `src/renderer/services/commandParser.ts`
- `src/renderer/services/commandRules.ts`
- `src/renderer/services/commandParser.test.ts`
- `src/renderer/services/commandRules.test.ts`
- `src/renderer/stores/voice.store.ts`

---

## PR-08：添加文件保存与加载（主进程 IPC）

**分支**：`feat/file-save-load`

**标题**：`feat: 添加文件保存与加载（主进程 IPC）`

### 功能描述
通过 Electron IPC 将项目状态从渲染进程保存到主进程的 JSON 文件，支持新建项目、打开项目、保存（Ctrl+S）。

### 实现思路
- 主进程注册 `file:save`、`file:open`、`file:new` IPC 通道
- 使用 Electron `dialog` API 显示原生文件选择框
- JSON 文件格式：`{ version, metadata, canvas, layers, shapes, viewport, settings }`
- 保存时通过 Preload `electronAPI.file.save()` 调用，渲染进程传入完整状态

### TDD 测试策略

#### 单元测试（文件序列化逻辑）

```typescript
// src/renderer/services/fileService.test.ts
describe('文件序列化', () => {
  it('serializeProject 生成正确格式的 JSON', () => {
    const project = createMockProject()
    const json = serializeProject(project)
    const parsed = JSON.parse(json)
    expect(parsed.version).toBe('1.0')
    expect(parsed.canvas).toBeDefined()
    expect(parsed.layers).toBeDefined()
    expect(parsed.shapes).toBeDefined()
    expect(parsed.viewport).toBeDefined()
    expect(parsed.settings).toBeDefined()
  })

  it('deserializeProject 正确解析 JSON', () => {
    const project = createMockProject()
    const json = serializeProject(project)
    const restored = deserializeProject(json)
    expect(restored.canvasSize).toEqual(project.canvasSize)
    expect(restored.shapes).toEqual(project.shapes)
  })

  it('空项目序列化不报错', () => {
    const empty = createEmptyProject()
    expect(() => serializeProject(empty)).not.toThrow()
  })
})

describe('项目版本兼容性', () => {
  it('旧版本 JSON 能被正确解析（向后兼容）', () => {
    const oldJson = JSON.stringify({ version: '0.9', shapes: [] })
    const project = deserializeProject(oldJson)
    expect(project.version).toBe('0.9')
  })
})
```

#### 集成测试（IPC Mock）

```typescript
// src/renderer/services/fileService.integration.test.ts
// Mock Electron IPC
vi.mock('../../preload/index', () => ({
  electronAPI: {
    file: {
      save: vi.fn(() => Promise.resolve('/path/to/saved.json')),
      open: vi.fn(() => Promise.resolve('/path/to/opened.json')),
    },
  },
}))

describe('fileService.save', () => {
  it('调用 electronAPI.file.save 并传入序列化数据', async () => {
    await fileService.save(createMockProject())
    expect(vi.mocked(electronAPI.file.save)).toHaveBeenCalledTimes(1)
    const arg = vi.mocked(electronAPI.file.save).mock.calls[0][0]
    expect(JSON.parse(arg)).toMatchObject({ version: '1.0' })
  })
})

describe('fileService.open', () => {
  it('调用 electronAPI.file.open 并解析返回数据', async () => {
    const mockData = JSON.stringify(createMockProject())
    vi.mocked(electronAPI.file.open).mockResolvedValue(mockData)
    const project = await fileService.open()
    expect(project.canvasSize).toBeDefined()
  })
})
```

### 测试方式
```bash
npm run typecheck && npm run lint && npm run test && npm run test:e2e
```

### 重点文件
- `src/main/ipc/file.ipc.ts`
- `src/preload/index.ts`
- `src/renderer/services/fileService.ts`、`src/renderer/services/fileService.test.ts`
- `src/renderer/services/fileService.integration.test.ts`

---

## PR-09：添加自动保存与状态通知

**分支**：`feat/auto-save`

**标题**：`feat: 添加自动保存与状态通知`

### 功能描述
每隔 60 秒自动保存项目，保存时在状态栏显示保存状态（已保存 / 保存中 / 保存失败）。

### 实现思路
- `fileStore` 管理 `status: 'saved' | 'modified' | 'saving' | 'error'`
- 状态变更时触发通知：`file:modified` → 显示未保存标记 → 定时器到期 → `file:saving` → IPC 保存 → `file:saved`
- 状态栏组件订阅 `fileStore.status` 实时显示

### TDD 测试策略

#### 单元测试（自动保存逻辑）

```typescript
// src/renderer/hooks/useAutoSave.test.ts
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'

describe('useAutoSave', () => {
  beforeEach(() => { vi.useFakeTimers() })
  afterEach(() => { vi.useRealTimers() })

  it('60秒后触发保存', async () => {
    const saveSpy = vi.spyOn(fileService, 'save')
    renderHook(() => useAutoSave({ interval: 60_000 }))
    await act(async () => { vi.advanceTimersByTime(60_000) })
    expect(saveSpy).toHaveBeenCalledTimes(1)
  })

  it('文件未修改时不触发保存', async () => {
    const saveSpy = vi.spyOn(fileService, 'save')
    renderHook(() => useAutoSave({ interval: 60_000 }))
    await act(async () => { vi.advanceTimersByTime(60_000) })
    expect(saveSpy).toHaveBeenCalledTimes(0)
  })

  it('状态流转：modified → saving → saved', async () => {
    const store = createFileStore()
    renderHook(() => useAutoSave({ interval: 60_000 }))
    store.getState().markModified()
    expect(store.getState().status).toBe('modified')
    await act(async () => { vi.advanceTimersByTime(60_000) })
    expect(store.getState().status).toBe('saved')
  })
})
```

```typescript
// src/renderer/stores/file.store.test.ts
describe('fileStore 自动保存状态', () => {
  it('初始状态为 saved', () => {
    const store = createFileStore()
    expect(store.getState().status).toBe('saved')
  })

  it('markModified 切换为 modified', () => {
    const store = createFileStore()
    store.getState().markModified()
    expect(store.getState().status).toBe('modified')
  })

  it('setSaving 切换为 saving', () => {
    const store = createFileStore()
    store.getState().setSaving()
    expect(store.getState().status).toBe('saving')
  })

  it('setError 切换为 error', () => {
    const store = createFileStore()
    store.getState().setError()
    expect(store.getState().status).toBe('error')
  })

  it('错误后重新保存成功恢复 saved', () => {
    const store = createFileStore()
    store.getState().setError()
    store.getState().markModified()
    store.getState().setSaving()
    store.getState().setSaved()
    expect(store.getState().status).toBe('saved')
  })
})
```

### 测试方式
```bash
npm run typecheck && npm run lint && npm run test && npm run test:e2e
```

### 重点文件
- `src/renderer/stores/file.store.ts`、`src/renderer/stores/file.store.test.ts`
- `src/renderer/components/StatusBar/StatusBar.tsx`
- `src/renderer/hooks/useAutoSave.ts`、`src/renderer/hooks/useAutoSave.test.ts`

---

## PR-10：添加项目导出（PNG/JPEG）

**分支**：`feat/export-png`

**标题**：`feat: 添加项目导出 PNG/JPEG`

### 功能描述
将当前画布导出为 PNG 或 JPEG 图片，支持自定义分辨率（1x / 2x / 3x）。

### 实现思路
- 使用 Konva `stage.toDataURL()` 导出画布内容
- 通过 `file:export-png` IPC 保存到用户指定路径
- 导出对话框支持格式选择和分辨率选择

### TDD 测试策略

#### 单元测试（导出参数处理）

```typescript
// src/renderer/services/exportService.test.ts
describe('exportService', () => {
  it('生成正确的 PNG dataURL', () => {
    const mockStage = { toDataURL: () => 'data:image/png;base64,xxx' } as any
    const result = exportToDataURL(mockStage, 'png', 1)
    expect(result).toMatch(/^data:image\/png/)
  })

  it('生成正确的 JPEG dataURL', () => {
    const mockStage = { toDataURL: () => 'data:image/jpeg;base64,yyy' } as any
    const result = exportToDataURL(mockStage, 'jpeg', 1)
    expect(result).toMatch(/^data:image\/jpeg/)
  })

  it('2x 分辨率生成正确尺寸', () => {
    const mockStage = {
      width: () => 1920,
      height: () => 1080,
      toDataURL: vi.fn(({ pixelRatio }) => `data:image/png;base64,${pixelRatio}x`),
    }
    exportToDataURL(mockStage as any, 'png', 2)
    expect(mockStage.toDataURL).toHaveBeenCalledWith(expect.objectContaining({ pixelRatio: 2 }))
  })
})
```

### 测试方式
```bash
npm run typecheck && npm run lint && npm run test && npm run test:e2e
```

### 重点文件
- `src/main/ipc/file.ipc.ts`
- `src/renderer/components/MenuBar/MenuBar.tsx`
- `src/renderer/services/exportService.ts`、`src/renderer/services/exportService.test.ts`

---

## PR-11：集成 UI Shell 与工具栏

**分支**：`feat/ui-shell`

**标题**：`feat: 集成 UI Shell 与工具栏`

### 功能描述
整合所有 UI 组件为完整应用界面：顶部菜单栏、左侧工具栏、右侧图层面板、底部状态栏和 PTT 按钮、中央画布区域。

### 实现思路
- `App.tsx` 作为布局容器，使用 CSS Grid/Flexbox 组织各区域
- 工具栏随选中的工具显示对应参数（颜色选择器、粗细滑块等）
- 响应式调整：窗口缩放时画布自适应

### TDD 测试策略

#### 集成测试（完整界面组件）

```typescript
// src/renderer/App.test.tsx
describe('App 布局', () => {
  it('渲染所有主要区域', () => {
    render(<App />)
    expect(screen.getByTestId('menu-bar')).toBeInTheDocument()
    expect(screen.getByTestId('toolbar')).toBeInTheDocument()
    expect(screen.getByTestId('layer-panel')).toBeInTheDocument()
    expect(screen.getByTestId('canvas-stage')).toBeInTheDocument()
    expect(screen.getByTestId('status-bar')).toBeInTheDocument()
    expect(screen.getByTestId('ptt-button')).toBeInTheDocument()
  })
})
```

#### E2E 测试（完整用户流程）

```typescript
// src/renderer/__tests__/e2e/full-workflow.spec.ts
test('完整用户流程：新建→绘图→保存→导出', async ({ electron }) => {
  const page = await electron.newPage()
  await page.goto('http://localhost:5173')

  // 1. 新建项目
  await page.click('text=文件')
  await page.click('text=新建项目')
  expect(page.locator('[data-testid="konva-stage"]')).toBeVisible()

  // 2. 选择工具
  await page.click('[data-testid="tool-rectangle"]')

  // 3. 绘制
  const canvas = page.locator('[data-testid="konva-stage"]')
  const box = await canvas.boundingBox()
  await page.mouse.move(box.x + 100, box.y + 100)
  await page.mouse.down()
  await page.mouse.move(box.x + 300, box.y + 200)
  await page.mouse.up()

  // 4. 保存
  await page.keyboard.press('Control+s')
  // 对话框处理...

  // 5. 导出 PNG
  await page.click('text=文件')
  await page.click('text=导出为 PNG')
  // 验证导出成功
})
```

### 测试方式
```bash
npm run typecheck && npm run lint && npm run test && npm run test:e2e
```

### 重点文件
- `src/renderer/App.tsx`、`src/renderer/App.test.tsx`
- `src/renderer/components/Toolbar/Toolbar.tsx`
- `src/renderer/components/MenuBar/MenuBar.tsx`
- `src/renderer/__tests__/e2e/full-workflow.spec.ts`

---

## PR-12：Electron 打包为 .exe

**分支**：`feat/electron-build`

**标题**：`chore: 配置 Electron Builder 打包为 .exe`

### 功能描述
配置 `electron-builder`，将应用打包为 Windows 可执行文件（.exe），支持 NSIS 安装包和便携版。

### 实现思路
- `electron-builder` 配置：入口文件、输出目录、应用图标、构建目标（nsis）
- 打包前确保所有资源正确打包（WASM 模型、类型定义等）
- 添加 `npm run build` 脚本执行打包

### TDD 测试策略

#### 静态检查（必须全部通过）
```bash
npm run typecheck   # 零类型错误
npm run lint        # 零警告
npm run test        # 所有单元测试通过
npm run test:e2e    # E2E 测试通过（CI 环境）
```

#### 构建验证（手动）
```bash
npm run build
# 验证 dist/ 目录包含：
# - win-unpacked/ai-painting.exe
# - win-installer/ai-painting-Setup.exe
```

### 测试方式
```bash
# CI 流水线
npm run typecheck && npm run lint && npm run test && npm run test:e2e && npm run build
```

### 重点文件
- `electron-builder.json`
- `package.json`（含 build 脚本）
- `src/main/index.ts`

---

## PR 依赖关系图

```
PR-01  项目脚手架 ─────────────────────────────────┐
                                                      │
PR-02  Konva 画布 ───────────────────────────────────┤
                                                      │
PR-03  7种绘图工具 ──────────────────────────────────┤
                                                      ├── PR-11 UI Shell
PR-04  多图层系统 ────────────────────────────────────┤
                                                      │
PR-05  Whisper 语音识别 ──────────────────────────────┤
                                                      │
PR-06  PTT 按住说话按钮 ─────────────────────────────┤
                                                      │
PR-07  正则命令解析 ───────────────────────────────┐  │
                                                      │
PR-08  文件保存与加载 ──────────────────────────────┐  │
                                                      │
PR-09  自动保存与通知 ──────────────────────────────┼──┤
                                                      │
PR-10  导出 PNG/JPEG ──────────────────────────────┐  │
                                                      │
PR-12  打包 .exe ────────────────────────────────────┘
```

---

## PR 提交顺序

| # | 分支 | 标题 | 单元测试 | 集成测试 | E2E |
|---|------|------|---------|---------|-----|
| 01 | `feat/project-scaffold` | chore: 初始化 Electron + Vite + React + TypeScript 项目 | - | E2E启动 | 启动测试 |
| 02 | `feat/konva-canvas` | feat: 添加 Konva 画布组件 | canvasStore | CanvasStage | 视口操作 |
| 03 | `feat/drawing-tools` | feat: 实现 7 种绘图工具 | toolStore | 绘图流程 | 绘图E2E |
| 04 | `feat/layer-system` | feat: 实现多图层系统 | canvasStore图层 | 图层面板 | 图层E2E |
| 05 | `feat/whisper-asr` | feat: 添加 Whisper WASM 语音识别 | voiceStore | WhisperService Mock | 语音E2E |
| 06 | `feat/ptt-button` | feat: 添加 PTT 按住说话按钮 | - | PTT按钮状态 | - |
| 07 | `feat/command-parser` | feat: 实现正则命令解析引擎 | **commandParser** + **commandRules** | 命令执行 | 语音命令E2E |
| 08 | `feat/file-save-load` | feat: 添加文件保存与加载（主进程 IPC） | 序列化逻辑 | IPC Mock | 文件E2E |
| 09 | `feat/auto-save` | feat: 添加自动保存与状态通知 | fileStore + useAutoSave | - | - |
| 10 | `feat/export-png` | feat: 添加项目导出 PNG/JPEG | exportService | - | - |
| 11 | `feat/ui-shell` | feat: 集成 UI Shell 与工具栏 | - | App布局 | **完整流程E2E** |
| 12 | `feat/electron-build` | chore: 配置 Electron Builder 打包为 .exe | - | - | 构建验证 |

**总计：约 2450 行代码，12 个独立 PR，覆盖单元/集成/E2E 三层测试**

---

## CI 流水线配置

```yaml
# .github/workflows/ci.yml
name: CI
on: [push, pull_request]
jobs:
  test:
    runs-on: windows-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm install
      - run: npm run typecheck
      - run: npm run lint
      - run: npm run test
      - run: npm run test:e2e
  build:
    needs: test
    runs-on: windows-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm install
      - run: npm run build
      - uses: actions/upload-artifact@v4
        with:
          name: exe
          path: dist/
```

> **关于 E2E 测试**：Playwright E2E 需要真实的 Electron 窗口环境，建议 PR-01 搭建完成后配置 CI，PR-07 之后的 PR 可使用完整 E2E 测试。麦克风相关 E2E 标记为 `test.skip`，本地手动验证。**TDD 循环核心在单元测试**（commandParser、canvasStore、toolStore 等纯逻辑），E2E 作为最终验收。
