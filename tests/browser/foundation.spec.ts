import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('static app loads without external data requests and routes survive refresh', async ({ page, baseURL }) => {
  const externalRequests: string[] = [];
  const errors: string[] = [];
  page.on('request', (request) => { if (!request.url().startsWith(baseURL!)) externalRequests.push(request.url()); });
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('A calmer home');
  await page.getByRole('link', { name: 'About', exact: true }).click();
  await expect(page).toHaveURL(/#\/about$/);
  await expect(page.getByRole('heading', { level: 1 })).toBeFocused();
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Your home, at your pace.' })).toBeVisible();
  await page.goBack();
  await expect(page.getByRole('heading', { level: 1 })).toContainText('A calmer home');
  expect(externalRequests).toEqual([]);
  expect(errors).toEqual([]);
});

test('preview and about pages have no automated accessibility violations or horizontal overflow', async ({ page }) => {
  for (const route of ['/', '/#/about', '/#/missing']) {
    await page.goto(route);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  }
});

test('keyboard users can skip navigation and recover from an unknown page', async ({ page }) => {
  await page.goto('/');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Skip to content' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('main')).toBeFocused();
  await page.goto('/#/unknown');
  await page.getByRole('link', { name: 'Back to home' }).click();
  await expect(page).toHaveURL(/#\/$/);
  await expect(page.getByRole('heading', { level: 1 })).toContainText('A calmer home');
});
