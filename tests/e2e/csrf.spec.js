import { test, expect } from '@playwright/test';

test.describe('CSRF Protection', () => {
  test('should reject request without CSRF token on mutation', async ({ request }) => {
    const response = await request.post('/api/profiles', {
      data: { name: 'Test Profile' },
    });

    expect(response.status()).toBe(400);
  });

  test('should reject request with CSRF header but no authentication', async ({
    request,
  }) => {
    const response = await request.post('/api/profiles', {
      headers: {
        'X-CSRF-Token': 'test-token',
      },
    });

    expect(response.status()).toBe(400);
  });
});
