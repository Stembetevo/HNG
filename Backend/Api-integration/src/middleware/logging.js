/**
 * Request logging middleware
 */
export function loggingMiddleware(req, res, next) {
    const startTime = Date.now();
    
    // Override res.json and res.send to capture status code
    const originalJson = res.json;
    const originalSend = res.send;
    
    // Flag to ensure we only log once per request
    let logged = false;

    const createLogEntry = () => ({
        timestamp: new Date().toISOString(),
        method: req.method,
        endpoint: req.path,
        statusCode: res.statusCode,
        responseTime: `${Date.now() - startTime}ms`,
        userId: req.userId || '-',
        userRole: req.userRole || '-',
        ip: req.ip
    });

    res.json = function(data) {
        if (!logged) {
            console.log(JSON.stringify(createLogEntry()));
            logged = true;
        }
        
        return originalJson.call(this, data);
    };
    
    res.send = function(data) {
        if (!logged) {
            console.log(JSON.stringify(createLogEntry()));
            logged = true;
        }
        
        return originalSend.call(this, data);
    };
    
    next();
}
