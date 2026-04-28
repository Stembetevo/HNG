import jwt from 'jsonwebtoken';
import {
    createAccessToken,
    createRefreshToken,
    storeRefreshToken,
    verifyAndInvalidateRefreshToken,
    exchangeGitHubCode,
    createOrUpdateUser,
    getUserById,
    logoutUser
} from '../services/AuthService.js';
import { statusSuccess, statusError } from '../utils/response.js';
import config from '../config/index.js';
import crypto from 'crypto';

const // store temporary OAuth states (in production, use Redis)
oauthStates = new Map();
const STATE_EXPIRY = 10 * 60 * 1000; // 10 minutes

/**
 * Initiate GitHub OAuth flow
 */
export async function initiateGitHubOAuth(req, res) {
    try {
        const state = crypto.randomBytes(32).toString('hex');
        const expiresAt = Date.now() + STATE_EXPIRY;
        
        oauthStates.set(state, { expiresAt });
        
        const params = new URLSearchParams({
            client_id: config.github.clientId,
            redirect_uri: config.github.redirectUri,
            scope: 'user:email',
            state,
            allow_signup: 'true'
        });
        
        const redirectUrl = `https://github.com/login/oauth/authorize?${params}`;
        
        return res.json({
            status: 'success',
            data: {
                authorization_url: redirectUrl,
                state
            }
        });
    } catch (error) {
        console.error('Error initiating OAuth:', error);
        return statusError(res, 'Failed to initiate OAuth flow', 500);
    }
}

/**
 * Handle GitHub OAuth callback
 */
export async function handleGitHubCallback(req, res) {
    try {
        const { code, state } = req.query;
        
        if (!code || !state) {
            return statusError(res, 'Missing code or state parameter', 400);
        }
        
        // Verify state
        const storedState = oauthStates.get(state);
        if (!storedState) {
            return statusError(res, 'Invalid or expired state', 401);
        }
        
        if (storedState.expiresAt < Date.now()) {
            oauthStates.delete(state);
            return statusError(res, 'State expired', 401);
        }
        
        // Clean up state
        oauthStates.delete(state);
        
        // Exchange code for user info
        const result = await exchangeGitHubCode(code, undefined);
        
        if (!result.success) {
            return statusError(res, result.error, 401);
        }
        
        // Create or update user
        const { user: githubUser, isNew } = result;
        const userResult = await createOrUpdateUser(
            githubUser.githubId,
            githubUser.username,
            githubUser.email,
            githubUser.avatarUrl
        );
        
        if (!userResult.success) {
            return statusError(res, userResult.error, 500);
        }
        
        const user = userResult.user;
        
        // Check if user is active
        if (!user.is_active) {
            return statusError(res, 'User account is inactive', 403);
        }
        
        // Generate tokens
        const accessToken = createAccessToken(user.id, user.username, user.role);
        const refreshToken = createRefreshToken(user.id);
        
        // Store refresh token
        await storeRefreshToken(user.id, refreshToken);
        
        return res.json({
            status: 'success',
            data: {
                access_token: accessToken,
                refresh_token: refreshToken,
                user: {
                    id: user.id,
                    username: user.username,
                    email: user.email,
                    avatar_url: user.avatar_url,
                    role: user.role,
                    is_new: isNew
                }
            }
        });
    } catch (error) {
        console.error('Error handling OAuth callback:', error);
        return statusError(res, 'Failed to handle OAuth callback', 500);
    }
}

/**
 * Start CLI OAuth flow - create server-side state and return authorization URL
 */
export async function startCliOAuth(req, res) {
    try {
        const { code_challenge, redirect_uri } = req.body ?? {};

        if (!code_challenge || !redirect_uri) {
            return statusError(res, 'code_challenge and redirect_uri are required', 400);
        }

        const state = require('crypto').randomBytes(32).toString('hex');
        const expiresAt = Date.now() + STATE_EXPIRY;
        
        // Store state along with the expected redirect URI and code_challenge
        oauthStates.set(state, { expiresAt, redirect_uri, code_challenge });

        const params = new URLSearchParams({
            client_id: config.github.clientId,
            redirect_uri,
            scope: 'user:email',
            state,
            code_challenge,
            code_challenge_method: 'S256',
            allow_signup: 'true'
        });

        const redirectUrl = `https://github.com/login/oauth/authorize?${params}`;

        return res.json({ status: 'success', data: { authorization_url: redirectUrl, state } });
    } catch (error) {
        console.error('Error initiating CLI OAuth:', error);
        return statusError(res, 'Failed to initiate CLI OAuth flow', 500);
    }
}

/**
 * CLI callback exchange - accept code + verifier + state, validate state, exchange with GitHub
 */
export async function cliCallbackExchange(req, res) {
    try {
        const { code, code_verifier, state } = req.body ?? {};

        if (!code || !code_verifier || !state) {
            return statusError(res, 'code, code_verifier and state are required', 400);
        }

        const stored = oauthStates.get(state);
        if (!stored) {
            return statusError(res, 'Invalid or expired state', 401);
        }

        if (stored.expiresAt < Date.now()) {
            oauthStates.delete(state);
            return statusError(res, 'State expired', 401);
        }

        // Remove the stored state immediately
        oauthStates.delete(state);

        // Perform exchange with GitHub using stored redirect_uri and provided code_verifier
        const exchangeResult = await exchangeGitHubCode(code, code_verifier, stored.redirect_uri);

        if (!exchangeResult.success) {
            return statusError(res, exchangeResult.error || 'Failed to exchange code', 401);
        }

        const githubUser = exchangeResult.user;

        // Create or update user
        const userResult = await createOrUpdateUser(
            githubUser.githubId,
            githubUser.username,
            githubUser.email,
            githubUser.avatarUrl
        );

        if (!userResult.success) {
            return statusError(res, userResult.error, 500);
        }

        const user = userResult.user;

        if (!user.is_active) {
            return statusError(res, 'User account is inactive', 403);
        }

        const accessToken = createAccessToken(user.id, user.username, user.role);
        const refreshToken = createRefreshToken(user.id);

        await storeRefreshToken(user.id, refreshToken);

        return res.json({
            status: 'success',
            data: {
                access_token: accessToken,
                refresh_token: refreshToken,
                user: {
                    id: user.id,
                    username: user.username,
                    email: user.email,
                    avatar_url: user.avatar_url,
                    role: user.role
                }
            }
        });
    } catch (error) {
        console.error('Error in CLI callback exchange:', error);
        return statusError(res, 'Failed to complete CLI OAuth exchange', 500);
    }
}

/**
 * Refresh access token
 */
export async function refreshAccessToken(req, res) {
    try {
        const { refresh_token } = req.body;
        
        if (!refresh_token) {
            return statusError(res, 'Refresh token is required', 400);
        }
        
        // Decode and verify the refresh token
        let decoded;
        try {
            decoded = jwt.verify(refresh_token, config.jwt.refreshSecret);
        } catch (error) {
            return statusError(res, 'Invalid or expired refresh token', 401);
        }
        
        if (decoded.type !== 'refresh') {
            return statusError(res, 'Invalid token type', 401);
        }
        
        // Verify and invalidate the refresh token
        const result = await verifyAndInvalidateRefreshToken(decoded.userId, refresh_token);
        
        if (!result.valid) {
            return statusError(res, result.error || 'Invalid refresh token', 401);
        }
        
        // Get user info
        const user = getUserById(decoded.userId);
        
        if (!user) {
            return statusError(res, 'User not found', 404);
        }
        
        if (!user.is_active) {
            return statusError(res, 'User account is inactive', 403);
        }
        
        // Generate new tokens
        const newAccessToken = createAccessToken(user.id, user.username, user.role);
        const newRefreshToken = createRefreshToken(user.id);
        
        // Store new refresh token
        await storeRefreshToken(user.id, newRefreshToken);
        
        return res.json({
            status: 'success',
            data: {
                access_token: newAccessToken,
                refresh_token: newRefreshToken
            }
        });
    } catch (error) {
        console.error('Error refreshing token:', error);
        return statusError(res, 'Failed to refresh token', 500);
    }
}

/**
 * Logout user
 */
export async function logout(req, res) {
    try {
        const userId = req.userId; // Set by auth middleware
        
        if (!userId) {
            return statusError(res, 'User not authenticated', 401);
        }
        
        // Invalidate all refresh tokens
        const result = await logoutUser(userId);
        
        if (!result.success) {
            return statusError(res, result.error, 500);
        }
        
        return statusSuccess(res, { message: 'Logged out successfully' });
    } catch (error) {
        console.error('Error logging out:', error);
        return statusError(res, 'Failed to logout', 500);
    }
}

/**
 * Get current user info
 */
export function getCurrentUser(req, res) {
    try {
        const userId = req.userId;
        
        if (!userId) {
            return statusError(res, 'User not authenticated', 401);
        }
        
        const user = getUserById(userId);
        
        if (!user) {
            return statusError(res, 'User not found', 404);
        }
        
        return statusSuccess(res, {
            id: user.id,
            username: user.username,
            email: user.email,
            avatar_url: user.avatar_url,
            role: user.role,
            is_active: user.is_active,
            created_at: user.created_at,
            last_login_at: user.last_login_at
        });
    } catch (error) {
        console.error('Error getting current user:', error);
        return statusError(res, 'Failed to get user info', 500);
    }
}
