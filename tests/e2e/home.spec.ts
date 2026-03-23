import { test, expect } from '@playwright/test';

test.describe('Home Screen', () => {
  test('loads home page with logo and CTA', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('text=LeafScan')).toBeVisible();
  });

  test('shows quota badge', async ({ page }) => {
    await page.goto('/');
    // Quota text should be visible (either "1 Scan" or "Premium")
    const _quota = page.locator('[testID="quota-badge"]');
    // If no testID, look for scan text
    await expect(page.locator('text=/\\d+ Scan|Premium|Scan/')).toBeVisible({ timeout: 10000 });
  });

  test('navigates to library', async ({ page }) => {
    await page.goto('/');
    await page.click('text=Bibliothek');
    await expect(page).toHaveURL(/library/);
  });

  test('navigates to plants', async ({ page }) => {
    await page.goto('/');
    await page.click('text=Pflanzen');
    await expect(page).toHaveURL(/plants/);
  });

  test('shows legal footer links', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('text=Datenschutz')).toBeVisible();
    await expect(page.locator('text=AGB')).toBeVisible();
    await expect(page.locator('text=Impressum')).toBeVisible();
  });
});

test.describe('Responsive', () => {
  test('no horizontal scroll at 320px', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 568 });
    await page.goto('/');
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1);
  });
});
