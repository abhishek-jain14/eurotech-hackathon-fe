import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './utils/auth.js';
import { fieldByLabel } from './utils/fields.js';

test.describe('Projects page', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/projects');
  });

  test('create form exposes Name/Description/Jira URL fields', async ({ page }) => {
    await page.getByRole('button', { name: /\+ new project/i }).click();
    await expect(fieldByLabel(page, 'Project Name')).toBeVisible();
    await expect(fieldByLabel(page, 'Project Name')).toHaveJSProperty('required', true);
    await expect(fieldByLabel(page, 'Description', 'textarea')).toBeVisible();
    await expect(fieldByLabel(page, 'Jira URL')).toHaveAttribute('placeholder', /atlassian/i);
  });

  test('creates, edits, and deletes a project end-to-end', async ({ page }) => {
    const name = `E2E Project ${Date.now()}`;
    const updatedDescription = 'Updated by Playwright';

    await page.getByRole('button', { name: /\+ new project/i }).click();
    await fieldByLabel(page, 'Project Name').fill(name);
    await fieldByLabel(page, 'Description', 'textarea').fill('Original description');
    await page.getByRole('button', { name: /create project/i }).click();

    const row = page.locator('tr', { hasText: name });
    await expect(row).toBeVisible();

    await row.getByRole('button', { name: /^edit$/i }).click();
    await fieldByLabel(page, 'Description', 'textarea').fill(updatedDescription);
    await page.getByRole('button', { name: /save changes/i }).click();
    await expect(row).toBeVisible(); // still listed after edit

    page.once('dialog', (d) => d.accept());
    await row.getByRole('button', { name: /^delete$/i }).click();
    await expect(page.locator('tr', { hasText: name })).toHaveCount(0);
  });
});
