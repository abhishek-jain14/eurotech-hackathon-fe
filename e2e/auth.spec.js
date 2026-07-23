import { test, expect } from '@playwright/test';
import { fieldByLabel } from './utils/fields.js';
import { loginAsAdmin } from './utils/auth.js';

test.describe('Login page', () => {
  test('renders username/password fields and sign-in button', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByText('QAGenie')).toBeVisible();
    await expect(fieldByLabel(page, 'Username')).toHaveValue('admin'); // pre-filled default
    await expect(fieldByLabel(page, 'Password')).toHaveAttribute('type', 'password');
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();
    await expect(page.getByText(/dummy access for demo\/dev/i)).toBeVisible();
  });

  test('rejects an invalid password with an inline error, no navigation', async ({ page }) => {
    await page.goto('/login');
    await fieldByLabel(page, 'Username').fill('admin');
    await fieldByLabel(page, 'Password').fill('wrong-password');
    await page.getByRole('button', { name: /sign in/i }).click();
    await expect(page.locator('.login-error')).toBeVisible();
    await expect(page).toHaveURL(/\/login/);
  });

  test('admin/test logs in and lands on the dashboard', async ({ page }) => {
    await loginAsAdmin(page);
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.locator('.sidebar')).toBeVisible();
  });

  test('unauthenticated visit to a protected route redirects to /login', async ({ page }) => {
    await page.goto('/onboarding');
    await expect(page).toHaveURL(/\/login/);
  });
});
