import { test, expect } from '@playwright/test';

/**
 * Authentication flow.
 *
 * The login form lives at /admin, not at /login — there is no such route.
 * These tests exercise the form's own validation, which needs no backend;
 * anything past a successful sign-in requires a seeded Supabase and belongs
 * to a manual pass, not to CI.
 */
test.describe('Authentication', () => {
  test('the admin route renders email and password fields', async ({ page }) => {
    await page.goto('/admin');

    await expect(page.getByRole('textbox', { name: /e-?mail/i })).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.getByRole('button', { name: /sign in|se connecter/i })).toBeVisible();
  });

  test('submitting an empty form reports both fields', async ({ page }) => {
    await page.goto('/admin');
    await page.getByRole('button', { name: /sign in|se connecter/i }).click();

    await expect(page.getByText(/email is required|adresse e-mail est requise/i)).toBeVisible();
    await expect(page.getByText(/password is required|mot de passe est requis/i)).toBeVisible();
  });

  test('a malformed address is rejected before any request', async ({ page }) => {
    await page.goto('/admin');
    await page.getByRole('textbox', { name: /e-?mail/i }).fill('not-an-email');
    await page.locator('input[type="password"]').fill('longenoughpassword');
    await page.getByRole('button', { name: /sign in|se connecter/i }).click();

    await expect(
      page.getByText(/valid email address|adresse e-mail valide/i)
    ).toBeVisible();
  });

  test('a short password is rejected before any request', async ({ page }) => {
    await page.goto('/admin');
    await page.getByRole('textbox', { name: /e-?mail/i }).fill('someone@example.com');
    await page.locator('input[type="password"]').fill('short');
    await page.getByRole('button', { name: /sign in|se connecter/i }).click();

    await expect(page.getByText(/at least 8 characters|au moins 8 caractères/i)).toBeVisible();
  });
});
