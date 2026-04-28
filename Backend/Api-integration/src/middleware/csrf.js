import { statusError } from '../utils/response.js';
import { hasAuthCookies, parseCookies } from '../utils/cookies.js';

export function requireCsrf(req, res, next) {
    const method = (req.method || 'GET').toUpperCase();

    if (['GET', 'HEAD', 'OPTIONS'].includes(method)) {
        return next();
    }

    const cookieHeader = req.headers.cookie || '';

    if (!hasAuthCookies(cookieHeader)) {
        return next();
    }

    const cookies = parseCookies(cookieHeader);
    const csrfCookie = cookies.csrf_token;
    const csrfHeader = req.headers['x-csrf-token'] || req.headers['x-xsrf-token'];

    if (!csrfCookie || !csrfHeader || csrfCookie !== csrfHeader) {
        return statusError(res, 'CSRF token validation failed', 403);
    }

    return next();
}
