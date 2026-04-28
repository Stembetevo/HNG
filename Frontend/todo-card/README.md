# Insighta Labs+ Portal

A React + Vite web portal for Insighta Labs+. It uses the backend GitHub OAuth flow, httpOnly cookies, CSRF-protected mutations, and the same profile APIs as the CLI.

## Features

- GitHub OAuth login through the backend
- Dashboard with live dataset metrics
- Profiles list with filtering, sorting, pagination, and CSV export
- Natural-language search page
- Profile detail page
- Account page with role and session information

## Environment

Create a local `.env` file from `.env.example`:

```bash
VITE_API_BASE_URL=http://localhost:3000
```

## Run Locally

```bash
pnpm install
pnpm dev
```

## Build

```bash
pnpm build
```

## Notes

- The portal expects the backend to be running and configured with `WEB_PORTAL_URL` pointing to this app.
- All mutating requests include the CSRF header automatically when the session is cookie-based.
