import { statusError } from '../utils/response.js';

/**
 * API version validation middleware
 * Requires X-API-Version header for /api/* routes
 */
export function apiVersionMiddleware(req, res, next) {
    const apiVersion = req.headers['x-api-version'];
    
    if (!apiVersion) {
        return statusError(res, 'API version header required', 400);
    }
    
    if (apiVersion !== '1') {
        return statusError(res, `API version ${apiVersion} not supported. Use version 1.`, 400);
    }
    
    next();
}
