# Deployment Guide

## Overview

This guide covers deploying Insighta Labs+ API and Portal to production with security, scalability, and reliability best practices.

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                  GitHub Actions CI/CD                │
│  (Build, Test, Security Scan, Deploy)               │
└─────────────────────────────────────────────────────┘
                          │
          ┌───────────────┼───────────────┐
          ▼               ▼               ▼
    ┌──────────┐    ┌─────────┐    ┌──────────┐
    │  Portal  │    │  Backend│    │ Database │
    │(Vercel)  │    │(Container)   │(SQLite)  │
    └──────────┘    └─────────┘    └──────────┘
```

## Phase 1: Container Setup (Docker)

### Backend Dockerfile

Create `Backend/Api-integration/Dockerfile`:

```dockerfile
FROM node:22-alpine

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install dependencies
RUN pnpm install --frozen-lockfile --prod

# Copy source
COPY src ./src

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

# Start server
CMD ["pnpm", "start"]
```

### Docker Compose (Local Development)

Create `docker-compose.yml` at root:

```yaml
version: '3.8'

services:
  backend:
    build:
      context: ./Backend/Api-integration
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    environment:
      NODE_ENV: production
      GITHUB_CLIENT_ID: ${GITHUB_CLIENT_ID}
      GITHUB_CLIENT_SECRET: ${GITHUB_CLIENT_SECRET}
      GITHUB_REDIRECT_URI: http://localhost:3000/api/auth/callback/github
      WEB_PORTAL_URL: http://localhost:5173
      JWT_SECRET: ${JWT_SECRET}
      CORS_ORIGIN: http://localhost:5173
    healthcheck:
      test: ["CMD", "wget", "--quiet", "--tries=1", "--spider", "http://localhost:3000/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

  frontend:
    image: node:22-alpine
    working_dir: /app
    volumes:
      - ./Frontend/insighta-portal:/app
    ports:
      - "5173:5173"
    command: sh -c "npm install -g pnpm && pnpm install && pnpm run dev"
    environment:
      VITE_API_URL: http://localhost:3000
```

## Phase 2: Cloud Deployment

### Option A: Vercel (Recommended for Frontend)

Frontend deployment is already configured in `Frontend/insighta-portal/vercel.json`:

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy from project root
vercel --prod
```

### Option B: Docker Registry & Cloud Run (Backend)

#### Build & Push Image

```bash
# Build locally
docker build -t insighta-api:latest Backend/Api-integration/

# Tag for registry (e.g., Docker Hub, GCR, ACR)
docker tag insighta-api:latest YOUR_REGISTRY/insighta-api:latest

# Push
docker push YOUR_REGISTRY/insighta-api:latest
```

#### Deploy to Google Cloud Run

```bash
# Configure project
gcloud config set project YOUR_PROJECT_ID

# Deploy
gcloud run deploy insighta-api \
  --image YOUR_REGISTRY/insighta-api:latest \
  --port 3000 \
  --min-instances 1 \
  --max-instances 10 \
  --memory 512Mi \
  --cpu 1
```

For approved env-file based deployments, create an `env.yaml` file and pass it with `--env-vars-file`:

```yaml
GITHUB_CLIENT_ID: your_client_id
GITHUB_CLIENT_SECRET: your_client_secret
WEB_PORTAL_URL: https://portal.yourdomain.com
JWT_SECRET: your_strong_random_secret_min_32_chars
```

```bash
gcloud run deploy insighta-api \
  --image YOUR_REGISTRY/insighta-api:latest \
  --port 3000 \
  --env-vars-file env.yaml
```

For secrets, use Secret Manager and inject them at deploy time:

```bash
gcloud secrets create github-client-secret --data-file=- <<< "your_secret"
gcloud secrets create jwt-secret --data-file=- <<< "your_jwt_secret"

gcloud run deploy insighta-api \
  --image YOUR_REGISTRY/insighta-api:latest \
  --port 3000 \
  --update-secrets GITHUB_CLIENT_SECRET=github-client-secret:latest,JWT_SECRET=jwt-secret:latest
```

#### Deploy to Azure Container Instances

```bash
# Create resource group
az group create --name insighta-rg --location eastus

# Create Azure Container Registry
az acr create --resource-group insighta-rg \
  --name insightaregistry --sku Basic

# Build and push
az acr build --registry insightaregistry \
  --image insighta-api:latest ./Backend/Api-integration/

# Deploy
az container create --resource-group insighta-rg \
  --name insighta-api \
  --image insightaregistry.azurecr.io/insighta-api:latest \
  --cpu 1 --memory 0.5 \
  --secure-environment-variables GITHUB_CLIENT_ID=@Microsoft.KeyVault(SecretUri=https://your-vault.vault.azure.net/secrets/github-client-id/) \
  --ports 3000 \
  --registry-login-server insightaregistry.azurecr.io \
  --registry-username ${ACR_USERNAME} \
  --registry-password ${ACR_PASSWORD}
```

## Phase 3: Production Environment Setup

### Environment Variables

Create `.env.production` in `Backend/Api-integration/`:

```env
NODE_ENV=production
PORT=3000

# GitHub OAuth (register at https://github.com/settings/developers)
GITHUB_CLIENT_ID=your_production_client_id
GITHUB_CLIENT_SECRET=your_production_secret
GITHUB_REDIRECT_URI=https://api.yourdomain.com/api/auth/callback/github

# Frontend Portal
WEB_PORTAL_URL=https://portal.yourdomain.com

# JWT
JWT_SECRET=your_strong_random_secret_min_32_chars

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# CORS
CORS_ORIGIN=https://portal.yourdomain.com

# Logging
LOG_LEVEL=info
```

### Database Migration

Database state persists via SQLite file volume. For cloud deployments:

1. **Local SQLite** (current setup):
   - Suitable for teams <50 concurrent users
   - Mount `/app/data` volume for persistence

2. **Upgrade to PostgreSQL** (for scale):
   - Update `Backend/Api-integration/src/database/database.js` to use pg client
   - Run migrations on deployment

### SSL/TLS Certificates

Use a reverse proxy (Nginx/Caddy) or platform-native TLS:

```bash
# Example: LetsEncrypt via Certbot
certbot certonly --standalone -d api.yourdomain.com -d portal.yourdomain.com
```

## Phase 4: CI/CD Pipeline (GitHub Actions)

The included `.github/workflows/ci.yml` runs:

1. **Install & Test**
   - Backend: install dependencies, run tests
   - Frontend: install, lint, build
   - E2E: run Playwright tests

2. **Artifacts**
   - Frontend dist/ uploaded as artifact
   - Playwright report uploaded on failure

3. **Deploy** (requires manual workflow extension)

Add deployment job to `.github/workflows/ci.yml`:

```yaml
deploy:
  name: Deploy
  needs: [backend, frontend, e2e-tests]
  runs-on: ubuntu-latest
  if: github.ref == 'refs/heads/main' && github.event_name == 'push'
  env:
    GCP_PROJECT: ${{ secrets.GCP_PROJECT }}
  steps:
    - uses: actions/checkout@v4
    
    - name: Deploy frontend to Vercel
      env:
        VERCEL_TOKEN: ${{ secrets.VERCEL_TOKEN }}
      run: |
        cd Frontend/insighta-portal
        npm install -g vercel
        vercel --prod --token $VERCEL_TOKEN
    
    - name: Deploy backend to Cloud Run
      env:
        GCP_SA_KEY: ${{ secrets.GCP_SA_KEY }}
      run: |
        echo "$GCP_SA_KEY" | base64 -d > /tmp/key.json
        gcloud auth activate-service-account --key-file=/tmp/key.json
        gcloud run deploy insighta-api --image gcr.io/${GCP_PROJECT}/insighta-api:${GITHUB_SHA}
```

## Phase 5: Monitoring & Logging

### Application Logs

**Vercel Frontend**:
- Dashboard: https://vercel.com/dashboard
- Real-time logs: `vercel logs --follow`

**Cloud Run Backend**:
```bash
gcloud run services describe insighta-api
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=insighta-api" --limit 50
```

### Metrics

Set up monitoring dashboards for:
- API response times (target: <200ms p95)
- Error rates (target: <0.1%)
- OAuth flow completion (track redirects)
- Export endpoint throughput (monitor >5000 profile rejections)

## Phase 6: Security Hardening

### API Security

✅ Already implemented:
- HTTPS only (enforce in reverse proxy)
- CSRF protection (cookies + header validation)
- Rate limiting (100 req/15min per IP)
- HttpOnly cookie sessions
- Input sanitization via prepared statements

### Additional Measures

1. **API Key Management** (if supporting CLI):
   ```bash
   # Rotate keys quarterly
   # Store in secure vault (Azure KeyVault, AWS Secrets Manager)
   ```

2. **Image Scanning**:
   ```bash
   trivy image YOUR_REGISTRY/insighta-api:latest
   ```

3. **Dependency Audits**:
   ```bash
   pnpm audit
   npm audit --prod
   ```

## Rollback Procedure

### Backend (Container)

```bash
# List previous versions
gcloud run revisions list --service=insighta-api

# Route traffic back to previous revision
gcloud run services update-traffic insighta-api --to-revisions=REVISION_ID=100
```

### Frontend (Vercel)

- Dashboard: Deployments tab → Select previous → Click "Promote to Production"

## Support & Troubleshooting

### Backend Issues

```bash
# Check service status
gcloud run services describe insighta-api

# Tail logs
gcloud logging read "resource.type=cloud_run_revision" --follow

# Check health endpoint
curl https://api.yourdomain.com/api/health
```

### Frontend Issues

```bash
# Check Vercel build logs
vercel logs --follow

# Rebuild
vercel --prod --force
```

### Database Issues

```bash
# Backup SQLite
cp Backend/Api-integration/data/db.sqlite3 ./backup-$(date +%s).sqlite3

# Restore
cp ./backup-*.sqlite3 Backend/Api-integration/data/db.sqlite3
```

## Checklist

- [ ] Environment variables configured in production
- [ ] GitHub OAuth app registered with production callback URL
- [ ] SSL/TLS certificates installed
- [ ] Database backed up
- [ ] Monitoring/alerting configured
- [ ] Rate limiting tested
- [ ] CSRF protection validated in production
- [ ] OAuth flow tested end-to-end
- [ ] Export limit tested with large profile sets
- [ ] Rollback procedure documented and tested
- [ ] Team trained on deployment procedures
