import { test, expect } from '@playwright/test';

test.describe('应用启动', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('页面标题正确', async ({ page }) => {
    await expect(page).toHaveTitle('AI-Painting');
  });

  test('应用标题显示', async ({ page }) => {
    const heading = page.locator('h1');
    await expect(heading).toBeVisible();
    await expect(heading).toHaveText('AI-Painting');
  });

  test('版本号显示（来自 Electron 或 fallback）', async ({ page }) => {
    const version = page.locator('[data-testid="app-version"]');
    await expect(version).toBeVisible();
    const text = await version.textContent();
    expect(text).toMatch(/^[\d.]+|dev$/);
  });

  test('平台信息显示', async ({ page }) => {
    const platform = page.locator('[data-testid="platform"]');
    await expect(platform).toBeVisible();
  });

  test('状态显示为就绪', async ({ page }) => {
    const status = page.locator('[data-testid="app-status"]');
    await expect(status).toBeVisible();
    await expect(status).toHaveText('就绪');
  });

  test('功能模块列表存在', async ({ page }) => {
    const panel = page.locator('.info-panel');
    await expect(panel).toBeVisible();

    const features = [
      '画布引擎 (Konva.js)',
      '绘图工具 (7种工具)',
      '图层管理',
      '语音交互 (Whisper)',
      '文件保存 (JSON + PNG)',
      '命令解析引擎',
    ];

    for (const feature of features) {
      await expect(page.locator('.info-panel li', { hasText: feature })).toBeVisible();
    }
  });

  test('无控制台错误', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    expect(errors).toHaveLength(0);
  });
});
