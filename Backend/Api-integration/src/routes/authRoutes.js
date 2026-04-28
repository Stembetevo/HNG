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
import { authLimiter } from '../middleware/rateLimiter.js';

const router = Router();

// OAuth
router.get('/github', authLimiter, initiateGitHubOAuth);
router.get('/github/callback', authLimiter, handleGitHubCallback);

// CLI PKCE OAuth flow
router.post('/cli/start', authLimiter, startCliOAuth);
router.post('/cli/callback', authLimiter, cliCallbackExchange);

// Token management
router.post('/refresh', authLimiter, refreshAccessToken);

// User logout
router.post('/logout', authMiddleware, logout);

// Get current user
router.get('/me', authMiddleware, getCurrentUser);

export default router;
