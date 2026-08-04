import { test, expect } from '@playwright/test';

/**
 * Surface tests for the unauthenticated admin route.
 *
 * The admin panel does not redirect — App.tsx defines only /, /contact,
 * /admin and *, and Admin.tsx renders <Login> in place. The previous version
 * of this file asserted a redirect to /login, a route that has never existed,
 * so every case could only fail; with no CI, nothing ever ran it.
 *
 * True policy coverage lives in supabase/tests/rls_test.sql, run by the
 * `database` CI job.
 */
test.describe('admin surface (unauthenticated)', () => {
  test('renders the login form in place, without redirecting', async ({ page }) => {
    await page.goto('/admin');

    await expect(page.getByTestId('login-form-container')).toBeVisible();
    await expect(page).toHaveURL(/\/admin$/);
  });

  test('exposes no upload control', async ({ page }) => {
    await page.goto('/admin');
    await expect(page.locator('input[type="file"]')).toHaveCount(0);
  });

  test('exposes no photo or category management controls', async ({ page }) => {
    await page.goto('/admin');

    await expect(page.getByRole('button', { name: /publish|supprimer|delete/i })).toHaveCount(0);
    await expect(page.getByRole('tab')).toHaveCount(0);
  });

  test('is marked noindex', async ({ page }) => {
    await page.goto('/admin');
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
  });
});
