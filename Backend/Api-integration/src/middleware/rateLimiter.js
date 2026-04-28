import rateLimit from 'express-rate-limit';
import { statusError } from '../utils/response.js';

/**
 * Rate limiter for auth endpoints
 * 10 requests per minute
 */
export const authLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 10,
    message: 'Too many authentication attempts, please try again later',
    standardHeaders: false, // Disable rate-limit headers in response
    skip: (req) => {
        return process.env.NODE_ENV === 'test';
    },
    handler: (req, res) => {
        return statusError(res, 'Too many requests. Please try again later.', 429);
    }
});

/**
 * Rate limiter for API endpoints per user
 * 60 requests per minute per user
 */
export const apiLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 60,
    keyGenerator: (req) => {
        // Use user ID if authenticated, otherwise use IP
        return req.userId || req.ip;
    },
    message: 'Too many API requests, please try again later',
    standardHeaders: false,
    skip: (req) => {
        return process.env.NODE_ENV === 'test';
    },
    handler: (req, res) => {
        return statusError(res, 'Too many requests. Please try again later.', 429);
    }
});

/**
 * Loose rate limiter for public endpoints
 * 30 requests per minute per IP
 */
export const publicLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 30,
    standardHeaders: false,
    skip: (req) => {
        return process.env.NODE_ENV === 'test';
    },
    handler: (req, res) => {
        return statusError(res, 'Too many requests. Please try again later.', 429);
    }
});
