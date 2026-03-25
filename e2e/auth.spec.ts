import { test, expect } from '@playwright/test';

/**
 * Authentication flow tests.
 *
 * These tests verify login page structure and that unauthenticated
 * access to the admin area redirects correctly.
 */
test.describe('Authentication', () => {
  test('login page renders email and password fields', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('textbox', { name: /email/i })).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.getByRole('button', { name: /sign in|connexion|login/i })).toBeVisible();
  });

  test('unauthenticated access to /admin redirects to /login', async ({ page }) => {
    await page.goto('/admin');
    await expect(page).toHaveURL(/\/login/);
  });

  test('login form shows error on invalid credentials', async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('textbox', { name: /email/i }).fill('wrong@example.com');
    await page.locator('input[type="password"]').fill('wrongpassword');
    await page.getByRole('button', { name: /sign in|connexion|login/i }).click();

    // Expect an error message to appear (text varies; check for non-empty error region)
    await expect(
      page.locator('[role="alert"], .text-red-500, .text-red-600, .text-red-700').first()
    ).toBeVisible({ timeout: 10_000 });
  });
});
