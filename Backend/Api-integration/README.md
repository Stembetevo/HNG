# API Integration Backend

## Runtime Requirements

- Node.js `>=22.5.0`

This project uses `node:sqlite` (`DatabaseSync`) for local SQLite persistence in `src/database/database.js`.
On older Node.js versions, startup will fail because `node:sqlite` is unavailable.

## Install and Run

```bash
pnpm install
pnpm run dev
```
