FROM node:20-alpine AS builder
WORKDIR /app

# Copy root package.json and lockfile
COPY package*.json ./

# Copy workspace directories
COPY backend/package.json ./backend/
COPY frontend/package.json ./frontend/
COPY shared/package.json ./shared/

# Install dependencies at the root
RUN npm ci

# Copy source code
COPY frontend ./frontend
COPY shared ./shared

# Enforce build order: shared first
RUN npm run build:shared

# CI/Docker must fail immediately if shared/dist is missing
RUN test -d shared/dist || (echo "shared/dist missing" && exit 1)

# Build frontend
RUN npm run build:frontend

FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV HOSTNAME="0.0.0.0"

# Copy root node_modules for hoisted dependencies
COPY --from=builder /app/node_modules ./node_modules

WORKDIR /app/frontend

COPY --from=builder /app/frontend/.next/standalone/frontend ./
COPY --from=builder /app/frontend/.next/static ./.next/static
COPY --from=builder /app/frontend/public ./public

# Ensure the shared package is available if needed by standalone
COPY --from=builder /app/shared /app/shared

EXPOSE 3000
CMD ["node", "server.js"]
