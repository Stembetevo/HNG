import { Router } from 'express';
import {
    initiateGitHubOAuth,
    handleGitHubCallback,
    startCliOAuth,
    cliCallbackExchange,
    refreshAccessToken,
    logout,
    getCurrentUser
} from '../controllers/AuthController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { requireCsrf } from '../middleware/csrf.js';
import { authLimiter } from '../middleware/rateLimiter.js';

const router = Router();

// OAuth
router.get('/github', authLimiter, initiateGitHubOAuth);
router.get('/github/callback', authLimiter, handleGitHubCallback);

// CLI PKCE OAuth flow
router.post('/cli/start', authLimiter, startCliOAuth);
router.post('/cli/callback', authLimiter, cliCallbackExchange);

// Token management
router.post('/refresh', authLimiter, requireCsrf, refreshAccessToken);
// Explicitly return 405 for GET /refresh to enforce POST-only
router.get('/refresh', (req, res) => res.status(405).json({ status: 'error', message: 'Method Not Allowed. Use POST /refresh' }));

// User logout
router.post('/logout', authMiddleware, requireCsrf, logout);

// Get current user
router.get('/me', authMiddleware, getCurrentUser);

// Test helper: return deterministic admin/analyst tokens when enabled
router.get('/test/tokens', authLimiter, async (req, res) => {
    // Only enabled when ALLOW_TEST_ENDPOINTS is truthy
    if (process.env.ALLOW_TEST_ENDPOINTS !== 'true') {
        return res.status(404).json({ status: 'error', message: 'Not found' });
    }

    try {
        // Lazily require service to avoid circular deps
        const {
            createAccessToken,
            createRefreshToken,
            storeRefreshToken,
            createOrUpdateUser
        } = await import('../services/AuthService.js');

        // Ensure admin user exists
        const adminResult = await createOrUpdateUser('test-admin', 'admin', 'admin@example.local', '');
        const analystResult = await createOrUpdateUser('test-analyst', 'analyst', 'analyst@example.local', '');

        const admin = adminResult.user;
        const analyst = analystResult.user;

        const adminAccess = createAccessToken(admin.id, admin.username, 'admin');
        const adminRefresh = createRefreshToken(admin.id);
        await storeRefreshToken(admin.id, adminRefresh);

        const analystAccess = createAccessToken(analyst.id, analyst.username, 'analyst');
        const analystRefresh = createRefreshToken(analyst.id);
        await storeRefreshToken(analyst.id, analystRefresh);

        return res.json({
            status: 'success',
            data: {
                admin: { access_token: adminAccess, refresh_token: adminRefresh },
                analyst: { access_token: analystAccess, refresh_token: analystRefresh }
            }
        });
    } catch (err) {
        console.error('Error generating test tokens:', err);
        return res.status(500).json({ status: 'error', message: 'Failed to generate test tokens' });
    }
});

export default router;
