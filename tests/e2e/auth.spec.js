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

    const popupPromise = context.waitForEvent('page', { timeout: 3000 }).catch(() => null);
    await loginButton.click();

    const popup = await popupPromise;

    if (popup) {
      await expect(popup).toHaveURL(/github\.com\/login(\?client_id=|\/oauth)/);
      await popup.close();
      return;
    }

    await page.waitForURL(/\/api\/auth\/github\?mode=web|github\.com\/login(\?client_id=|\/oauth)/, { timeout: 5000 });
    expect(page.url()).toMatch(/\/api\/auth\/github\?mode=web|github\.com\/login(\?client_id=|\/oauth)/);
  });

  test('GET /api/auth/me should return 401 when unauthenticated', async ({ request }) => {
    const response = await request.get('/api/auth/me');
    expect(response.status()).toBe(401);
  });
});
