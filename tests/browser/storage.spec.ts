import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { readFile } from 'node:fs/promises';

async function loadExample(page: import('@playwright/test').Page) {
  await page.goto('/#/local-data');
  await page.getByRole('button', { name: 'Review example household' }).click();
  await expect(page.getByRole('button', { name: 'Confirm example replacement' })).toBeDisabled();
  await page.getByRole('checkbox', { name: /I understand this replaces/ }).check();
  await page.getByRole('button', { name: 'Confirm example replacement' }).click();
  await expect(page.getByRole('heading', { name: 'Maple Home — example' })).toBeVisible();
}

test('creates and persists a blank household, reviews example replacement, and keeps local profile on reload', async ({ page }) => {
  await page.goto('/#/local-data');
  await page.getByLabel('Household name', { exact: true }).fill('Personal household');
  await page.getByLabel('Household timezone', { exact: true }).fill('America/Recife');
  await page.getByRole('button', { name: 'Create local household' }).click();
  await expect(page.getByRole('heading', { name: 'Personal household' })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Personal household' })).toBeVisible();
  await page.getByRole('button', { name: 'Review example household' }).click();
  await page.getByRole('button', { name: 'Cancel replacement' }).click();
  await expect(page.getByRole('heading', { name: 'Personal household' })).toBeVisible();
  await loadExample(page);
  await page.getByLabel('Current local profile').selectOption({ label: 'Alex' });
  await expect(page.getByLabel('Current local profile')).toHaveValue('22222222-2222-4222-8222-222222222222');
  await page.reload();
  await expect(page.getByLabel('Current local profile')).toHaveValue('22222222-2222-4222-8222-222222222222');
  await expect(page.getByText(/Sam: every Tuesday and every other Friday/)).toBeVisible();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test('exports and restores a versioned backup only after explicit impact review', async ({ page }) => {
  await loadExample(page);
  const downloadEvent = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export JSON backup' }).click();
  const download = await downloadEvent;
  const path = await download.path();
  const contents = await readFile(path!, 'utf8');
  expect(JSON.parse(contents)).toMatchObject({ format: 'our-home-backup', version: 2 });
  expect(JSON.parse(contents).dataset.imports).toEqual([]);
  await page.getByRole('button', { name: 'Review reset' }).click();
  await page.getByRole('checkbox', { name: /I understand this replaces/ }).check();
  await page.getByRole('button', { name: 'Confirm reset', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Start with an empty household' })).toBeVisible();
  await page.getByLabel(/Choose an Our Home JSON backup/).setInputFiles({ name: 'backup.json', mimeType: 'application/json', buffer: Buffer.from(contents) });
  await expect(page.getByRole('heading', { name: 'Review restore' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Confirm restore', exact: true })).toBeDisabled();
  await page.getByRole('checkbox', { name: /I understand this replaces/ }).check();
  await page.getByRole('button', { name: 'Confirm restore', exact: true }).click();
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Maple Home — example' })).toBeVisible();
});

test('another tab refreshes its profile but cannot confirm a stale replacement', async ({ page, context }) => {
  await loadExample(page);
  await page.getByRole('button', { name: 'Review reset' }).click();
  const other = await context.newPage();
  await other.goto('/#/local-data');
  await other.getByLabel('Current local profile').selectOption({ label: 'Jordan' });
  await expect(other.getByLabel('Current local profile')).toHaveValue('33333333-3333-4333-8333-333333333333');
  await expect(page.getByLabel('Current local profile')).toHaveValue('33333333-3333-4333-8333-333333333333');
  await page.getByRole('checkbox', { name: /I understand this replaces/ }).check();
  await page.getByRole('button', { name: 'Confirm reset', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('This household changed.');
  await other.reload();
  await expect(other.getByRole('heading', { name: 'Maple Home — example' })).toBeVisible();
  await other.close();
});

test('denied browser storage offers explicit temporary mode and no false persistence', async ({ page, context }) => {
  await context.addInitScript(() => Object.defineProperty(window, 'indexedDB', { get() { throw new DOMException('test-only storage denial', 'SecurityError'); } }));
  await page.goto('/#/local-data');
  await expect(page.getByRole('alert')).toContainText('Local storage needs attention.');
  await page.getByRole('button', { name: 'Use temporary memory instead' }).click();
  await expect(page.getByText('Temporary mode.', { exact: true })).toBeVisible();
  await page.getByLabel('Household name', { exact: true }).fill('Only in memory');
  await page.getByRole('button', { name: 'Create local household' }).click();
  await expect(page.getByRole('heading', { name: 'Only in memory' })).toBeVisible();
  await page.getByRole('link', { name: 'About', exact: true }).click();
  await page.getByRole('link', { name: 'Local data', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Only in memory' })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('alert')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Only in memory' })).toHaveCount(0);
});

test('migrates a known old database and reports corrupt saved data without resetting it', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(async () => {
    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.open('our-home-local', 1);
      request.onupgradeneeded = () => request.result.createObjectStore('state').put({ schemaVersion: 1, revision: 4, dataset: null, currentMemberId: null }, 'current');
      request.onerror = () => reject(request.error);
      request.onsuccess = () => { request.result.close(); resolve(); };
    });
  });
  await page.goto('/#/local-data');
  await expect(page.getByRole('heading', { name: 'Start with an empty household' })).toBeVisible();
  expect(await page.evaluate(async () => new Promise<number>((resolve) => { const request = indexedDB.open('our-home-local'); request.onsuccess = () => { const version = request.result.version; request.result.close(); resolve(version); }; }))).toBe(2);
  await page.evaluate(async () => {
    await new Promise<void>((resolve) => {
      const request = indexedDB.open('our-home-local');
      request.onsuccess = () => { const db = request.result; const tx = db.transaction('state', 'readwrite'); tx.objectStore('state').put({ schemaVersion: 2, revision: -1, privateNote: 'retained test data' }, 'current'); tx.oncomplete = () => { db.close(); resolve(); }; };
    });
  });
  await page.reload();
  await expect(page.getByRole('alert')).toContainText('Saved household data is invalid.');
  await page.getByRole('button', { name: 'Use temporary memory instead' }).click();
  await expect(page.getByText('Temporary mode.', { exact: true })).toBeVisible();
  expect(await page.evaluate(async () => new Promise<unknown>((resolve) => {
    const request = indexedDB.open('our-home-local'); request.onsuccess = () => { const db = request.result; const tx = db.transaction('state'); const read = tx.objectStore('state').get('current'); read.onsuccess = () => resolve(read.result); tx.oncomplete = () => db.close(); };
  }))).toMatchObject({ privateNote: 'retained test data' });
});
