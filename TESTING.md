# Testing Guide

## E2E Tests (Playwright)

E2E tests verify the complete application behavior across backend and frontend.

### Prerequisites

- Node.js 22+
- pnpm
- Both backend and frontend dependencies installed
- `.env` configured in `Backend/Api-integration/`

### Local Test Execution

```bash
# From project root

# Install Playwright browsers (one-time)
npx playwright install --with-deps chromium

# Run all tests
pnpm run test:e2e

# Run tests in UI mode (visual debugging)
pnpm run test:e2e:ui

# Run tests with debugger
pnpm run test:e2e:debug

# Run specific test file
npx playwright test tests/e2e/auth.spec.js
```

### Test Coverage

#### Export Limits (`tests/e2e/export.spec.js`)
- ✅ Health check responds 200
- ✅ Export >5000 profiles returns 413 with `X-Results-Truncated` header
- ✅ Export <5000 profiles returns 200 with CSV content-type

#### CSRF Protection (`tests/e2e/csrf.spec.js`)
- ✅ Requests without CSRF token fail (401/403)
- ✅ Requests with invalid CSRF token fail
- ✅ Valid authenticated requests with CSRF token succeed

#### Authentication (`tests/e2e/auth.spec.js`)
- ✅ Login page displays when unauthenticated
- ✅ GitHub OAuth initiation works correctly
- ✅ `/api/auth/me` returns 401 when unauthenticated

### CI Integration

The GitHub Actions workflow:
1. Runs backend tests first
2. Runs frontend lint & build
3. Runs E2E tests (depends on both above)
4. Uploads Playwright report as artifact (even on failure)

### Debugging Failed Tests

1. **Check Playwright Report**: After test failure, open `playwright-report/index.html`
2. **Live Debug**: Run `pnpm run test:e2e:ui` to step through in browser
3. **Console Logs**: Browser and API logs appear in test output
4. **Screenshots/Videos**: Automatically captured on failure and available in report

### Notes

- Playwright auto-starts the backend via `playwright.config.js` webServer config
- Tests are isolated and can run in parallel (currently 1 worker in CI for stability)
- Failed tests retry twice in CI (0 retries locally for faster feedback)
- Test timeout: 30 seconds per test
