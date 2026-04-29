import { test, expect } from '@playwright/test';

test.describe('Authentication & OAuth Flow', () => {
  test('should display login page when unauthenticated', async ({ page }) => {
    await page.goto('http://localhost:5173/login');
    const loginButton = page.locator('button:has-text("Continue with GitHub"), a:has-text("Continue with GitHub"), button:has-text("Login")').first();
    const isVisible = await loginButton.isVisible();

    if (isVisible) {
      await expect(loginButton).toBeVisible();
      return;
    }

    const hasLoginText = await page.textContent('html');
    expect((hasLoginText ?? '').toLowerCase()).toContain('github');
  });

  test('should initiate GitHub OAuth correctly', async ({ page, context }) => {
    await page.goto('http://localhost:5173/login');
    const loginButton = page.locator('button:has-text("Continue with GitHub"), a:has-text("Continue with GitHub"), button:has-text("Login")').first();

    await expect(loginButton).toBeVisible();

    const popupPromise = context.waitForEvent('page', { timeout: 10000 })
      .then((popup) => ({ type: 'popup', popup }))
      .catch(() => null);
    const navigationPromise = page.waitForNavigation({ timeout: 10000 })
      .then(() => ({ type: 'navigation' }))
      .catch(() => null);

    await loginButton.click();

    const outcome = await Promise.race([popupPromise, navigationPromise].filter(Boolean));

    if (outcome?.type === 'popup') {
      const { popup } = outcome;
      await expect(popup).toHaveURL(/github\.com\/login(\?client_id=|\/oauth)/);
      await popup.close();
      return;
    }

    if (outcome?.type === 'navigation') {
      expect(page.url()).toMatch(/\/api\/auth\/github\?mode=web|github\.com\/login(\?client_id=|\/oauth)/);
      return;
    }

    expect.fail('OAuth initiation did not open a popup or navigate the page');
  });

  test('GET /api/auth/me should return 401 when unauthenticated', async ({ request }) => {
    const response = await request.get('/api/auth/me');
    expect(response.status()).toBe(401);
  });
});
