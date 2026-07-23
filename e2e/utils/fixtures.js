import { expect } from '@playwright/test';
import { fieldByLabel } from './fields.js';

const unique = (prefix) => `${prefix}-${Date.now()}`;

/** Creates a Project via the Projects page UI. Returns its name. */
export async function createProject(page, { name = unique('E2E Project'), description = 'Created by Playwright', jiraUrl = '' } = {}) {
  await page.goto('/projects');
  await page.getByRole('button', { name: /\+ new project/i }).click();
  await fieldByLabel(page, 'Project Name').fill(name);
  if (description) await fieldByLabel(page, 'Description', 'textarea').fill(description);
  if (jiraUrl) await fieldByLabel(page, 'Jira URL').fill(jiraUrl);
  await page.getByRole('button', { name: /create project/i }).click();
  await expect(page.locator('table')).toContainText(name);
  return name;
}

/** Creates an Environment under a Project (by name) via its "Manage" link. Returns the env name used. */
export async function createEnvironment(page, projectName, { envName = 'Dev', configType = 'SwaggerUrl', baseUrl = 'http://localhost:9999' } = {}) {
  await page.goto('/projects');
  await page.locator('tr', { hasText: projectName }).getByRole('link', { name: /manage/i }).click();
  await page.getByRole('button', { name: /\+ add environment/i }).click();
  await fieldByLabel(page, 'Environment Name', 'select').selectOption(envName);
  await fieldByLabel(page, 'Config Type', 'select').selectOption(configType);
  await fieldByLabel(page, 'Base URL').fill(baseUrl);
  await page.getByRole('button', { name: /save environment/i }).click();
  await expect(page.locator('table')).toContainText(baseUrl);
  return envName;
}

/** Onboards an Application under a Project (by name) via the Onboarding wizard, skipping the fetch-now step. Returns its name. */
export async function createApplication(page, projectName, { name = unique('E2E App'), description = 'Created by Playwright', applicationType = 'BACKEND' } = {}) {
  await page.goto('/onboarding/new');
  await fieldByLabel(page, 'Project *', 'select').selectOption({ label: projectName });
  await fieldByLabel(page, 'Application Name').fill(name);
  if (description) await fieldByLabel(page, 'Description', 'textarea').fill(description);
  await fieldByLabel(page, 'Type *', 'select').selectOption(applicationType);
  await page.getByRole('button', { name: /onboard application/i }).click();
  await page.waitForURL('**/onboarding'); // handleSubmit navigates straight back to the list on success
  await expect(page.locator('table')).toContainText(name);
  return name;
}

/** Ensures at least one application exists (reuses the first row if any), returning its name. */
export async function ensureApplication(page) {
  await page.goto('/onboarding');
  const firstRow = page.locator('table tbody tr').first();
  if (await firstRow.count()) {
    return (await firstRow.locator('td').first().innerText()).trim();
  }
  const projectName = await createProject(page);
  return createApplication(page, projectName);
}
