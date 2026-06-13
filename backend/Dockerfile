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
COPY backend ./backend
COPY shared ./shared

# Enforce build order: shared first
RUN npm run build:shared

# CI/Docker must fail immediately if shared/dist is missing
RUN test -d shared/dist || (echo "shared/dist missing" && exit 1)

# Build backend
RUN npm run build:backend

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# Need root node_modules for hoisted dependencies
COPY --from=builder /app/node_modules ./node_modules

# Copy shared dist and package.json
COPY --from=builder /app/shared/dist ./shared/dist
COPY --from=builder /app/shared/package.json ./shared/

# Copy backend dist and package.json
COPY --from=builder /app/backend/dist ./backend/dist
COPY --from=builder /app/backend/package.json ./backend/

EXPOSE 3001
CMD ["node", "backend/dist/main.js"]
