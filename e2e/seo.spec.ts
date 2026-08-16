import { test, expect } from '@playwright/test';

/**
 * Runs against the Vite dev server, which serves index.html for every path —
 * so this asserts what the client renders, not the HTTP status. The status
 * code is an nginx concern and is verified against the production image.
 */
test.describe('SEO surface', () => {
  test('gives the home page its own title and description', async ({ page }) => {
    await page.goto('/');

    await expect(page).toHaveTitle('Tristan Henrard — Portfolio mannequin | HenrardVisuals');
    await expect(page.locator('meta[name="description"]')).toHaveAttribute(
      'content',
      /Portfolio de Tristan Henrard/
    );
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      'href',
      'https://henrardvisuals.com/'
    );
  });

  test('gives the contact page a distinct title and canonical', async ({ page }) => {
    await page.goto('/contact');

    await expect(page).toHaveTitle('Contact — Tristan Henrard | HenrardVisuals');
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      'href',
      'https://henrardvisuals.com/contact'
    );
  });

  test('renders the designed 404 view for an unknown path and marks it noindex', async ({
    page,
  }) => {
    await page.goto('/this-route-does-not-exist');

    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      "Cette planche n'est pas au book."
    );
    await expect(page.getByText('Erreur 404')).toBeVisible();
    await expect(page).toHaveTitle('Page non trouvée | HenrardVisuals');
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
      'content',
      'noindex, nofollow'
    );
    await expect(page.locator('link[rel="canonical"]')).toHaveCount(0);
  });

  test('returns to the home page from the 404 without a full reload', async ({ page }) => {
    await page.goto('/this-route-does-not-exist');

    // A value on window survives a router navigation and dies on a document
    // load — which is the difference between <Link> and the old <a href>.
    await page.evaluate(() => {
      (window as unknown as { __spaMarker?: boolean }).__spaMarker = true;
    });

    await page.getByRole('link', { name: /Retour à l'accueil/ }).click();

    await expect(page).toHaveURL('/');

    const survived = await page.evaluate(
      () => (window as unknown as { __spaMarker?: boolean }).__spaMarker === true
    );
    expect(survived).toBe(true);
  });
});
