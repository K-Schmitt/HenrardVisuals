# HenrardVisuals

**Professional photography portfolio** built with React 18, TypeScript, Supabase, and Docker.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18.x-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![Supabase](https://img.shields.io/badge/Supabase-self--hosted-3ECF8E?logo=supabase&logoColor=white)](https://supabase.com/)
[![Docker](https://img.shields.io/badge/Docker-ready-2496ED?logo=docker&logoColor=white)](https://www.docker.com/)

**Live demo:** [henrardvisuals.com](https://henrardvisuals.com)

---

## Overview

HenrardVisuals is a full-stack photography portfolio designed for editorial and fashion photography. It features an elegant masonry gallery, a bilingual interface (FR/EN), and a complete admin panel for managing photos, categories, and site settings — all backed by a self-hosted Supabase instance.

---

## Features

- **Masonry gallery** with category filtering and a modal lightbox (keyboard-navigable)
- **Admin panel** — upload photos, manage categories, edit profile settings, change account credentials
- **Row-Level Security** — write operations restricted to admin role via JWT app_metadata
- **Bilingual UI** — French / English with `localStorage` persistence
- **Self-hosted Supabase** — full control over auth, database, and storage
- **Docker-ready** — single `docker compose up` for local development
- **Responsive** — mobile-first layout with a custom Tailwind design system

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, TypeScript, Vite 5 |
| Styling | Tailwind CSS (custom design system) |
| Routing | React Router DOM v6 |
| Backend | Supabase (self-hosted) — Auth, PostgreSQL, Storage |
| Proxy | Kong API Gateway |
| Container | Docker, Docker Compose |

---

## Getting Started

### Prerequisites

- [Docker](https://docs.docker.com/get-docker/) & Docker Compose
- [Node.js](https://nodejs.org/) 20+ (for local frontend dev)
- [pnpm](https://pnpm.io/) (`npm install -g pnpm`)

### 1. Clone & configure

```bash
git clone https://github.com/K-Schmitt/HenrardVisuals.git
cd HenrardVisuals

# Generate JWT keys and copy the example env file
node generate-keys.cjs
cp .env.example .env
# Fill in the values printed by generate-keys.cjs
```

### 2. Start the stack

```bash
# Start all services (Supabase, DB, Storage, Kong, Frontend)
docker compose up -d

# Watch logs
docker compose logs -f app
```

### 3. Initialize the database

Run the setup script in the Supabase SQL editor or via psql:

```bash
# Option A — Supabase Studio (http://localhost:8080 → SQL Editor)
# Paste the contents of supabase/setup-complete.sql and run

# Option B — psql
psql "$DATABASE_URL" -f supabase/setup-complete.sql
```

### 4. Create the admin user

```bash
psql "$DATABASE_URL" \
  -v ADMIN_EMAIL='admin@example.com' \
  -v ADMIN_PASSWORD='your_secure_password' \
  -f supabase/create-admin-user.sql
```

Open [http://localhost:5173](http://localhost:5173) — admin panel at `/admin`.

---

## Development

```bash
pnpm install        # Install dependencies
pnpm dev            # Start Vite dev server (http://localhost:5173)
pnpm type-check     # TypeScript check
pnpm lint           # ESLint
pnpm format         # Prettier
pnpm build          # Production build
```

---

## Project Structure

```
├── src/
│   ├── components/
│   │   ├── Admin/          # Panel admin (photos, categories, account, profile)
│   │   ├── Auth/           # Login form
│   │   ├── Layout/         # SiteLayout, Footer
│   │   ├── Navigation/     # BurgerMenu
│   │   ├── Upload/         # FileUpload with drag-and-drop
│   │   └── OptimizedImage  # Lazy-loaded image with Intersection Observer
│   ├── context/            # LanguageContext (FR/EN)
│   ├── hooks/              # useAuth
│   ├── lib/                # Supabase client + typed DB helpers
│   ├── pages/              # Home, Admin, Contact
│   └── types/              # TypeScript interfaces + Database type
├── supabase/
│   ├── migrations/         # Schema migrations (versioned SQL)
│   ├── setup-complete.sql  # Full setup script (tables, RLS, storage)
│   └── create-admin-user.sql  # Admin user seed (uses psql variables)
├── docs/
│   ├── ARCHITECTURE.md
│   ├── SETUP.md
│   └── DEPLOY.md
├── nginx/                  # Nginx config
├── volumes/                # Docker volume mounts (gitignored data)
├── docker-compose.yml      # Production
├── docker-compose.dev.yml  # Local development (self-hosted Supabase)
└── Dockerfile              # Multi-stage build
```

---

## Environment Variables

Copy `.env.example` to `.env` and fill in every value. Run `node generate-keys.cjs` to generate `JWT_SECRET`, `ANON_KEY`, and `SERVICE_ROLE_KEY`.

| Variable | Description |
|---|---|
| `POSTGRES_PASSWORD` | PostgreSQL password |
| `JWT_SECRET` | JWT signing secret (≥ 32 chars) |
| `ANON_KEY` | Supabase anon JWT (derived from JWT_SECRET) |
| `SERVICE_ROLE_KEY` | Supabase service-role JWT |
| `VITE_SUPABASE_URL` | Supabase API URL (Kong gateway) |
| `VITE_SUPABASE_ANON_KEY` | Same as `ANON_KEY` |
| `DISABLE_SIGNUP` | Set `true` in production |

---

## Security

- **RLS** — all write operations (photos, categories, site_settings, storage) are gated by `public.is_admin()`, which verifies `app_metadata.role = "admin"` in the JWT
- **Signup disabled** — set `DISABLE_SIGNUP=true` in production to prevent unauthorized account creation
- **No hardcoded secrets** — all credentials are injected via environment variables; no fallback defaults in Docker Compose

---

## Documentation

| Document | Description |
|---|---|
| [ARCHITECTURE.md](docs/ARCHITECTURE.md) | System architecture & data flow |
| [SETUP.md](docs/SETUP.md) | Developer setup guide & testing |
| [DEPLOY.md](docs/DEPLOY.md) | VPS / Coolify deployment guide |

---

## License

[MIT](LICENSE)
