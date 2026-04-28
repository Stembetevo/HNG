import { verifyAccessToken } from '../services/AuthService.js';
import { statusError } from '../utils/response.js';
import { getUserById } from '../services/AuthService.js';
import { parseCookies } from '../utils/cookies.js';

/**
 * Authentication middleware - verifies JWT token
 */
export async function authMiddleware(req, res, next) {
    try {
        const authHeader = req.headers.authorization;
        const cookies = parseCookies(req.headers.cookie || '');
        
        let token = null;
        let authSource = 'bearer';

        if (authHeader) {
            const parts = authHeader.split(' ');
            if (parts.length !== 2 || parts[0] !== 'Bearer') {
                return statusError(res, 'Invalid authorization header format', 401);
            }

            token = parts[1];
        } else if (cookies.access_token) {
            token = cookies.access_token;
            authSource = 'cookie';
        }

        if (!token) {
            return statusError(res, 'Authentication required', 401);
        }

        const result = verifyAccessToken(token);
        
        if (!result.valid) {
            return statusError(res, result.error || 'Invalid or expired token', 401);
        }
        
        const user = await getUserById(result.decoded.userId);
        
        if (!user) {
            return statusError(res, 'User not found', 404);
        }
        
        if (!user.is_active) {
            return statusError(res, 'User account is inactive', 403);
        }
        
        // Attach user info to request
        req.userId = result.decoded.userId;
        req.username = result.decoded.username;
        req.userRole = result.decoded.role;
        req.authSource = authSource;
        
        next();
    } catch (error) {
        console.error('Auth middleware error:', error);
        return statusError(res, 'Authentication failed', 500);
    }
}

/**
 * Authorization middleware - checks user role
 */
export function requireRole(...allowedRoles) {
    return (req, res, next) => {
        if (!req.userId) {
            return statusError(res, 'User not authenticated', 401);
        }
        
        if (!allowedRoles.includes(req.userRole)) {
            return statusError(
                res,
                'You do not have permission to perform this action',
                403
            );
        }
        
        next();
    };
}

/**
 * Admin-only middleware
 */
export function requireAdmin(req, res, next) {
    return requireRole('admin')(req, res, next);
}

/**
 * Optional auth middleware - doesn't fail if no token, but extracts user if present
 */
export async function optionalAuthMiddleware(req, res, next) {
    try {
        const authHeader = req.headers.authorization;
        const cookies = parseCookies(req.headers.cookie || '');
        
        let token = null;

        if (authHeader) {
            const parts = authHeader.split(' ');
            if (parts.length !== 2 || parts[0] !== 'Bearer') {
                return next();
            }
            token = parts[1];
        } else if (cookies.access_token) {
            token = cookies.access_token;
        } else {
            return next();
        }

        const result = verifyAccessToken(token);
        
        if (!result.valid) {
            return next();
        }
        
        const user = await getUserById(result.decoded.userId);
        
        if (!user || !user.is_active) {
            return next();
        }
        
        req.userId = result.decoded.userId;
        req.username = result.decoded.username;
        req.userRole = result.decoded.role;
        req.authSource = authHeader ? 'bearer' : 'cookie';
        
        next();
    } catch (error) {
        console.error('Optional auth middleware error:', error);
        next();
    }
}
