/**
 * Request logging middleware
 */
export function loggingMiddleware(req, res, next) {
    const startTime = Date.now();
    
    // Override res.json and res.send to capture status code
    const originalJson = res.json;
    const originalSend = res.send;
    
    function maskIp(ip) {
        if (!ip || ip === '-') {
            return '-';
        }

        if (ip.includes('.')) {
            const parts = ip.split('.');
            if (parts.length === 4) {
                return `${parts[0]}.${parts[1]}.${parts[2]}.0`;
            }
            return ip;
        }

        if (ip.includes(':')) {
            const parts = ip.split(':');
            return `${parts.slice(0, 4).join(':')}::`;
        }

        return ip;
    }

    function normalizeUserId(userId) {
        if (!userId) {
            return '-';
        }

        const value = String(userId).trim();
        if (!value) {
            return '-';
        }

        // Non-cryptographic pseudonymization for operational logs.
        let hash = 0;
        for (let index = 0; index < value.length; index += 1) {
            hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
        }
        return `u_${hash.toString(16).padStart(8, '0')}`;
    }

    // Logging these identifiers requires documented legal basis and retention policy.
    const createLogEntry = () => ({
        timestamp: new Date().toISOString(),
        method: req.method,
        endpoint: req.path,
        statusCode: res.statusCode,
        responseTime: `${Date.now() - startTime}ms`,
        userId: normalizeUserId(req.userId),
        userRole: req.userRole || '-',
        ip: maskIp(req.ip)
    });

    res.json = function(data) {
        if (!res._responseLogged) {
            console.log(JSON.stringify(createLogEntry()));
            res._responseLogged = true;
        }
        
        return originalJson.call(this, data);
    };
    
    res.send = function(data) {
        if (!res._responseLogged) {
            console.log(JSON.stringify(createLogEntry()));
            res._responseLogged = true;
        }
        
        return originalSend.call(this, data);
    };
    
    next();
}
