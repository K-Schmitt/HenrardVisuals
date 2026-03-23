# =========================================
# HenrardVisuals - Multi-stage Dockerfile
# =========================================

# ----------------------------------------
# Stage 1: Development
# ----------------------------------------
FROM node:20-alpine AS development

WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy package files and install deps as root, then hand off ownership
COPY --chown=node:node package.json pnpm-lock.yaml* ./
RUN pnpm install --frozen-lockfile

COPY --chown=node:node . .

# Drop to non-root user
USER node

EXPOSE 5173
CMD ["pnpm", "dev", "--host", "0.0.0.0"]

# ----------------------------------------
# Stage 2: Builder
# ----------------------------------------
FROM node:20-alpine AS builder

WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

COPY --chown=node:node package.json pnpm-lock.yaml* ./
RUN pnpm install --frozen-lockfile

COPY --chown=node:node . .

# Build arguments for Vite environment
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY

# Drop to non-root user before building
USER node

RUN pnpm build

# ----------------------------------------
# Stage 3: Production
# ----------------------------------------
# nginx master process binds port 80 (requires root), workers run as the
# built-in `nginx` user — this is the standard and secure nginx pattern.
FROM nginx:alpine AS production

# Copy built assets from builder
COPY --from=builder /app/dist /usr/share/nginx/html

# Inline nginx config: SPA routing, gzip, aggressive asset caching
RUN echo 'server { \
    listen 80; \
    listen [::]:80; \
    root /usr/share/nginx/html; \
    index index.html; \
    \
    gzip on; \
    gzip_vary on; \
    gzip_min_length 1024; \
    gzip_proxied any; \
    gzip_comp_level 6; \
    gzip_types text/plain text/css text/xml application/json application/javascript application/rss+xml application/atom+xml image/svg+xml; \
    \
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot|webp)$ { \
        expires 1y; \
        add_header Cache-Control "public, immutable"; \
        access_log off; \
    } \
    \
    location ~* \.html$ { \
        expires -1; \
        add_header Cache-Control "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0"; \
        add_header Pragma "no-cache"; \
    } \
    \
    location / { \
        try_files $uri $uri/ /index.html; \
        add_header Cache-Control "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0"; \
        add_header Pragma "no-cache"; \
    } \
}' > /etc/nginx/conf.d/default.conf

RUN rm -f /etc/nginx/nginx.conf.default

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
