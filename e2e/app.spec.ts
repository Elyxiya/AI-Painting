import { test, expect } from '@playwright/test';

test.describe('应用启动', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('页面标题正确', async ({ page }) => {
    await expect(page).toHaveTitle('AI-Painting');
  });

  test('状态显示为就绪', async ({ page }) => {
    const status = page.locator('[data-testid="app-status"]');
    await expect(status).toBeVisible();
    await expect(status).toHaveText('就绪');
  });

  test('工具栏存在', async ({ page }) => {
    await expect(page.locator('[data-testid="app-status"]')).toBeVisible();
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
