# =========================================
# HenrardVisuals - Multi-stage Dockerfile
# =========================================

# Pin pnpm to a specific version for reproducible builds.
ARG PNPM_VERSION=8.15.9

# ----------------------------------------
# Stage 1: Development
# ----------------------------------------
FROM node:20-alpine AS development

ARG PNPM_VERSION

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@${PNPM_VERSION} --activate

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .
# Transfer ownership of the entire working tree so the node user
# can run the dev server and write its cache files.
RUN chown -R node:node /app

USER node

EXPOSE 5173
CMD ["pnpm", "dev", "--host", "0.0.0.0"]

# ----------------------------------------
# Stage 2: Builder
# ----------------------------------------
FROM node:20-alpine AS builder

ARG PNPM_VERSION

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@${PNPM_VERSION} --activate

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .

# Build arguments for Vite environment
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY

# Build runs as root — the builder stage only produces /app/dist,
# which is copied into the nginx image. Non-root only matters for runtime.
RUN pnpm build

# ----------------------------------------
# Stage 3: Production
# ----------------------------------------
# nginx master process binds port 80 (requires root), workers run as the
# built-in `nginx` user — this is the standard and secure nginx pattern.
FROM nginx:alpine AS production

# Copy built assets from builder
COPY --from=builder /app/dist /usr/share/nginx/html

# Replace default nginx config with our SPA config + security headers
COPY nginx/default.conf /etc/nginx/conf.d/default.conf

RUN rm -f /etc/nginx/nginx.conf.default

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
