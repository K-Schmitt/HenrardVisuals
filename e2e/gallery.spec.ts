import { test, expect } from '@playwright/test';

/**
 * Public gallery smoke tests.
 *
 * These tests verify the page structure and UI interactions that do not
 * require authentication. When run against a local Supabase instance with
 * seeded data, they will also exercise the real Supabase queries.
 */
test.describe('Public gallery', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('home page loads and has a nav element', async ({ page }) => {
    await expect(page).toHaveTitle(/.+/);
    await expect(page.locator('nav, header')).toBeVisible();
  });

  test('language toggle is present', async ({ page }) => {
    // The app has a FR/EN language switcher
    const langToggle = page.getByRole('button', { name: /FR|EN/i });
    await expect(langToggle).toBeVisible();
  });

  test('category filter buttons are rendered', async ({ page }) => {
    // "All" filter should always be present once data loads
    await expect(page.getByRole('button', { name: /all/i })).toBeVisible({
      timeout: 10_000,
    });
  });

  test('contact page is accessible from nav', async ({ page }) => {
    const contactLink = page.getByRole('link', { name: /contact/i });
    await contactLink.click();
    await expect(page).toHaveURL(/\/contact/);
    await expect(page.locator('form')).toBeVisible();
  });
});
