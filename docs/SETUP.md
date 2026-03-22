# Setup Guide

## Prerequisites

| Tool | Version | Install |
|---|---|---|
| Node.js | 20+ | [nodejs.org](https://nodejs.org) |
| pnpm | 9+ | `npm install -g pnpm` |
| Docker | 24+ | [docker.com](https://docker.com) |
| Docker Compose | 2+ | Included with Docker Desktop |

---

## Quick Start

### 1. Clone

```bash
git clone https://github.com/your-username/HenrardVisuals.git
cd HenrardVisuals
```

### 2. Generate keys & configure environment

```bash
node generate-keys.cjs   # prints JWT_SECRET, ANON_KEY, SERVICE_ROLE_KEY
cp .env.example .env
# Paste the generated values into .env
```

All required variables are documented in `.env.example`.

### 3. Start the full stack

```bash
docker compose -f docker-compose.dev.yml up -d
docker compose -f docker-compose.dev.yml logs -f app
```

### 4. Initialise the database

Open Supabase Studio at **http://localhost:8080**, navigate to the SQL editor, and paste the contents of `supabase/setup-complete.sql`.

Alternatively via psql:

```bash
docker compose -f docker-compose.dev.yml exec db \
  psql -U postgres -d henrard_db -f /dev/stdin < supabase/setup-complete.sql
```

### 5. Create the admin user

```bash
docker compose -f docker-compose.dev.yml exec db \
  psql -U postgres -d henrard_db \
  -v ADMIN_EMAIL='admin@example.com' \
  -v ADMIN_PASSWORD='your_secure_password' \
  -f /dev/stdin < supabase/create-admin-user.sql
```

Open **http://localhost:5173/admin** and sign in.

---

## Local Development (frontend only)

If the Supabase backend is already running (or you're using Supabase Cloud):

```bash
pnpm install
pnpm dev          # Vite dev server on http://localhost:5173
```

---

## Development Commands

```bash
pnpm dev           # Start Vite dev server
pnpm build         # Production build → dist/
pnpm preview       # Preview production build locally
pnpm type-check    # TypeScript type check (no emit)
pnpm lint          # ESLint
pnpm format        # Prettier
pnpm check         # type-check + lint combined
pnpm test          # Run unit tests (vitest)
pnpm test:watch    # Run tests in watch mode
```

---

## Tests

The test suite uses **Vitest** + **React Testing Library** + **jsdom**.

```bash
pnpm test          # Run all tests once
pnpm test:watch    # Watch mode (re-runs on file change)
```

### What is tested

| File | Coverage |
|---|---|
| `src/hooks/useAuth.test.ts` | Initial loading state, session resolution, `signIn`, `signOut`, error handling, cleanup |
| `src/components/Auth/Login.test.tsx` | Rendering, field validation, successful submit, error display, disabled states |

### Structure

```
src/
├── test/
│   └── setup.ts               # @testing-library/jest-dom matchers
├── hooks/
│   └── useAuth.test.ts
└── components/
    └── Auth/
        └── Login.test.tsx
```

Supabase is fully mocked via `vi.mock('@/lib/supabase')` — no network calls, no env vars required.

---

## Service URLs (dev stack)

| Service | URL |
|---|---|
| Frontend | http://localhost:5173 |
| Supabase API (Kong) | http://localhost:8000 |
| Supabase Studio (meta) | http://localhost:8080 |
| PostgreSQL | localhost:5432 |

---

## Docker Reference

```bash
# Start all services
docker compose -f docker-compose.dev.yml up -d

# Rebuild after code changes
docker compose -f docker-compose.dev.yml up -d --build app

# View logs
docker compose -f docker-compose.dev.yml logs -f

# Stop all services
docker compose -f docker-compose.dev.yml down

# Wipe data volumes (⚠ destructive)
docker compose -f docker-compose.dev.yml down -v
```

---

## Troubleshooting

**Port already in use**

```bash
lsof -i :5173
kill -9 <PID>
```

**Kong not healthy**

```bash
docker compose -f docker-compose.dev.yml logs kong
# Kong requires db + auth + rest + storage to start first
```

**Database connection refused**

```bash
docker compose -f docker-compose.dev.yml ps
docker compose -f docker-compose.dev.yml logs db
```

**TypeScript errors after pulling**

```bash
pnpm install
pnpm type-check
```

---

## VS Code Extensions

- **ESLint** — `dbaeumer.vscode-eslint`
- **Prettier** — `esbenp.prettier-vscode`
- **Tailwind CSS IntelliSense** — `bradlc.vscode-tailwindcss`
- **Docker** — `ms-azuretools.vscode-docker`
