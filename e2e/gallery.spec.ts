import { test, expect } from '@playwright/test';

/**
 * Public surface smoke tests.
 *
 * Deliberately independent of Supabase data: CI runs these against a
 * placeholder API URL, so every query fails and the gallery renders its error
 * state. Anything asserted here must therefore hold with no data at all.
 */
test.describe('Public surface', () => {
  test('the home page has a title, a banner and a single h1', async ({ page }) => {
    await page.goto('/');

    await expect(page).toHaveTitle(/Tristan Henrard/);
    await expect(page.getByRole('banner')).toBeVisible();
    await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
  });

  test('the primary navigation is behind the menu button, not hidden in the tab order', async ({
    page,
  }) => {
    await page.goto('/');

    // Closed: the header's nav is display:none and the drawer is aria-hidden,
    // so neither exposes a link. The footer keeps its own, which is fine — it
    // is visible. Scope to the banner to test the navigation specifically.
    const header = page.getByRole('banner');
    await expect(header.getByRole('link', { name: /^contact$/i })).toHaveCount(0);

    await page
      .getByRole('button', { name: /open or close the menu|ouvrir ou fermer le menu/i })
      .click();
    await expect(page.getByRole('link', { name: /^contact$/i }).first()).toBeVisible();
  });

  test('the skip link is the first thing a keyboard reaches', async ({ page }) => {
    await page.goto('/');
    await page.keyboard.press('Tab');

    await expect(page.getByRole('link', { name: /skip to content|aller au contenu/i })).toBeFocused();
  });

  test('the contact page is reachable and lists a mailto address', async ({ page }) => {
    await page.goto('/contact');

    await expect(page).toHaveURL(/\/contact$/);
    await expect(page.locator('a[href^="mailto:"]').first()).toBeVisible();
  });

  test('an unknown path renders the not-found view', async ({ page }) => {
    await page.goto('/this-route-does-not-exist');
    await expect(page.getByText(/erreur 404|error 404/i)).toBeVisible();
  });
});
