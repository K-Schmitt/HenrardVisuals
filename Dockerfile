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

# Copy package files
COPY package.json pnpm-lock.yaml* ./

# Install dependencies
RUN pnpm install --frozen-lockfile || pnpm install

# Copy source code
COPY . .

# Expose dev server port
EXPOSE 5173

# Start development server
CMD ["pnpm", "dev", "--host", "0.0.0.0"]

# ----------------------------------------
# Stage 2: Builder
# ----------------------------------------
FROM node:20-alpine AS builder

WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy package files
COPY package.json pnpm-lock.yaml* ./

# Install dependencies
RUN pnpm install --frozen-lockfile || pnpm install

# Copy source code
COPY . .

# Build arguments for environment
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY

# Build production bundle
RUN pnpm build

# ----------------------------------------
# Stage 3: Production
# ----------------------------------------
FROM nginx:alpine AS production

# Copy built assets from builder
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy custom nginx configuration for SPA
RUN echo 'server { \
    listen 80; \
    listen [::]:80; \
    root /usr/share/nginx/html; \
    index index.html; \
    \
    # Gzip compression \
    gzip on; \
    gzip_vary on; \
    gzip_min_length 1024; \
    gzip_proxied any; \
    gzip_comp_level 6; \
    gzip_types text/plain text/css text/xml application/json application/javascript application/rss+xml application/atom+xml image/svg+xml; \
    \
    # Cache static assets aggressively \
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot|webp)$ { \
        expires 1y; \
        add_header Cache-Control "public, immutable"; \
        access_log off; \
    } \
    \
    # HTML files - no cache to ensure fresh content \
    location ~* \.html$ { \
        expires -1; \
        add_header Cache-Control "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0"; \
        add_header Pragma "no-cache"; \
    } \
    \
    # SPA fallback - serve index.html for client-side routing \
    location / { \
        try_files $uri $uri/ /index.html; \
        # No cache for index.html fallback \
        add_header Cache-Control "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0"; \
        add_header Pragma "no-cache"; \
    } \
}' > /etc/nginx/conf.d/default.conf

# Remove default nginx config
RUN rm -f /etc/nginx/nginx.conf.default

# Expose ports
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost/ || exit 1

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
