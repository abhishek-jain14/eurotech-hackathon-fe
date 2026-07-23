import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './utils/auth.js';
import { fieldByLabel } from './utils/fields.js';
import { createProject } from './utils/fixtures.js';

test.describe('Environments page', () => {
  let projectName;

  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    projectName = await createProject(page);
    await page.locator('tr', { hasText: projectName }).getByRole('link', { name: /manage/i }).click();
    await expect(page).toHaveURL(/\/projects\/\d+\/environments/);
  });

  test('create form exposes Environment Name/Config Type/Base URL fields with expected option lists', async ({ page }) => {
    await page.getByRole('button', { name: /\+ add environment/i }).click();

    const envNameSelect = fieldByLabel(page, 'Environment Name', 'select');
    await expect(envNameSelect).toBeVisible();
    await expect(envNameSelect.locator('option')).toHaveText(['Dev', 'UAT', 'Staging', 'Prod']);

    const configTypeSelect = fieldByLabel(page, 'Config Type', 'select');
    await expect(configTypeSelect.locator('option')).toHaveText(['SwaggerUrl', 'Database']);

    await expect(fieldByLabel(page, 'Base URL')).toHaveJSProperty('required', true);
  });

  test('creates, edits, and removes an environment', async ({ page }) => {
    await page.getByRole('button', { name: /\+ add environment/i }).click();
    await fieldByLabel(page, 'Environment Name', 'select').selectOption('UAT');
    await fieldByLabel(page, 'Config Type', 'select').selectOption('SwaggerUrl');
    await fieldByLabel(page, 'Base URL').fill('http://localhost:9001');
    await page.getByRole('button', { name: /save environment/i }).click();

    const row = page.locator('tr', { hasText: 'UAT' });
    await expect(row).toContainText('http://localhost:9001');

    await row.getByRole('button', { name: /^edit$/i }).click();
    await fieldByLabel(page, 'Base URL').fill('http://localhost:9002');
    await page.getByRole('button', { name: /save changes/i }).click();
    await expect(page.locator('tr', { hasText: 'UAT' })).toContainText('http://localhost:9002');

    await page.locator('tr', { hasText: 'UAT' }).getByRole('button', { name: /^remove$/i }).click();
    await expect(page.locator('tr', { hasText: 'UAT' })).toHaveCount(0);
  });

  test.afterEach(async ({ page }) => {
    // Best-effort cleanup: project delete requires no environments/applications left under it.
    await page.goto('/projects');
    page.once('dialog', (d) => d.accept());
    const row = page.locator('tr', { hasText: projectName });
    if (await row.count()) await row.getByRole('button', { name: /^delete$/i }).click();
  });
});
