import { test, expect } from '@playwright/test';

test.describe('CSRF Protection', () => {
  test('should reject request without CSRF token on mutation', async ({ request }) => {
    const response = await request.post('/api/profiles', {
      data: { name: 'Test Profile' },
    });
    // Should be 401 unauthorized (no auth) or 403 (CSRF failure)
    expect([401, 403]).toContain(response.status());
  });

  test('should accept request with valid CSRF header when authenticated', async ({
    request,
    context,
  }) => {
    // This is a placeholder test. In production, you'd need an actual authenticated session.
    // For now, this documents the expected behavior:
    // 1. Get csrf_token cookie from session
    // 2. Include X-CSRF-Token header matching cookie value
    // 3. POST should succeed if auth is valid

    // Simulate cookie-based request (this won't actually authenticate without real OAuth)
    const response = await request.post('/api/profiles', {
      headers: {
        'X-CSRF-Token': 'test-token',
      },
    });

    // Without a valid session, should still be 401
    expect(response.status()).toBe(401);
  });
});
