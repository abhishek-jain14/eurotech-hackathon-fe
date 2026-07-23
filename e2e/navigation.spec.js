import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './utils/auth.js';

test.describe('Sidebar navigation', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  const routes = [
    { link: 'Dashboard', url: /\/dashboard/ },
    { link: 'Projects', url: /\/projects/, heading: 'Projects' },
    { link: 'Applications', url: /\/onboarding/, heading: 'Onboarded Applications' },
    { link: 'Change Tracker', url: /\/maintenance/, heading: 'Change Tracker' },
    { link: 'Scenarios', url: /\/scenarios/, heading: 'Test Scenarios' },
    { link: 'Test Data', url: /\/testdata/, heading: 'Test Data' },
    { link: 'Test Flows', url: /\/testflows/, heading: 'Test Flows' },
    { link: 'Execution', url: /\/execution/, heading: 'Execution' },
    { link: 'Reports', url: /\/reports/, heading: 'Reports' }
  ];

  for (const r of routes) {
    test(`"${r.link}" nav item opens ${r.url}`, async ({ page }) => {
      await page.locator('.sidebar').getByText(r.link, { exact: true }).click();
      await expect(page).toHaveURL(r.url);
      if (r.heading) await expect(page.locator('.card-title', { hasText: r.heading }).first()).toBeVisible();
    });
  }

  test('Users nav item is visible for ADMIN and opens the Users page', async ({ page }) => {
    await page.locator('.sidebar').getByText('Users', { exact: true }).click();
    await expect(page).toHaveURL(/\/users/);
    await expect(page.locator('.card-title', { hasText: 'Platform Users' })).toBeVisible();
  });

  test('unknown route renders the 404 page', async ({ page }) => {
    await page.goto('/this-route-does-not-exist');
    await expect(page.getByText('404')).toBeVisible();
    await expect(page.getByText('PAGE NOT FOUND')).toBeVisible();
    await page.getByRole('link', { name: /back to dashboard/i }).click();
    await expect(page).toHaveURL(/\/dashboard/);
  });
});
