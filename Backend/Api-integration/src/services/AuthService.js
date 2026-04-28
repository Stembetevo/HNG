import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import axios from 'axios';
import { v7 as uuidv7 } from 'uuid';
import db from '../database/database.js';
import config from '../config/index.js';

const GITHUB_API_BASE = 'https://api.github.com';
const GITHUB_OAUTH_BASE = 'https://github.com';

/**
 * Create access token
 */
export function createAccessToken(userId, username, role) {
    const payload = {
        userId,
        username,
        role,
        type: 'access'
    };
    
    return jwt.sign(payload, config.jwt.secret, {
        expiresIn: `${config.jwt.accessTokenExpiry}s`,
        algorithm: 'HS256'
    });
}

/**
 * Create refresh token
 */
export function createRefreshToken(userId) {
    const payload = {
        userId,
        type: 'refresh',
        jti: uuidv7() // JWT ID for uniqueness
    };
    
    return jwt.sign(payload, config.jwt.refreshSecret, {
        expiresIn: `${config.jwt.refreshTokenExpiry}s`,
        algorithm: 'HS256'
    });
}

/**
 * Hash refresh token for storage
 */
function hashToken(token) {
    return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Store refresh token in database
 */
export async function storeRefreshToken(userId, refreshToken) {
    const tokenHash = hashToken(refreshToken);
    const expiresAt = new Date(Date.now() + config.jwt.refreshTokenExpiry * 1000).toISOString();
    const tokenId = uuidv7();
    
    try {
        const stmt = db.prepare(`
            INSERT INTO refresh_tokens (id, user_id, token_hash, expires_at, created_at)
            VALUES (?, ?, ?, ?, ?)
        `);
        
        stmt.run(tokenId, userId, tokenHash, expiresAt, new Date().toISOString());
        return { success: true };
    } catch (error) {
        console.error('Error storing refresh token:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Verify and invalidate refresh token
 */
export async function verifyAndInvalidateRefreshToken(userId, refreshToken) {
    try {
        // Decode token to verify JWT signature
        const decoded = jwt.verify(refreshToken, config.jwt.refreshSecret);
        
        // Verify token type
        if (decoded.type !== 'refresh') {
            return {
                valid:false,
                error:'Invalid token type'
            }
        }

        if (decoded.userId !== userId) {
            return { valid: false, error: 'User ID mismatch' };
        }
        
        const tokenHash = hashToken(refreshToken);
        
        // Atomic delete operation: delete only valid, non-expired tokens
        // Use a transaction to ensure this is atomic
        try {
            db.exec('BEGIN');
            
            // Delete token and check if any row was actually deleted
            const deleteStmt = db.prepare(`
                DELETE FROM refresh_tokens 
                WHERE user_id = ? AND token_hash = ? AND expires_at > datetime('now')
            `);
            
            const result = deleteStmt.run(userId, tokenHash);
            const deletedRowCount = result.changes;
            
            db.exec('COMMIT');
            
            // If no rows were deleted, token was not found or expired
            if (deletedRowCount === 0) {
                return { valid: false, error: 'Token not found or expired' };
            }
        } catch (txnError) {
            try {
                db.exec('ROLLBACK');
            } catch (e) {
                // ignore rollback errors
            }
            throw txnError;
        }
        
        return { valid: true, decoded };
    } catch (error) {
        console.error('Error verifying refresh token:', error);
        return { valid: false, error: error.message };
    }
}

/**
 * Verify access token
 */
export function verifyAccessToken(token) {
    try {
        const decoded = jwt.verify(token, config.jwt.secret);
        
        if (decoded.type !== 'access') {
            return { valid: false, error: 'Invalid token type' };
        }
        
        return { valid: true, decoded };
    } catch (error) {
        return { valid: false, error: error.message };
    }
}

/**
 * Exchange GitHub auth code for user info
 */
export async function exchangeGitHubCode(code, codeVerifier, redirectUri) {
    try {
        // Step 1: Exchange code for access token
        const body = {
            client_id: config.github.clientId,
            client_secret: config.github.clientSecret,
            code,
            redirect_uri: redirectUri || config.github.redirectUri
        };

        // Include PKCE verifier when provided
        if (codeVerifier) {
            body.code_verifier = codeVerifier;
        }

        const tokenResponse = await axios.post(
            `${GITHUB_OAUTH_BASE}/login/oauth/access_token`,
            body,
            {
                headers: {
                    Accept: 'application/json'
                },
                timeout: 10000
            }
        );
        
        if (tokenResponse.data.error) {
            return {
                success: false,
                error: tokenResponse.data.error_description || 'Failed to exchange code'
            };
        }
        
        const githubAccessToken = tokenResponse.data.access_token;
        
        // Step 2: Get user information
        const userResponse = await axios.get(`${GITHUB_API_BASE}/user`, {
            headers: {
                Authorization: `Bearer ${githubAccessToken}`,
                Accept: 'application/vnd.github.v3+json'
            },
            timeout: 5000
        });
        
        const githubUser = userResponse.data;
        
        return {
            success: true,
            user: {
                githubId: githubUser.id,
                username: githubUser.login,
                email: githubUser.email,
                avatarUrl: githubUser.avatar_url
            }
        };
    } catch (error) {
        console.error('Error exchanging GitHub code:', error.message);
        return {
            success: false,
            error: error.message || 'Failed to authenticate with GitHub'
        };
    }
}

/**
 * Create or update user in database
 */
export async function createOrUpdateUser(githubId, username, email, avatarUrl) {
    try {
        // Check if user exists
        const selectStmt = db.prepare('SELECT * FROM users WHERE github_id = ?');
        if (existingUser) {
            // Update last login
            const now = new Date().toISOString();
            const updateStmt = db.prepare(`
                UPDATE users 
                SET last_login_at = ?, email = ?, avatar_url = ?
                WHERE id = ?
            `);
            
            updateStmt.run(now, email, avatarUrl, existingUser.id);
            
            return {
                success: true,
                user: {
                    ...existingUser,
                    email,
                    avatar_url: avatarUrl,
                    last_login_at: now
                },
                isNew: false
            };
        }
        
        // Create new user with analyst role by default
        const userId = uuidv7();
        const insertStmt = db.prepare(`
            INSERT INTO users (
                id, github_id, username, email, avatar_url, 
                role, is_active, created_at, last_login_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        
        insertStmt.run(
            userId,
            githubId,
            username,
            email,
            avatarUrl,
            'analyst', // default role
            1, // is_active
            new Date().toISOString(),
            new Date().toISOString()
        );
        
        return {
            success: true,
            user: {
                id: userId,
                github_id: githubId,
                username,
                email,
                avatar_url: avatarUrl,
                role: 'analyst',
                is_active: 1,
                created_at: new Date().toISOString(),
                last_login_at: new Date().toISOString()
            },
            isNew: true
        };
    } catch (error) {
        console.error('Error creating or updating user:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Get user by ID
 */
export async function getUserById(userId) {
    try {
        const stmt = db.prepare('SELECT * FROM users WHERE id = ?');
        return stmt.get(userId) || null;
    } catch (error) {
        console.error('Error getting user:', error);
        return null;
    }
}

/**
 * Get user by GitHub ID
 */
export function getUserByGitHubId(githubId) {
    try {
        const stmt = db.prepare('SELECT * FROM users WHERE github_id = ?');
        return stmt.get(githubId) || null;
    } catch (error) {
        console.error('Error getting user:', error);
        return null;
    }
}

/**
 * Logout user (invalidate all refresh tokens)
 */
export async function logoutUser(userId) {
    try {
        const deleteStmt = db.prepare('DELETE FROM refresh_tokens WHERE user_id = ?');
        deleteStmt.run(userId);
        return { success: true };
    } catch (error) {
        console.error('Error logging out user:', error);
        return { success: false, error: error.message };
    }
}
