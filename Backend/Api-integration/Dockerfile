FROM node:22-alpine

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install dependencies (production only)
RUN pnpm install --frozen-lockfile --prod

# Copy source
COPY src ./src

# Create data directory for SQLite
RUN mkdir -p data

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "fetch('http://localhost:3000/api/health').then((r) => { if (!r.ok) throw new Error(String(r.statusCode ?? r.status)); }).catch((error) => { console.error(error); process.exit(1); })"

# Start server
CMD ["pnpm", "start"]
