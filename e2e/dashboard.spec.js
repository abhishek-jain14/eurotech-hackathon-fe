import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './utils/auth.js';

test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/dashboard');
  });

  test('renders the four top-level stat tiles', async ({ page }) => {
    for (const label of ['Pass Rate', 'Failures', 'Scenarios', 'Avg Duration']) {
      await expect(page.locator('.stat-card', { hasText: label })).toBeVisible();
    }
  });

  test('renders the Onboarded Applications summary card', async ({ page }) => {
    await expect(page.locator('.card-title', { hasText: 'Onboarded Applications' })).toBeVisible();
  });
});
