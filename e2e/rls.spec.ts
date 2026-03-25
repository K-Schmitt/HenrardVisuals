import { test, expect } from '@playwright/test';

/**
 * RLS policy smoke tests.
 *
 * These tests verify that the application surface does not expose write
 * operations to unauthenticated users. They complement — but do not replace —
 * direct Supabase RLS policy tests (which require a local Supabase instance
 * and `supabase test db`).
 *
 * For true RLS coverage, run:
 *   supabase test db supabase/tests/rls.sql
 */
test.describe('RLS surface tests (unauthenticated)', () => {
  test('upload UI is not accessible without auth', async ({ page }) => {
    // The FileUpload component lives only inside the admin panel
    await page.goto('/admin');
    // Should redirect to login, never showing the upload area
    await expect(page).toHaveURL(/\/login/);
    await expect(page.locator('input[type="file"]')).toHaveCount(0);
  });

  test('admin photo management is behind auth', async ({ page }) => {
    await page.goto('/admin');
    await expect(page).toHaveURL(/\/login/);
  });

  test('category management is behind auth', async ({ page }) => {
    await page.goto('/admin');
    await expect(page).toHaveURL(/\/login/);
  });
});
