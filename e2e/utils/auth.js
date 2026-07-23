import { fieldByLabel } from './fields.js';

/** Dummy admin/test credential from LoginPage - always resolves to ADMIN (see README). */
export async function loginAsAdmin(page) {
  await page.goto('/login');
  await fieldByLabel(page, 'Username').fill('admin');
  await fieldByLabel(page, 'Password').fill('test');
  await page.getByRole('button', { name: /sign in/i }).click();
  await page.waitForURL('**/dashboard');
}
