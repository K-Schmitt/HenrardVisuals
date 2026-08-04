# Contributing

## Setup

    pnpm install
    cp .env.example .env      # fill in the values, or run node generate-keys.cjs
    docker compose -f docker-compose.dev.yml up -d
    pnpm dev

`AUTHENTICATOR_PASSWORD` must be set **before the first boot** — PostgREST
connects as that role, and `supabase/migrations/006_authenticator_password.sh`
only runs while the database initialises.

## Before opening a pull request

    pnpm check          # tsc --noEmit + eslint
    pnpm test           # unit tests
    pnpm test:coverage  # unit tests with the coverage thresholds enforced
    pnpm test:rls       # RLS policy tests (requires Docker)
    pnpm e2e            # Playwright
    pnpm audit:prod     # production advisories, with a reviewed allowlist

CI runs all of these, plus a production Docker build that asserts the six
security headers actually reach a response.

## Commit messages

Conventional Commits, imperative mood, 72 characters maximum:

    <type>(<scope>): <summary>

Types: feat, fix, refactor, perf, docs, test, chore, build, ci, style, revert.
A body is required for breaking changes, security fixes and data migrations.

## User-facing copy

Every string a visitor can read goes through `t()` from
`@/context/LanguageContext`, with a key in **both** `src/i18n/fr.ts` and
`src/i18n/en.ts`. `src/i18n/parity.test.ts` fails if the two drift apart or if
any value is empty.

Inside a hook or a `useCallback` that feeds a `useEffect`, read `t` through a
ref rather than listing it as a dependency: its identity changes on every
language switch, and a fetch callback that depends on it re-queries the
database each time the visitor toggles FR/EN.

## Database changes

Every schema change is a new numbered file in `supabase/migrations/`. Never
edit an applied migration. Add an assertion to `supabase/tests/rls_test.sql`
for anything that touches a policy, a grant or a `SECURITY DEFINER` function.

Migrations are mounted at `docker-entrypoint-initdb.d`, where the Postgres
entrypoint runs `.sql` files with `ON_ERROR_STOP`: one failing statement
aborts the whole initialisation and every later file is skipped. Guard
anything that depends on a service-owned table (`storage.objects`,
`storage.buckets`, `auth.users`) with `to_regclass`, and anything that depends
on a column another service adds with an `information_schema.columns` check.
