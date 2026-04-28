// Load environment variables
import dotenv from 'dotenv';

dotenv.config();

export const config = {
    // GitHub OAuth
    github: {
        clientId: process.env.GITHUB_CLIENT_ID,
        clientSecret: process.env.GITHUB_CLIENT_SECRET,
        redirectUri: process.env.GITHUB_REDIRECT_URI || 'http://localhost:3000/api/auth/callback/github'
    },
    
    // JWT
    jwt: {
        secret: process.env.JWT_SECRET,
        refreshSecret: process.env.JWT_REFRESH_SECRET,
        accessTokenExpiry: parseInt(process.env.ACCESS_TOKEN_EXPIRY || '180'),
        refreshTokenExpiry: parseInt(process.env.REFRESH_TOKEN_EXPIRY || '300')
    },
    
    // Server
    port: process.env.PORT || 3000,
    nodeEnv: process.env.NODE_ENV || 'development',
    apiBaseUrl: process.env.API_BASE_URL || 'http://localhost:3000',
    webPortalUrl: process.env.WEB_PORTAL_URL || 'http://localhost:5173',
    
    // CORS
    corsOrigin: (process.env.CORS_ORIGIN || 'http://localhost:5173,http://localhost:3000')
        .split(',')
        .map(origin => origin.trim())
        .filter(origin => origin.length > 0)
};

// Validate required environment variables
function validateConfig() {
    const required = ['GITHUB_CLIENT_ID', 'GITHUB_CLIENT_SECRET', 'JWT_SECRET', 'JWT_REFRESH_SECRET'];
    const missing = required.filter(key => !process.env[key]);
    
    if (missing.length > 0) {
        console.warn(`⚠️  Missing environment variables: ${missing.join(', ')}`);
        console.warn('Copy .env.example to .env and fill in the required values');
    }
}

if (process.env.NODE_ENV !== 'test') {
    validateConfig();
}

export default config;
