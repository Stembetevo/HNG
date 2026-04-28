/**
 * Request logging middleware
 */
export function loggingMiddleware(req, res, next) {
    const startTime = Date.now();
    
    // Override res.json and res.send to capture status code
    const originalJson = res.json;
    const originalSend = res.send;
    
    res.json = function(data) {
        const responseTime = Date.now() - startTime;
        const logEntry = {
            timestamp: new Date().toISOString(),
            method: req.method,
            endpoint: req.path,
            statusCode: res.statusCode,
            responseTime: `${responseTime}ms`,
            userId: req.userId || '-',
            userRole: req.userRole || '-',
            ip: req.ip
        };
        
        console.log(JSON.stringify(logEntry));
        
        return originalJson.call(this, data);
    };
    
    res.send = function(data) {
        if (!res.headersSent) {
            const responseTime = Date.now() - startTime;
            const logEntry = {
                timestamp: new Date().toISOString(),
                method: req.method,
                endpoint: req.path,
                statusCode: res.statusCode,
                responseTime: `${responseTime}ms`,
                userId: req.userId || '-',
                userRole: req.userRole || '-',
                ip: req.ip
            };
            
            console.log(JSON.stringify(logEntry));
        }
        
        return originalSend.call(this, data);
    };
    
    next();
}
