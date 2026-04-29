import { test, expect } from '@playwright/test';

test.describe('API Health & Export Limits', () => {
  test('should respond to health check', async ({ request }) => {
    const response = await request.get('/api/health');
    expect(response.status()).toBe(200);
  });

  test('should return 413 when exporting >5000 profiles', async ({ request }) => {
    // This test assumes the database is seeded with >5000 profiles.
    // For local testing without seeds, it will skip if count <= 5000.
    const countRes = await request.get('/api/profiles/count');
    if (countRes.status() === 200) {
      const { total } = await countRes.json();
      if (total > 5000) {
        const exportRes = await request.get('/api/profiles/export');
        expect(exportRes.status()).toBe(413);
        expect(exportRes.headers()['x-results-truncated']).toBe('true');
        expect(exportRes.headers()['x-results-limit']).toBe('5000');
      } else {
        test.skip();
      }
    } else {
      test.skip();
    }
  });

  test('should successfully export <=5000 profiles', async ({ request }) => {
    const countRes = await request.get('/api/profiles/count');
    test.skip(countRes.status() !== 200, 'count endpoint failed');

    const { total } = await countRes.json();
    test.skip(total > 5000, 'too many profiles');

    const exportRes = await request.get('/api/profiles/export');
    expect(exportRes.status()).toBe(200);
    expect(exportRes.headers()['content-type']).toContain('text/csv');
  });
});
