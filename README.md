# Insighta Labs+ API & Portal

A full-stack web application for profile management with GitHub OAuth authentication, CSV export capabilities, and CSRF-protected endpoints. Built with Node.js/Express (backend) and React 19/Vite (frontend).

## Quick Start

### Prerequisites

- Node.js 22+
- pnpm (install via `npm install -g pnpm` or use Corepack)
- Docker & Docker Compose (optional, for containerized deployment)

### Setup

```bash
# 1. Clone repository
git clone https://github.com/your-org/insighta-labs.git
cd insighta-labs

# 2. Install dependencies
cd Backend/Api-integration && pnpm install
cd ../../Frontend/insighta-portal && pnpm install
cd ../..

# 3. Create environment files
cp Backend/Api-integration/.env.example Backend/Api-integration/.env
# Edit .env with your GitHub OAuth credentials

# 4. Start backend (Terminal 1)
cd Backend/Api-integration
pnpm run dev

# 5. Start frontend (Terminal 2)
cd Frontend/insighta-portal
pnpm run dev

# Visit http://localhost:5173
```

### Docker Compose

```bash
docker-compose up --build
```

Backend runs on `http://localhost:3000`, frontend on `http://localhost:5173`.

## Features

✅ **GitHub OAuth Login**
- Browser-based web flow with HttpOnly cookie sessions
- CLI flow support with PKCE (planned)

✅ **Profile Management**
- Search profiles by name/field
- View profile details
- Export profiles to CSV (limited to 5000 per export)

✅ **Security**
- CSRF protection (cookie + header validation)
- Rate limiting (100 req/15 min per IP)
- Input sanitization via prepared statements
- HttpOnly session cookies

✅ **Testing**
- Playwright E2E tests
- GitHub Actions CI/CD
- Automated deployment

## Project Structure

```
.
├── Backend/Api-integration/          # Node.js/Express API
│   ├── src/
│   │   ├── controllers/              # Request handlers
│   │   ├── services/                 # Business logic
│   │   ├── repositories/             # Data access
│   │   ├── middleware/               # Auth, CSRF, logging, rate limits
│   │   ├── routes/                   # API endpoints
│   │   ├── database/                 # SQLite setup
│   │   └── utils/                    # Helpers
│   ├── Dockerfile
│   ├── package.json
│   └── .env.example
├── Frontend/insighta-portal/         # React 19 + Vite UI
│   ├── src/
│   │   ├── App.jsx                   # Main portal (login, dashboard, profiles)
│   │   ├── lib/api.js                # API client
│   │   └── components/               # React components
│   ├── vite.config.js
│   ├── package.json
│   └── .env.example
├── tests/e2e/                        # Playwright E2E tests
├── .github/workflows/ci.yml          # GitHub Actions CI
├── playwright.config.js
├── docker-compose.yml
├── TESTING.md                        # Testing guide
├── DEPLOYMENT.md                     # Deployment guide
└── README.md                         # This file
```

## Development

### Backend

```bash
cd Backend/Api-integration

# Start dev server (auto-reload with nodemon)
pnpm run dev

# Run tests
pnpm test

# Production build
pnpm run start
```

**Key Endpoints:**
- `POST /api/auth/github` — Initiate GitHub OAuth
- `GET /api/auth/callback/github` — OAuth callback
- `GET /api/auth/me` — Get current user
- `POST /api/auth/logout` — Logout
- `GET /api/profiles` — List profiles (auth required)
- `GET /api/profiles/search?q=name` — Search profiles
- `GET /api/profiles/export` — Export to CSV
- `GET /api/profiles/:id` — Get profile details

### Frontend

```bash
cd Frontend/insighta-portal

# Start dev server (Vite, port 5173)
pnpm run dev

# Build for production
pnpm run build

# Preview production build
pnpm run preview

# Lint
pnpm run lint
```

## Testing

### Run E2E Tests Locally

```bash
# From project root

# First-time setup: install Playwright browsers
npx playwright install --with-deps chromium

# Run all tests
pnpm run test:e2e

# Run in UI mode (interactive)
pnpm run test:e2e:ui

# Run with debugger
pnpm run test:e2e:debug
```

**Test Coverage:**
- Export limits (>5000 profiles returns 413)
- CSRF protection on mutations
- OAuth flow initiation
- Authentication endpoints

See [TESTING.md](./TESTING.md) for detailed testing guide.

## Deployment

### Quick Deploy to Vercel (Frontend) + Cloud Run (Backend)

1. **Frontend (Vercel)**
   ```bash
   cd Frontend/insighta-portal
   npm install -g vercel
   vercel --prod
   ```

2. **Backend (Google Cloud Run)**
   ```bash
   gcloud run deploy insighta-api \
     --source Backend/Api-integration/ \
     --set-env-vars GITHUB_CLIENT_ID=X,GITHUB_CLIENT_SECRET=Y,JWT_SECRET=Z
   ```

See [DEPLOYMENT.md](./DEPLOYMENT.md) for comprehensive deployment guide covering:
- Docker containerization
- Cloud Run, Azure, AWS options
- Environment setup
- CI/CD pipeline configuration
- Monitoring & rollback procedures

## Environment Variables

### Backend (`Backend/Api-integration/.env`)

```env
NODE_ENV=development
PORT=3000

# GitHub OAuth (register at https://github.com/settings/developers)
GITHUB_CLIENT_ID=your_client_id
GITHUB_CLIENT_SECRET=your_secret
GITHUB_REDIRECT_URI=http://localhost:3000/api/auth/callback/github

# Frontend portal URL
WEB_PORTAL_URL=http://localhost:5173

# JWT signing secret (min 32 characters)
JWT_SECRET=your_secret_key_here_min_32_chars

# CORS
CORS_ORIGIN=http://localhost:5173

# Rate limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

### Frontend (`Frontend/insighta-portal/.env`)

```env
VITE_API_URL=http://localhost:3000
```

## Security

### Implemented Controls

- **Authentication**: GitHub OAuth 2.0 with JWT tokens
- **Session Management**: HttpOnly, SameSite cookies
- **CSRF Protection**: Token validation for state-changing requests
- **Rate Limiting**: 100 requests per 15 minutes per IP
- **Input Validation**: Prepared statements, input sanitization
- **Export Limits**: Maximum 5000 profiles per export
- **Logging**: Anonymized IP addresses and user IDs
- **Middleware**: Error handling, CORS, request logging

### GitHub OAuth Setup

1. Go to https://github.com/settings/developers
2. Create new OAuth App:
   - Application name: Insighta Labs+
   - Homepage URL: `http://localhost:3000`
   - Authorization callback URL: `http://localhost:3000/api/auth/callback/github`
3. Copy Client ID and Client Secret to `.env`

## API Documentation

### Authentication

**Initialize Web Login**
```bash
GET /api/auth/github?mode=web
```
Redirects to GitHub OAuth. Upon success, sets HttpOnly cookie and redirects to WEB_PORTAL_URL.

**Get Current User**
```bash
GET /api/auth/me
Authorization: Bearer {token}
```

**Logout**
```bash
POST /api/auth/logout
Authorization: Bearer {token}
```

### Profiles

**List Profiles**
```bash
GET /api/profiles
Authorization: Bearer {token}
```

**Search Profiles**
```bash
GET /api/profiles/search?q=john&field=name
Authorization: Bearer {token}
```

**Get Profile**
```bash
GET /api/profiles/:id
Authorization: Bearer {token}
```

**Export Profiles**
```bash
GET /api/profiles/export
Authorization: Bearer {token}
```
Returns CSV. Returns 413 if >5000 profiles match filters.

## GitHub Actions CI/CD

Workflow: `.github/workflows/ci.yml`

Jobs:
- **Backend**: Install dependencies, run tests
- **Frontend**: Install, lint, build
- **E2E Tests**: Playwright tests (runs after backend/frontend pass)

Automatically triggers on push to `main`/`master` and all pull requests.

View workflow runs: https://github.com/your-org/insighta-labs/actions

## Troubleshooting

### Backend won't start

```bash
# Check env vars
grep -E '^GITHUB_CLIENT_(ID|SECRET)=' Backend/Api-integration/.env

node --input-type=module -e "import dotenv from 'dotenv'; dotenv.config({ path: 'Backend/Api-integration/.env' }); const hasClientId = Boolean(process.env.GITHUB_CLIENT_ID); const hasClientSecret = Boolean(process.env.GITHUB_CLIENT_SECRET); console.log(JSON.stringify({ GITHUB_CLIENT_ID: hasClientId, GITHUB_CLIENT_SECRET: hasClientSecret })); if (!hasClientId || !hasClientSecret) process.exit(1);"

# Verify GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET are set

# Check port 3000 is available
lsof -i :3000
```

### Frontend build fails

```bash
# Clear cache
rm -rf Frontend/insighta-portal/node_modules Frontend/insighta-portal/.vite

# Reinstall
cd Frontend/insighta-portal
pnpm install

# Rebuild
pnpm run build
```

### Tests fail

```bash
# Ensure backend is running
cd Backend/Api-integration && pnpm run start

# Run tests with debug info
pnpm run test:e2e:ui
```

## Contributing

1. Create feature branch: `git checkout -b feature/my-feature`
2. Make changes and commit: `git commit -am 'Add feature'`
3. Push to branch: `git push origin feature/my-feature`
4. Open Pull Request

All PRs trigger CI pipeline (lint, build, E2E tests).

## License

MIT — See LICENSE file

## Support

For issues and feature requests: https://github.com/your-org/insighta-labs/issues

---

**Made with ❤️ by the Insighta Labs+ team**
