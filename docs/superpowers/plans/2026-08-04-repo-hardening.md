# HenrardVisuals Hardening & Performance Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn HenrardVisuals into a repository that survives a senior-engineer code review in an interview: close an anonymous-to-content-admin privilege chain, stop serving 50 MB originals to the gallery, and put the whole thing behind CI.

**Architecture:** Five independently mergeable phases. Phase 0 rotates credentials (everything else assumes secrets are secret). Phase 1 collapses three divergent SQL schema sources into one ordered migration set and adds RLS regression tests. Phase 2 attacks the load-time problem at its root — full-resolution originals and defeated lazy loading. Phase 3 fixes edge configuration (nginx headers that are currently never sent, Compose defaults). Phases 4–5 cover accessibility, SEO and CI.

**Tech Stack:** React 18.2, TypeScript 5.3 (strict), Vite 5, Tailwind 3.4, Supabase self-hosted (Postgres 15 / GoTrue / PostgREST / Storage + imgproxy / Kong 2.8), nginx:alpine, Docker, pnpm 8.15.9, Vitest 2, Playwright 1.58.

## Global Constraints

- Node 20, pnpm 8.15.9 (pinned in `Dockerfile:6`). Do not switch package managers.
- TypeScript `strict: true`, `noUnusedLocals`, `noUnusedParameters` — all already on, keep them on.
- `pnpm check && pnpm test` must pass before every single commit in this plan.
- Commit format: Conventional Commits (`<type>(<scope>): <imperative summary>`), ≤72 chars, no trailing period.
- **Never** add `Co-Authored-By`, `Generated with Claude Code`, or any AI attribution to any commit, PR, issue or file.
- Every user-facing string goes through `t()` from `@/context/LanguageContext`. No new hardcoded FR or EN copy.
- `any` is permitted only at the single existing cast site `src/lib/supabase.ts:31`. Nowhere else.
- No new runtime dependencies except those a task names explicitly.
- Decisions already made by the repository owner, do not revisit:
  - Draft photos are protected by **unguessable paths**, not a private bucket. The `photos` bucket stays `public = true`.
  - Git history is **kept intact**. Rotate credentials; do not rewrite or force-push.
  - Image transforms get an **env flag plus runtime fallback**, because availability on the production Coolify Supabase is unconfirmed.

---

## File Structure

**Created**

| Path | Responsibility |
|---|---|
| `SECURITY.md` | Disclosure policy + the credential rotation runbook from Task 1 |
| `supabase/migrations/000_bootstrap.sql` | Extensions, `auth`/`storage` schemas, `anon`/`authenticated`/`service_role` roles. Everything the Supabase service images assume already exists |
| `supabase/migrations/005_rls_hardening.sql` | Drops orphaned permissive policies, fixes `is_admin()`, locks `set_hero_photo()`, re-grants least privilege, adds the gallery index |
| `supabase/tests/fixtures/00_stubs.sql` | Minimal `auth.jwt()` / `storage.objects` stubs so migrations run in a bare Postgres container |
| `supabase/tests/rls_test.sql` | Assertions: anon cannot write, non-admin authenticated cannot write, admin can |
| `supabase/tests/run-rls-tests.sh` | Spins a disposable Postgres, applies every migration in order, runs the assertions |
| `src/lib/imageUrl.ts` | The single place that decides between a transform URL and the original |
| `src/lib/imageUrl.test.ts` | Unit tests for the above |
| `src/components/ErrorBoundary.tsx` | Catches render errors instead of showing a blank black page |
| `src/hooks/useDocumentMeta.ts` | Per-route `<title>`, description, canonical, `documentElement.lang` |
| `public/robots.txt`, `public/sitemap.xml` | Crawlability |
| `public/fonts/*.woff2` | Self-hosted Inter + Playfair Display |
| `nginx/security-headers.conf` | The five headers, `include`d into every `location` block |
| `.github/workflows/ci.yml` | typecheck, lint, unit tests + coverage, build, `pnpm audit`, RLS tests |
| `.github/workflows/codeql.yml`, `.github/dependabot.yml` | Supply-chain scanning |
| `CONTRIBUTING.md` | Commit convention, local setup, test commands |

**Modified (with the reason)**

| Path | Why |
|---|---|
| `.dockerignore` | Currently one line — `.env` and every uploaded photo enter the build context |
| `generate-keys.cjs:77` | Prints `DISABLE_SIGNUP=false`, contradicting `.env.example:51` |
| `docker-compose.yml`, `docker-compose.dev.yml` | `PGRST_DB_SCHEMAS`, GoTrue defaults, init mount, dev port bindings |
| `volumes/kong/kong.yml` | CORS `*` + credentials; no auth rate limit |
| `nginx/default.conf` | `add_header` inheritance destroys every security header |
| `vite.config.ts` | `manualChunks` object form produces a 30-byte vendor chunk |
| `index.html` | Two Google Fonts requests, wrong title/og:image, no canonical |
| `src/index.css:5` | Second, chained Google Fonts `@import` |
| `src/components/OptimizedImage.tsx` | Zero-height containers defeat lazy loading |
| `src/components/PhotoGallery.tsx`, `HeroSection.tsx`, `PhotoLightbox.tsx`, `Admin/PhotoCard.tsx` | Four call sites of `getStorageUrl` that must become transform-aware |
| `src/hooks/useFileUpload.ts` | `Date.now()` paths are enumerable; MIME regex is unanchored; no dimension capture |
| `src/hooks/useHomeData.ts` | No race guard, `error` never reset, `select('*')` |
| `src/hooks/useAdminPhotos.ts` | Orphans storage objects on delete; N+1 inserts; sequential hero toggle |
| `src/context/AuthContext.tsx` | No `isAdmin`; unmemoized provider value |
| `src/pages/Admin.tsx` | Gates on `isAuthenticated` only |
| `e2e/rls.spec.ts` | Asserts a `/login` route that does not exist |
| `volumes/db/init/init.sql` | **Deleted** — third divergent schema source, missing `is_hero` |

---

## Phase Ordering (read before starting)

Phases are independently mergeable **except** these two hard edges:

1. **Task 1 before everything.** Every later task assumes the leaked credentials are dead.
2. **Task 8 (self-hosted fonts) before Task 10 (CSP).** The CSP in `nginx/default.conf:30` declares `style-src 'self'` and `font-src 'self' data:`. It is inert today because of the `add_header` bug. The moment Task 10 makes headers actually apply, that CSP blocks Google Fonts and the site loses its typography. Self-host first.

Everything else can be reordered or parallelised across worktrees.

---

# PHASE 0 — CREDENTIALS

### Task 1: Lock the build context and rotate every leaked credential

`git show f59755c -- supabase/create-admin-user.sql` prints `crypt('Admin123!', gen_salt('bf'))` alongside `admin@henrardvisuals.com`, and a trailing comment restating both in plaintext. `git log -S "super-secret-jwt-token"` confirms the public Supabase demo `JWT_SECRET` and `POSTGRES_PASSWORD=henrard_secret_123` shipped in `1556e511` and were removed only in `f59755c`. The remote `git@github.com:K-Schmitt/HenrardVisuals.git` is reachable. History stays; the values must die.

Separately, `.dockerignore` is a single line (`volumes/db/data`, no trailing newline). `Dockerfile:22` and `:46` both `COPY . .`, and `docker-compose.dev.yml:16` ships the `development` target — so a local `.env` holding `JWT_SECRET`, `SERVICE_ROLE_KEY` and `POSTGRES_PASSWORD` is baked into that image at `/app/.env`, and `volumes/storage/` (every uploaded photo, drafts included) sits in the builder layer and the build cache.

**Files:**
- Create: `.dockerignore` (overwrite the existing one-liner)
- Create: `SECURITY.md`
- Modify: `generate-keys.cjs:77`

**Interfaces:**
- Consumes: nothing.
- Produces: a rotated `.env` on the production host. No code symbols.

- [ ] **Step 1: Measure the current build context so the improvement is provable**

```bash
docker build --no-cache --target builder -t henrard-ctx-before . 2>&1 | grep -i "transferring context"
```

Record the number. Expect tens of MB (it includes `node_modules`, `.git` and `volumes/storage`).

- [ ] **Step 2: Write the real `.dockerignore`**

```
# Build context exclusions — anything here never reaches the Docker daemon.
.git
.github
.gitignore
.dockerignore

# Secrets
.env
.env.*
!.env.example
*.pem
*.key

# Dependencies & build output
node_modules
dist
build
.vite
.pnpm-store

# Runtime data — uploaded photos and the Postgres data directory
volumes

# Not needed to build the SPA
docs
e2e
supabase
nginx/nginx.conf
playwright.config.ts
.claude
*.log
coverage
README.md
LICENSE
Caddyfile
docker-compose*.yml
```

- [ ] **Step 3: Verify the context shrank and the build still succeeds**

```bash
docker build --no-cache --target builder -t henrard-ctx-after \
  --build-arg VITE_SUPABASE_URL=http://localhost:8000 \
  --build-arg VITE_SUPABASE_ANON_KEY=dummy . 2>&1 | grep -iE "transferring context|ERROR"
```

Expected: context is a small fraction of Step 1's number, and the build reaches `pnpm build` without error. `nginx/default.conf` is still required by the production stage, so do **not** exclude `nginx/` wholesale — only `nginx/nginx.conf`.

- [ ] **Step 4: Confirm no `.env` is inside the development image**

```bash
docker build --no-cache --target development -t henrard-dev-check . >/dev/null
docker run --rm henrard-dev-check ls -la /app/.env 2>&1
```

Expected: `ls: /app/.env: No such file or directory`.

- [ ] **Step 5: Stop the key generator from recommending open signup**

`generate-keys.cjs:77` currently prints `DISABLE_SIGNUP=false`, which is what an operator pastes into Coolify. Change it:

```js
console.log(`DISABLE_SIGNUP=true`);
```

- [ ] **Step 6: Write `SECURITY.md` with the rotation runbook**

```markdown
# Security Policy

## Reporting a vulnerability

Email henrard.ethan@gmail.com. Please do not open a public issue for an
unpatched vulnerability. Expect an acknowledgement within 72 hours.

## Credential rotation

Every value below is derived from `JWT_SECRET`. Rotating it invalidates
`ANON_KEY` and `SERVICE_ROLE_KEY`, so all four are rotated together and the
frontend must be rebuilt (`VITE_SUPABASE_ANON_KEY` is baked in at build time).

1. Generate a new set:

       node generate-keys.cjs

2. Update `POSTGRES_PASSWORD`, `JWT_SECRET`, `ANON_KEY`, `SERVICE_ROLE_KEY`,
   `VITE_SUPABASE_ANON_KEY` in the Coolify environment (and in `.env` on any
   self-hosted deployment).

3. Change the Postgres password to match, in the same transaction window:

       ALTER ROLE postgres WITH PASSWORD '<new POSTGRES_PASSWORD>';

4. Rotate the admin account password through GoTrue, not raw SQL:

       curl -X POST "$API_EXTERNAL_URL/auth/v1/admin/users/<user-id>" \
         -H "apikey: $SERVICE_ROLE_KEY" \
         -H "Authorization: Bearer $SERVICE_ROLE_KEY" \
         -H "Content-Type: application/json" \
         -d '{"password":"<new password>"}'

5. Redeploy so the new `VITE_SUPABASE_ANON_KEY` is compiled into the bundle.

6. Confirm the old anon key is rejected:

       curl -s -o /dev/null -w '%{http_code}\n' \
         "$API_EXTERNAL_URL/rest/v1/photos?select=id&limit=1" \
         -H "apikey: <old ANON_KEY>"

   Expected: `401`.

## Known historical exposure

Commits `1556e511` through `f59755c` contained the public Supabase demo
`JWT_SECRET`, a default `POSTGRES_PASSWORD`, and a seed admin password. All of
these values were rotated on 2026-08-04 and are dead. History is retained
deliberately; the commits are part of the project's development record and the
secrets they contain no longer authenticate anything.
```

Replace the rotation date with the real one when the rotation is performed.

- [ ] **Step 7: Perform the rotation (operator action, not code)**

Follow `SECURITY.md` steps 1–6 against production. This is the one step in this plan that touches a live system. Do not proceed to Phase 1 until step 6 returns `401`.

- [ ] **Step 8: Commit**

```bash
git add .dockerignore SECURITY.md generate-keys.cjs
git commit -m "fix(security): exclude secrets and data from build context"
```

---

# PHASE 1 — DATABASE

### Task 2: Collapse three divergent schema sources into one migration set

There are currently three files that each claim to define the schema, and they disagree:

| Source | Applied by | `is_hero` column | FK on `category` | `profile_settings` seed |
|---|---|---|---|---|
| `volumes/db/init/init.sql` | Postgres entrypoint, `docker-compose.yml:38` | **absent** | absent | absent |
| `supabase/migrations/001..004` | `supabase db push` / manual | present | present (004) | present (001) |
| `supabase/setup-complete.sql` | Copy-paste into the SQL editor | present | absent | present |

`src/hooks/useHomeData.ts:38` queries `.eq('is_hero', true)`. On the Compose path that column does not exist, so the hero query fails — the local development stack has been building a schema the application cannot run against. Consolidating is a correctness fix, not just tidiness, and it is the precondition for Task 3's tests being meaningful.

**Files:**
- Create: `supabase/migrations/000_bootstrap.sql`
- Delete: `volumes/db/init/init.sql`
- Delete: `supabase/setup-complete.sql`
- Modify: `docker-compose.yml:38`, `docker-compose.dev.yml:49`
- Modify: `README.md` (the "Initialize the database" section), `docs/SETUP.md`, `docs/DEPLOY.md`

**Interfaces:**
- Consumes: nothing.
- Produces: `supabase/migrations/*.sql` becomes the single ordered source of truth. Task 3 adds `005_rls_hardening.sql` to this set. Task 17 runs the whole set in CI.

- [ ] **Step 1: Create `supabase/migrations/000_bootstrap.sql`**

This is `volumes/db/init/init.sql` lines 6–49 — everything the Supabase service images assume pre-exists — and nothing else. Table definitions live in `001`.

```sql
-- =========================================
-- HenrardVisuals — Bootstrap
-- Extensions, service schemas and Supabase roles.
-- Must run before 001. The Supabase service images (GoTrue, PostgREST,
-- Storage) assume these already exist.
-- =========================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE SCHEMA IF NOT EXISTS auth;
CREATE SCHEMA IF NOT EXISTS storage;

GRANT USAGE ON SCHEMA auth TO postgres;
GRANT ALL ON ALL TABLES IN SCHEMA auth TO postgres;
GRANT ALL ON ALL SEQUENCES IN SCHEMA auth TO postgres;

GRANT USAGE ON SCHEMA storage TO postgres;
GRANT ALL ON ALL TABLES IN SCHEMA storage TO postgres;
GRANT ALL ON ALL SEQUENCES IN SCHEMA storage TO postgres;
GRANT ALL ON ALL ROUTINES IN SCHEMA storage TO postgres;

DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'anon') THEN
    CREATE ROLE anon NOLOGIN NOINHERIT;
  END IF;
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'authenticated') THEN
    CREATE ROLE authenticated NOLOGIN NOINHERIT;
  END IF;
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'service_role') THEN
    CREATE ROLE service_role NOLOGIN NOINHERIT BYPASSRLS;
  END IF;
END
$$;

GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
```

Note what is deliberately **not** carried over from `init.sql`: the table definitions (duplicated in `001`), the `GRANT ALL ... TO authenticated` block at `init.sql:158-160` (Task 3 replaces it with least privilege), and the four permissive RLS policies at `init.sql:81,85,110,114,133,137` (Task 3 drops them; recreating them here would be pointless).

- [ ] **Step 2: Delete the two redundant sources**

```bash
git rm volumes/db/init/init.sql supabase/setup-complete.sql
```

`supabase/setup-complete.sql` also carried a *second, different* `is_admin()` definition (`LANGUAGE sql STABLE` with `COALESCE`, at `:116-126`) than `003_rls_admin_only.sql:19-24` (`LANGUAGE plpgsql`, no `COALESCE`). Task 3 settles on one. Removing this file removes the ambiguity.

- [ ] **Step 3: Point the Compose init mount at the migrations directory**

Postgres's entrypoint runs `/docker-entrypoint-initdb.d/*.sql` in lexical order, which is exactly `000_` → `005_`.

In `docker-compose.yml`, replace line 38:

```yaml
      - ./supabase/migrations:/docker-entrypoint-initdb.d:ro
```

Apply the identical change to `docker-compose.dev.yml:49`.

- [ ] **Step 4: Verify a clean stack builds the right schema**

```bash
docker compose -f docker-compose.dev.yml down -v
docker compose -f docker-compose.dev.yml up -d db
until docker compose -f docker-compose.dev.yml exec -T db pg_isready -U postgres >/dev/null 2>&1; do sleep 1; done
docker compose -f docker-compose.dev.yml exec -T db \
  psql -U postgres -d henrard_db -c "\d public.photos" | grep -E "is_hero|storage_path"
```

Expected: both `is_hero` and `storage_path` appear. Before this task, `is_hero` was missing.

- [ ] **Step 5: Update the three docs that referenced the deleted file**

`README.md` step 3 ("Initialize the database"), `docs/SETUP.md` and `docs/DEPLOY.md` step 4 all tell the reader to paste `supabase/setup-complete.sql`. Replace those instructions with:

```bash
# The Compose stack applies supabase/migrations/*.sql automatically on first boot.
# Against an existing/managed Supabase, apply them in order:
for f in supabase/migrations/*.sql; do
  psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$f"
done
```

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations/000_bootstrap.sql docker-compose.yml docker-compose.dev.yml \
        README.md docs/SETUP.md docs/DEPLOY.md
git rm --cached volumes/db/init/init.sql supabase/setup-complete.sql 2>/dev/null || true
git commit -m "refactor(db): make supabase/migrations the only schema source"
```

---

### Task 3: Close the anonymous-to-content-admin chain

Four defects compound into one exploit chain:

1. `docker-compose.yml:88` — `GOTRUE_DISABLE_SIGNUP: ${DISABLE_SIGNUP}` has no `:-` default, so an unset variable becomes an empty string and GoTrue reads it as false. With `GOTRUE_MAILER_AUTOCONFIRM` defaulting to `true` (`:95`) and `SMTP_HOST` empty (`:97`), `POST /auth/v1/signup` returns an immediately usable `authenticated` JWT.
2. The permissive policies from the old `init.sql` (`FOR ALL TO authenticated USING (true)`) were named in English; `003_rls_admin_only.sql:30,43,56` drops only the French-named ones. RLS policies are OR'd, so the admin-only policies added by `003` never restricted anything on that path. Task 2 deleted the file, but any database already initialised from it still carries the policies — they must be dropped explicitly.
3. `004_db_integrity.sql:28-34` — `set_hero_photo()` is `SECURITY DEFINER` with no authorization check and no `REVOKE`, so `EXECUTE TO PUBLIC` applies and PostgREST exposes it as an RPC. Its first statement, `UPDATE public.photos SET is_hero = FALSE WHERE is_hero = TRUE`, is an unauthenticated global write: a bare `curl` wipes the homepage hero, repeatably.
4. `003_rls_admin_only.sql:19-24` — `is_admin()` has no `COALESCE`, so a JWT without `app_metadata.role` yields `NULL`, not `false`. RLS coerces `NULL` to false so policies hold, but any `IF NOT public.is_admin() THEN RAISE` guard silently no-ops, because `NOT NULL` is `NULL`. It also lacks `SET search_path` (Supabase lint 0011) and is `plpgsql` rather than `sql STABLE`, so it re-parses the JWT once per row.

This task fixes 2–4 in SQL and adds the regression tests. Item 1 is Compose configuration and belongs to Task 11.

**Files:**
- Create: `supabase/migrations/005_rls_hardening.sql`
- Create: `supabase/tests/fixtures/00_stubs.sql`
- Create: `supabase/tests/rls_test.sql`
- Create: `supabase/tests/run-rls-tests.sh`
- Modify: `package.json` (add the `test:rls` script)

**Interfaces:**
- Consumes: `supabase/migrations/000_bootstrap.sql` from Task 2.
- Produces:
  - `public.is_admin() RETURNS boolean` — `LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''`. Returns `false`, never `NULL`. Task 4 mirrors this predicate client-side.
  - `public.set_hero_photo(target_id uuid) RETURNS void` — raises `insufficient_privilege` for non-admins. Task 9 calls it from `useAdminPhotos.toggleHero`.
  - `pnpm test:rls` — Task 17 wires this into CI.

- [ ] **Step 1: Write the test fixtures**

The migrations reference `auth.jwt()` and `storage.objects`, which real Supabase images provide. To run them in a bare `postgres:15-alpine`, stub exactly those. `auth.jwt()` reads a GUC so a test can impersonate any claim set.

Create `supabase/tests/fixtures/00_stubs.sql`:

```sql
-- Minimal stand-ins for the objects the Supabase service images create.
-- Test-only. Never applied to a real database.

CREATE SCHEMA IF NOT EXISTS auth;
CREATE SCHEMA IF NOT EXISTS storage;

-- Reads request.jwt.claims exactly as GoTrue/PostgREST set it.
CREATE OR REPLACE FUNCTION auth.jwt()
RETURNS jsonb
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(
    NULLIF(current_setting('request.jwt.claims', true), '')::jsonb,
    '{}'::jsonb
  );
$$;

CREATE TABLE IF NOT EXISTS storage.buckets (
  id                 text PRIMARY KEY,
  name               text NOT NULL,
  public             boolean DEFAULT false,
  file_size_limit    bigint,
  allowed_mime_types text[]
);

CREATE TABLE IF NOT EXISTS storage.objects (
  id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bucket_id text REFERENCES storage.buckets(id),
  name      text NOT NULL,
  owner     uuid,
  metadata  jsonb DEFAULT '{}'
);

ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

GRANT USAGE ON SCHEMA storage TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON storage.objects TO anon, authenticated, service_role;
```

Note the ordering dependency: this fixture creates roles-dependent grants, so `000_bootstrap.sql` (which creates the roles) runs first in the harness.

- [ ] **Step 2: Write the failing test**

Create `supabase/tests/rls_test.sql`. Each assertion raises an exception on failure, so `psql -v ON_ERROR_STOP=1` turns any failure into a non-zero exit.

```sql
-- RLS regression tests. Run via supabase/tests/run-rls-tests.sh.
-- Any failed assertion raises and aborts with a non-zero exit code.

\set ON_ERROR_STOP on

-- Seed one published and one draft photo as the owner (bypasses RLS).
INSERT INTO public.categories (name, slug, sort_order)
  VALUES ('Editorial', 'editorial', 0);
INSERT INTO public.photos (title, storage_path, category, is_published, is_hero)
  VALUES ('published', 'a.jpg', 'editorial', true,  false),
         ('draft',     'b.jpg', 'editorial', false, false);

-- ---------------------------------------------------------------
-- 1. is_admin() returns false (never NULL) for a claimless JWT
-- ---------------------------------------------------------------
SELECT set_config('request.jwt.claims', '{}', false);
DO $$
BEGIN
  IF public.is_admin() IS DISTINCT FROM false THEN
    RAISE EXCEPTION 'FAIL 1: is_admin() returned % for a claimless JWT, expected false',
      COALESCE(public.is_admin()::text, 'NULL');
  END IF;
END $$;

-- ---------------------------------------------------------------
-- 2. anon can read published photos but not drafts
-- ---------------------------------------------------------------
SET LOCAL ROLE anon;
DO $$
DECLARE n int;
BEGIN
  SELECT count(*) INTO n FROM public.photos;
  IF n <> 1 THEN
    RAISE EXCEPTION 'FAIL 2: anon sees % photos, expected 1 (published only)', n;
  END IF;
END $$;
RESET ROLE;

-- ---------------------------------------------------------------
-- 3. anon cannot write
-- ---------------------------------------------------------------
SET LOCAL ROLE anon;
DO $$
BEGIN
  BEGIN
    INSERT INTO public.photos (title, storage_path) VALUES ('evil', 'x.jpg');
    RAISE EXCEPTION 'FAIL 3: anon INSERT into photos succeeded';
  EXCEPTION WHEN insufficient_privilege OR check_violation THEN
    NULL; -- expected
  END;
END $$;
RESET ROLE;

-- ---------------------------------------------------------------
-- 4. A non-admin authenticated user cannot write.
--    This is the assertion that fails without 005 — the orphaned
--    "Authenticated users can manage photos" policy allowed it.
-- ---------------------------------------------------------------
SELECT set_config('request.jwt.claims', '{"app_metadata":{"role":"viewer"}}', false);
SET LOCAL ROLE authenticated;
DO $$
BEGIN
  BEGIN
    INSERT INTO public.photos (title, storage_path) VALUES ('evil', 'y.jpg');
    RAISE EXCEPTION 'FAIL 4a: non-admin INSERT into photos succeeded';
  EXCEPTION WHEN insufficient_privilege OR check_violation THEN
    NULL;
  END;

  BEGIN
    DELETE FROM public.photos;
    IF (SELECT count(*) FROM public.photos) = 0 THEN
      RAISE EXCEPTION 'FAIL 4b: non-admin DELETE removed rows';
    END IF;
  EXCEPTION WHEN insufficient_privilege THEN
    NULL;
  END;

  BEGIN
    UPDATE public.site_settings SET value = '"pwned"' WHERE key = 'site_title';
    IF (SELECT value FROM public.site_settings WHERE key = 'site_title') = '"pwned"' THEN
      RAISE EXCEPTION 'FAIL 4c: non-admin UPDATE on site_settings succeeded';
    END IF;
  EXCEPTION WHEN insufficient_privilege THEN
    NULL;
  END;
END $$;
RESET ROLE;

-- ---------------------------------------------------------------
-- 5. A non-admin cannot call set_hero_photo()
-- ---------------------------------------------------------------
SET LOCAL ROLE authenticated;
DO $$
BEGIN
  BEGIN
    PERFORM public.set_hero_photo('00000000-0000-0000-0000-000000000000'::uuid);
    RAISE EXCEPTION 'FAIL 5: non-admin set_hero_photo() succeeded';
  EXCEPTION WHEN insufficient_privilege THEN
    NULL;
  END;
END $$;
RESET ROLE;

-- ---------------------------------------------------------------
-- 6. anon has no EXECUTE on set_hero_photo() at all
-- ---------------------------------------------------------------
DO $$
BEGIN
  IF has_function_privilege('anon', 'public.set_hero_photo(uuid)', 'EXECUTE') THEN
    RAISE EXCEPTION 'FAIL 6: anon still holds EXECUTE on set_hero_photo()';
  END IF;
END $$;

-- ---------------------------------------------------------------
-- 7. An admin CAN write, and set_hero_photo() is atomic
-- ---------------------------------------------------------------
SELECT set_config('request.jwt.claims', '{"app_metadata":{"role":"admin"}}', false);
SET LOCAL ROLE authenticated;
DO $$
DECLARE target uuid; heroes int;
BEGIN
  IF public.is_admin() IS NOT TRUE THEN
    RAISE EXCEPTION 'FAIL 7a: is_admin() false for an admin JWT';
  END IF;

  INSERT INTO public.photos (title, storage_path, is_published)
    VALUES ('admin-made', 'c.jpg', true) RETURNING id INTO target;

  PERFORM public.set_hero_photo(target);

  SELECT count(*) INTO heroes FROM public.photos WHERE is_hero;
  IF heroes <> 1 THEN
    RAISE EXCEPTION 'FAIL 7b: % hero photos after set_hero_photo(), expected 1', heroes;
  END IF;
END $$;
RESET ROLE;

-- ---------------------------------------------------------------
-- 8. No permissive FOR ALL policy survives on the content tables
-- ---------------------------------------------------------------
DO $$
DECLARE leftover text;
BEGIN
  SELECT string_agg(format('%s.%s', tablename, policyname), ', ')
    INTO leftover
    FROM pg_policies
   WHERE schemaname = 'public'
     AND tablename IN ('photos', 'categories', 'site_settings')
     AND cmd = 'ALL'
     AND qual = 'true';
  IF leftover IS NOT NULL THEN
    RAISE EXCEPTION 'FAIL 8: permissive USING(true) FOR ALL policies remain: %', leftover;
  END IF;
END $$;

SELECT 'ALL RLS TESTS PASSED' AS result;
```

- [ ] **Step 3: Write the harness**

Create `supabase/tests/run-rls-tests.sh` and `chmod +x` it:

```bash
#!/usr/bin/env bash
# Applies every migration to a disposable Postgres, then runs the RLS
# assertions. Requires Docker. Exits non-zero on the first failure.
set -euo pipefail

CONTAINER="henrard-rls-test-$$"
cleanup() { docker rm -f "$CONTAINER" >/dev/null 2>&1 || true; }
trap cleanup EXIT

docker run -d --name "$CONTAINER" \
  -e POSTGRES_PASSWORD=test -e POSTGRES_DB=henrard_test \
  postgres:15-alpine >/dev/null

printf 'waiting for postgres'
for _ in $(seq 1 30); do
  if docker exec "$CONTAINER" pg_isready -U postgres >/dev/null 2>&1; then break; fi
  printf '.'; sleep 1
done
echo

psql_run() {
  docker exec -i "$CONTAINER" \
    psql -U postgres -d henrard_test -v ON_ERROR_STOP=1 -q < "$1"
}

# 000 creates the roles that the stubs grant to, so it runs first.
psql_run supabase/migrations/000_bootstrap.sql
psql_run supabase/tests/fixtures/00_stubs.sql
for f in supabase/migrations/0[1-9]*.sql; do
  echo "applying $(basename "$f")"
  psql_run "$f"
done

echo "running assertions"
psql_run supabase/tests/rls_test.sql
echo "RLS tests passed"
```

- [ ] **Step 4: Run it and watch it fail**

```bash
pnpm dlx --version >/dev/null 2>&1 || true   # no-op; Docker is the only requirement
./supabase/tests/run-rls-tests.sh
```

Expected: a non-zero exit on `FAIL 4a: non-admin INSERT into photos succeeded` — the orphaned permissive policy is still in force — or on `FAIL 5`/`FAIL 6` for `set_hero_photo`. If it fails earlier with a missing-relation error, the fixtures are wrong; fix those before continuing.

- [ ] **Step 5: Write the migration**

Create `supabase/migrations/005_rls_hardening.sql`:

```sql
-- =========================================
-- HenrardVisuals — RLS hardening
-- =========================================
-- Idempotent. Safe to apply to a database initialised from the old
-- volumes/db/init/init.sql, from setup-complete.sql, or from a clean
-- 000..004 run.
-- =========================================

-- ----------------------------------------
-- 1. is_admin(): never NULL, pinned search_path, STABLE
-- ----------------------------------------
-- The previous plpgsql version returned NULL for a JWT with no
-- app_metadata.role. RLS coerces NULL to false, so policies held — but
-- `IF NOT public.is_admin()` guards silently no-opped, because NOT NULL
-- is NULL. COALESCE closes that. SET search_path = '' satisfies Supabase
-- lint 0011 (function_search_path_mutable) and requires every reference
-- to be schema-qualified.
DROP FUNCTION IF EXISTS public.is_admin();

CREATE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT COALESCE(
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin',
    false
  );
$$;

COMMENT ON FUNCTION public.is_admin() IS
  'True when the caller''s JWT carries app_metadata.role = admin. Only the '
  'service_role can write app_metadata, so a client cannot self-promote. '
  'Returns false, never NULL.';

-- ----------------------------------------
-- 2. handle_updated_at(): pin search_path
-- ----------------------------------------
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- ----------------------------------------
-- 3. Drop every permissive write policy, whatever it was named
-- ----------------------------------------
-- Three schema sources created differently-named policies for the same
-- thing. Rather than guess, drop anything on these tables that grants
-- FOR ALL with an unconditional USING (true).
DO $$
DECLARE p record;
BEGIN
  FOR p IN
    SELECT schemaname, tablename, policyname
      FROM pg_policies
     WHERE schemaname = 'public'
       AND tablename IN ('photos', 'categories', 'site_settings')
       AND cmd = 'ALL'
       AND qual = 'true'
  LOOP
    EXECUTE format('DROP POLICY %I ON %I.%I', p.policyname, p.schemaname, p.tablename);
    RAISE NOTICE 'dropped permissive policy %.% / %', p.schemaname, p.tablename, p.policyname;
  END LOOP;
END $$;

-- Named drops for the storage policies, which the loop above does not cover.
DROP POLICY IF EXISTS "Utilisateurs authentifiés peuvent uploader" ON storage.objects;
DROP POLICY IF EXISTS "Utilisateurs authentifiés peuvent modifier" ON storage.objects;
DROP POLICY IF EXISTS "Utilisateurs authentifiés peuvent supprimer" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload"             ON storage.objects;

-- ----------------------------------------
-- 4. Re-assert admin-only write policies
-- ----------------------------------------
DROP POLICY IF EXISTS "Admins gèrent les photos"      ON public.photos;
DROP POLICY IF EXISTS "Admins gèrent les catégories"  ON public.categories;
DROP POLICY IF EXISTS "Admins gèrent les paramètres"  ON public.site_settings;

CREATE POLICY "Admins gèrent les photos"
  ON public.photos FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "Admins gèrent les catégories"
  ON public.categories FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "Admins gèrent les paramètres"
  ON public.site_settings FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Admins additionally need to SELECT their own drafts; the public read
-- policy is limited to is_published = true.
DROP POLICY IF EXISTS "Admins lisent tout" ON public.photos;
CREATE POLICY "Admins lisent tout"
  ON public.photos FOR SELECT TO authenticated
  USING (public.is_admin());

DROP POLICY IF EXISTS "Admins peuvent uploader" ON storage.objects;
DROP POLICY IF EXISTS "Admins peuvent modifier" ON storage.objects;
DROP POLICY IF EXISTS "Admins peuvent supprimer" ON storage.objects;

CREATE POLICY "Admins peuvent uploader"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'photos' AND public.is_admin());

CREATE POLICY "Admins peuvent modifier"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'photos' AND public.is_admin());

CREATE POLICY "Admins peuvent supprimer"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'photos' AND public.is_admin());

-- ----------------------------------------
-- 5. Least-privilege table grants
-- ----------------------------------------
-- The old init.sql issued GRANT ALL ... TO authenticated. RLS was the only
-- thing standing between a logged-in user and the data; with the permissive
-- policy dropped, the grant is still wider than necessary. Policies remain
-- the real control — this is defence in depth.
REVOKE ALL ON public.photos, public.categories, public.site_settings FROM authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE
  ON public.photos, public.categories, public.site_settings TO authenticated;

REVOKE ALL ON public.photos, public.categories, public.site_settings FROM anon;
GRANT SELECT ON public.photos, public.categories, public.site_settings TO anon;

-- ----------------------------------------
-- 6. FORCE RLS
-- ----------------------------------------
-- PostgREST connects as `postgres`, which owns these tables, and a table
-- owner is exempt from its own RLS unless FORCE is set. Without this, any
-- request that manages to execute as the owner role sees no RLS at all.
ALTER TABLE public.photos        FORCE ROW LEVEL SECURITY;
ALTER TABLE public.categories    FORCE ROW LEVEL SECURITY;
ALTER TABLE public.site_settings FORCE ROW LEVEL SECURITY;

-- ----------------------------------------
-- 7. set_hero_photo(): authorize, pin search_path, revoke from PUBLIC
-- ----------------------------------------
-- Previously callable by anyone: PostgREST exposes public-schema functions
-- as RPC and EXECUTE defaults to PUBLIC. Its first statement is an
-- unconditional global UPDATE, so an unauthenticated POST wiped the hero.
CREATE OR REPLACE FUNCTION public.set_hero_photo(target_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = 'insufficient_privilege';
  END IF;

  UPDATE public.photos SET is_hero = FALSE WHERE is_hero = TRUE;
  UPDATE public.photos SET is_hero = TRUE  WHERE id = target_id;
END;
$$;

REVOKE ALL ON FUNCTION public.set_hero_photo(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_hero_photo(UUID) TO authenticated, service_role;

COMMENT ON FUNCTION public.set_hero_photo IS
  'Atomically promotes one photo to hero. Admin-only; raises '
  'insufficient_privilege otherwise.';

-- is_admin() itself must not be callable in a way that leaks; reading it is
-- harmless, but keep the grant explicit rather than inherited from PUBLIC.
REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin() TO anon, authenticated, service_role;

-- ----------------------------------------
-- 8. Index for the gallery query
-- ----------------------------------------
-- useHomeData filters is_published = true AND is_hero = false, orders by
-- sort_order and takes 12 rows. The single-column indexes from 001 cannot
-- serve that; this partial composite can.
CREATE INDEX IF NOT EXISTS idx_photos_public_gallery
  ON public.photos (sort_order, id)
  WHERE is_published = true AND is_hero = false;
```

- [ ] **Step 6: Run the tests to verify they pass**

```bash
./supabase/tests/run-rls-tests.sh
```

Expected: `ALL RLS TESTS PASSED`, exit 0. If FAIL 8 fires, a permissive policy exists under a name the loop's `qual = 'true'` filter missed — inspect with `SELECT * FROM pg_policies WHERE schemaname='public'` inside the container and add a named drop.

- [ ] **Step 7: Add the script to `package.json`**

In the `scripts` block, after `"test:watch"`:

```json
    "test:rls": "./supabase/tests/run-rls-tests.sh",
```

- [ ] **Step 8: Apply to the running database**

The migration is idempotent, so it is safe on an existing deployment:

```bash
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/migrations/005_rls_hardening.sql
```

Then verify the RPC is closed from outside:

```bash
curl -s -o /dev/null -w '%{http_code}\n' \
  -X POST "$API_EXTERNAL_URL/rest/v1/rpc/set_hero_photo" \
  -H "apikey: $ANON_KEY" -H 'Content-Type: application/json' \
  -d '{"target_id":"00000000-0000-0000-0000-000000000000"}'
```

Expected: `404` (PostgREST hides functions the role cannot execute) or `403`. Before this task it returned `200` and wiped the hero.

- [ ] **Step 9: Commit**

```bash
git add supabase/migrations/005_rls_hardening.sql supabase/tests package.json
git commit -m "fix(security): drop permissive RLS policies and lock hero RPC"
```

### Task 4: Gate the admin panel on the admin role, and re-authenticate before credential changes

`src/context/AuthContext.tsx:94` defines `isAuthenticated: !!state.user`, and `src/pages/Admin.tsx:24` gates the whole panel on it. Nothing in `src/` ever reads `app_metadata.role` — grep confirms zero matches. So any account renders the full panel. After Task 3 its writes fail at the database, which is the right layering, but presenting a fully functional admin UI to a non-admin is a bug in its own right.

`src/components/Admin/AccountSettings.tsx:32` and `:54` call `supabase.auth.updateUser` for password and email with no re-authentication. GoTrue v2.132.3 only requires the old password when `GOTRUE_SECURITY_UPDATE_PASSWORD_REQUIRE_REAUTHENTICATION` is set, which it is not (Task 11 sets it). Client-side re-auth is the second half of that fix.

**Files:**
- Modify: `src/context/AuthContext.tsx`
- Modify: `src/types/index.ts` (the `AuthContextValue` interface)
- Modify: `src/pages/Admin.tsx:24`
- Modify: `src/components/Admin/AccountSettings.tsx`
- Modify: `src/i18n/fr.ts`, `src/i18n/en.ts`
- Test: `src/hooks/useAuth.test.ts` (extend the existing suite)

**Interfaces:**
- Consumes: `public.is_admin()` semantics from Task 3 — the client predicate must match the SQL predicate exactly.
- Produces: `useAuth().isAdmin: boolean`. Task 13 does not touch it; nothing else consumes it.

- [ ] **Step 1: Write the failing test**

Append to `src/hooks/useAuth.test.ts`:

```ts
  it('reports isAdmin true only when app_metadata.role is admin', async () => {
    const session = {
      access_token: 'token',
      user: { id: '1', email: 'a@b.c', app_metadata: { role: 'admin' } },
    };
    mockGetSession.mockResolvedValue({ data: { session }, error: null });

    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.isAdmin).toBe(true);
  });

  it('reports isAdmin false for an authenticated non-admin', async () => {
    const session = {
      access_token: 'token',
      user: { id: '2', email: 'x@y.z', app_metadata: {} },
    };
    mockGetSession.mockResolvedValue({ data: { session }, error: null });

    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.isAdmin).toBe(false);
  });
```

Match `mockGetSession` and the import list to whatever the existing file already uses — do not introduce a second mocking style.

- [ ] **Step 2: Run it and confirm it fails**

```bash
pnpm test -- src/hooks/useAuth.test.ts
```

Expected: FAIL — `expected undefined to be true`, because `isAdmin` does not exist.

- [ ] **Step 3: Add `isAdmin` to the context type**

In `src/types/index.ts`, inside `AuthContextValue`, next to `isAuthenticated`:

```ts
  /** True when the session JWT carries app_metadata.role === 'admin'.
   *  UX gating only — public.is_admin() in RLS is the real control. */
  isAdmin: boolean;
```

- [ ] **Step 4: Compute it, and memoize the provider value**

`src/context/AuthContext.tsx:92-98` currently builds a fresh object literal every render, invalidating context for every consumer. Fix both at once:

```tsx
  const value = useMemo<AuthContextValue>(() => {
    const role = (state.user?.app_metadata as { role?: string } | undefined)?.role;
    return {
      ...state,
      signIn,
      signOut,
      isAuthenticated: !!state.user,
      isAdmin: role === 'admin',
    };
  }, [state, signIn, signOut]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
```

Add `useMemo` to the React import on line 1.

- [ ] **Step 5: Run the tests to verify they pass**

```bash
pnpm test -- src/hooks/useAuth.test.ts
```

Expected: PASS, all previously passing cases still green.

- [ ] **Step 6: Gate the panel**

In `src/pages/Admin.tsx`, replace the `isAuthenticated` destructure on line 13 and the guard on line 24:

```tsx
  const { isAuthenticated, isAdmin, user, signOut, isLoading } = useAuth();
```

```tsx
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6 py-12">
        <Login onSuccess={() => {}} />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-6 px-6">
        <p className="text-gray-400">{t('admin.notAuthorised')}</p>
        <button
          type="button"
          onClick={signOut}
          className="px-4 py-2 border border-white text-sm uppercase tracking-wider hover:bg-white hover:text-black transition-colors"
        >
          {t('admin.signOut')}
        </button>
      </div>
    );
  }
```

Add `const { t } = useLanguage();` and the `useLanguage` import — `Admin.tsx` does not currently use i18n at all (Task 14 converts the rest of this file).

- [ ] **Step 7: Add the two translation keys**

`src/i18n/fr.ts`, under the `admin` namespace:

```ts
      notAuthorised: "Ce compte n'a pas les droits administrateur.",
      signOut: 'Déconnexion',
```

`src/i18n/en.ts`:

```ts
      notAuthorised: 'This account does not have administrator rights.',
      signOut: 'Sign out',
```

If no `admin` namespace exists yet, create it in both files with these two keys. `src/i18n/i18next.d.ts` derives its key union from the resource object, so no manual type edit is needed.

- [ ] **Step 8: Require the current password before changing credentials**

In `src/components/Admin/AccountSettings.tsx`, add a `currentPassword` field to the form state and re-authenticate before either mutation:

```tsx
  const reauthenticate = useCallback(async (): Promise<boolean> => {
    if (!user?.email) return false;
    const { error } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: currentPassword,
    });
    if (error) {
      setMessage({ type: 'error', text: t('account.reauthFailed') });
      return false;
    }
    return true;
  }, [user?.email, currentPassword, t]);
```

Call `if (!(await reauthenticate())) return;` as the first statement of both the password handler (line 32) and the email handler (line 54), and render a `type="password"` input bound to `currentPassword` with an associated `<label htmlFor>` — Task 13 relies on every admin label being associated, so do it correctly here rather than adding to that backlog.

Translation keys, added to both locale files under `account`:

```ts
      currentPassword: 'Mot de passe actuel',   // en: 'Current password'
      reauthFailed: 'Mot de passe actuel incorrect.',  // en: 'Current password is incorrect.'
```

- [ ] **Step 9: Verify the whole suite and the type checker**

```bash
pnpm check && pnpm test
```

Expected: `tsc --noEmit` silent, ESLint clean, 71 tests passing (69 existing + 2 new).

- [ ] **Step 10: Commit**

```bash
git add src/context/AuthContext.tsx src/types/index.ts src/pages/Admin.tsx \
        src/components/Admin/AccountSettings.tsx src/hooks/useAuth.test.ts \
        src/i18n/fr.ts src/i18n/en.ts
git commit -m "feat(auth): gate admin panel on admin role and require reauth"
```

---

# PHASE 2 — IMAGES AND LOAD PERFORMANCE

This phase addresses the reported symptom directly. Two defects produce it, and they multiply:

- `src/lib/supabase.ts:44-56` defines `getImageUrl()`, which builds a Supabase render/imgproxy URL with `width`/`height`/`quality`. It has **zero call sites**. All four consumers call `getStorageUrl()` instead, which returns the untouched original. `supabase/migrations/002_storage_bucket.sql:15` allows uploads up to 50 MB.
- `src/components/OptimizedImage.tsx:101` renders no `<img>` until `isInView`, so every container is 0 px tall on mount. `src/components/PhotoGallery.tsx:89` lays the grid out with CSS multi-column, so all twelve zero-height items stack at the same `y`, all fall inside the 200 px `rootMargin` at `:45`, and all twelve fire simultaneously.

Net effect: twelve full-resolution originals download at once, on first paint, on mobile.

### Task 5: A transform-aware image URL builder with a runtime fallback

Production runs against a Coolify-hosted Supabase whose imgproxy status is unconfirmed. If transforms are unavailable, `/storage/v1/render/image/public/...` returns 400 and every image breaks. So the builder is flag-driven and degrades to the original URL.

**Files:**
- Create: `src/lib/imageUrl.ts`
- Create: `src/lib/imageUrl.test.ts`
- Modify: `src/lib/index.ts` (export the new module, drop the dead `getImageUrl`)
- Modify: `src/lib/supabase.ts` (delete `getImageUrl`, lines 41-56)
- Modify: `.env.example`, `docker-compose.coolify.yml`, `docker-compose.yml`, `Dockerfile`

**Interfaces:**
- Consumes: `getStorageUrl(path, bucket?)` from `src/lib/supabase.ts:36`.
- Produces:
  - `buildImageUrl(path: string, opts?: { width?: number; quality?: number }): string`
  - `buildImageSrcSet(path: string, widths: number[], quality?: number): string`
  - `GALLERY_WIDTHS: readonly number[]`, `HERO_WIDTHS: readonly number[]`, `THUMB_WIDTH: number`
  - Task 6 consumes all of these; Task 7 wires them into the four call sites.

- [ ] **Step 1: Probe production before writing any code**

```bash
curl -s -o /dev/null -w '%{http_code} %{size_download}\n' \
  "$VITE_SUPABASE_URL/storage/v1/render/image/public/photos/<a-real-storage-path>?width=400&quality=70"
```

`200` with a size well under the original means transforms work — set `VITE_IMAGE_TRANSFORM=true`. `400`, `404` or `501` means they do not — leave it `false` and the fallback path keeps the site working while you enable imgproxy on that instance. Record the result in the commit message.

- [ ] **Step 2: Write the failing test**

Create `src/lib/imageUrl.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('@/lib/supabase', () => ({
  getStorageUrl: (path: string) => `https://cdn.example.com/storage/v1/object/public/photos/${path}`,
}));

const load = async () => {
  vi.resetModules();
  return import('@/lib/imageUrl');
};

describe('buildImageUrl', () => {
  const original = import.meta.env['VITE_IMAGE_TRANSFORM'];

  beforeEach(() => {
    import.meta.env['VITE_IMAGE_TRANSFORM'] = 'true';
  });

  afterEach(() => {
    import.meta.env['VITE_IMAGE_TRANSFORM'] = original;
  });

  it('returns a render URL with width and quality when transforms are enabled', async () => {
    const { buildImageUrl } = await load();
    const url = buildImageUrl('a.jpg', { width: 640, quality: 70 });

    expect(url).toContain('/storage/v1/render/image/public/photos/a.jpg');
    expect(url).toContain('width=640');
    expect(url).toContain('quality=70');
  });

  it('defaults quality to 70 when not supplied', async () => {
    const { buildImageUrl } = await load();
    expect(buildImageUrl('a.jpg', { width: 640 })).toContain('quality=70');
  });

  it('falls back to the original object URL when transforms are disabled', async () => {
    import.meta.env['VITE_IMAGE_TRANSFORM'] = 'false';
    const { buildImageUrl } = await load();
    const url = buildImageUrl('a.jpg', { width: 640 });

    expect(url).toBe('https://cdn.example.com/storage/v1/object/public/photos/a.jpg');
    expect(url).not.toContain('width=');
  });

  it('returns the original URL when no width is requested', async () => {
    const { buildImageUrl } = await load();
    expect(buildImageUrl('a.jpg')).toBe(
      'https://cdn.example.com/storage/v1/object/public/photos/a.jpg'
    );
  });
});

describe('buildImageSrcSet', () => {
  beforeEach(() => {
    import.meta.env['VITE_IMAGE_TRANSFORM'] = 'true';
  });

  it('emits one comma-separated candidate per width with a w descriptor', async () => {
    const { buildImageSrcSet } = await load();
    const parts = buildImageSrcSet('a.jpg', [400, 800]).split(', ');

    expect(parts).toHaveLength(2);
    expect(parts[0]).toContain('width=400');
    expect(parts[0]?.endsWith(' 400w')).toBe(true);
    expect(parts[1]?.endsWith(' 800w')).toBe(true);
  });

  it('returns an empty string when transforms are disabled', async () => {
    import.meta.env['VITE_IMAGE_TRANSFORM'] = 'false';
    const { buildImageSrcSet } = await load();
    expect(buildImageSrcSet('a.jpg', [400, 800])).toBe('');
  });
});
```

An empty `srcset` is the correct disabled-state signal: Task 6 omits the attribute entirely when it is empty, so the browser uses `src` alone.

- [ ] **Step 3: Run it and confirm it fails**

```bash
pnpm test -- src/lib/imageUrl.test.ts
```

Expected: FAIL — `Cannot find module '@/lib/imageUrl'`.

- [ ] **Step 4: Write the implementation**

Create `src/lib/imageUrl.ts`:

```ts
/**
 * Image URL construction.
 *
 * Supabase Storage can resize through imgproxy at
 * /storage/v1/render/image/public/<bucket>/<path>?width=…&quality=…
 * That endpoint only exists when the Storage service runs with
 * ENABLE_IMAGE_TRANSFORMATION=true and an IMGPROXY_URL. Availability on a
 * managed instance is not guaranteed, so VITE_IMAGE_TRANSFORM gates it and
 * every helper degrades to the untransformed original.
 */

/// <reference types="vite/client" />

import { getStorageUrl } from '@/lib/supabase';

const OBJECT_SEGMENT = '/storage/v1/object/public/';
const RENDER_SEGMENT = '/storage/v1/render/image/public/';

const DEFAULT_QUALITY = 70;

/** Rendered widths for a masonry column. Covers 1x and 2x up to a 3-col grid. */
export const GALLERY_WIDTHS = [400, 600, 800, 1200] as const;

/** The hero occupies half the viewport on desktop, all of it on mobile. */
export const HERO_WIDTHS = [640, 960, 1280, 1920] as const;

/** Admin grid tiles are ~160 px wide; 320 covers 2x. */
export const THUMB_WIDTH = 320;

const transformsEnabled = (): boolean =>
  import.meta.env['VITE_IMAGE_TRANSFORM'] === 'true';

/**
 * A resized public URL, or the original when transforms are unavailable or no
 * width was requested.
 */
export function buildImageUrl(
  path: string,
  opts?: { width?: number; quality?: number }
): string {
  const original = getStorageUrl(path);
  const width = opts?.width;

  if (!transformsEnabled() || !width) return original;

  const rendered = original.replace(OBJECT_SEGMENT, RENDER_SEGMENT);
  // Nothing to rewrite means the URL shape changed upstream — fail soft.
  if (rendered === original) return original;

  const params = new URLSearchParams({
    width: String(width),
    quality: String(opts?.quality ?? DEFAULT_QUALITY),
    resize: 'contain',
  });

  return `${rendered}?${params.toString()}`;
}

/**
 * A `srcset` value, or '' when transforms are unavailable — callers must omit
 * the attribute entirely on an empty string rather than emitting srcset="".
 */
export function buildImageSrcSet(
  path: string,
  widths: readonly number[],
  quality = DEFAULT_QUALITY
): string {
  if (!transformsEnabled()) return '';

  return widths
    .map((w) => `${buildImageUrl(path, { width: w, quality })} ${w}w`)
    .join(', ');
}
```

- [ ] **Step 5: Run the tests to verify they pass**

```bash
pnpm test -- src/lib/imageUrl.test.ts
```

Expected: PASS, 6 tests.

- [ ] **Step 6: Delete the dead original**

Remove `getImageUrl` from `src/lib/supabase.ts` (lines 41-56) and its entry from the `src/lib/index.ts` export list (line 5). Add the new module to `src/lib/index.ts`:

```ts
export { buildImageUrl, buildImageSrcSet, GALLERY_WIDTHS, HERO_WIDTHS, THUMB_WIDTH } from './imageUrl';
```

`noUnusedLocals` will not catch an unused export, so this deletion is deliberate — leaving two near-identical URL builders is exactly the ambiguity that produced this bug.

- [ ] **Step 7: Thread the flag through the build**

`.env.example`, after `VITE_SUPABASE_ANON_KEY`:

```bash
# Set to "true" only if the Storage service runs with
# ENABLE_IMAGE_TRANSFORMATION=true and an IMGPROXY_URL. When false, the app
# serves original files — correct, just larger.
VITE_IMAGE_TRANSFORM=false
```

`Dockerfile`, alongside the existing build args at line 50:

```dockerfile
ARG VITE_IMAGE_TRANSFORM=false
```

`docker-compose.yml` (`build.args` and `environment`, around lines 11-17) and `docker-compose.coolify.yml` (lines 18-27) each gain:

```yaml
        - VITE_IMAGE_TRANSFORM=${VITE_IMAGE_TRANSFORM:-false}
```

The self-hosted `docker-compose.yml` stack runs imgproxy (`:173-184`), so its `.env` can safely set `true`.

- [ ] **Step 8: Commit**

```bash
git add src/lib/imageUrl.ts src/lib/imageUrl.test.ts src/lib/index.ts src/lib/supabase.ts \
        .env.example Dockerfile docker-compose.yml docker-compose.coolify.yml
git commit -m "feat(images): add transform-aware URL builder with fallback"
```

### Task 6: Make `OptimizedImage` actually lazy

The component must reserve space before the image arrives. Without an intrinsic size the container is 0 px tall, so lazy loading cannot work and the masonry layout jumps as each image lands.

**Files:**
- Modify: `src/components/OptimizedImage.tsx` (full rewrite)
- Create: `src/components/OptimizedImage.test.tsx`

**Interfaces:**
- Consumes: `buildImageSrcSet`, `GALLERY_WIDTHS` from Task 5.
- Produces: `OptimizedImageProps` gains `width?: number`, `height?: number`, `srcSet?: string`, `sizes?: string`. `priority`, `enableZoom`, `onClick`, `className`, `alt`, `src` keep their current meanings. Task 7 passes the new props.

- [ ] **Step 1: Write the failing test**

Create `src/components/OptimizedImage.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';

import { OptimizedImage } from '@/components/OptimizedImage';

// jsdom has no IntersectionObserver; capture instances so tests can fire them.
const observers: Array<(entries: Partial<IntersectionObserverEntry>[]) => void> = [];

beforeEach(() => {
  observers.length = 0;
  vi.stubGlobal(
    'IntersectionObserver',
    class {
      constructor(cb: (e: Partial<IntersectionObserverEntry>[]) => void) {
        observers.push(cb);
      }
      observe() {}
      disconnect() {}
      unobserve() {}
    }
  );
});

describe('OptimizedImage', () => {
  it('reserves space from width and height before the image loads', () => {
    const { container } = render(
      <OptimizedImage src="/a.jpg" alt="a" width={800} height={1200} />
    );
    const box = container.firstElementChild as HTMLElement;

    expect(box.style.aspectRatio).toBe('800 / 1200');
    expect(screen.queryByRole('img')).toBeNull();
  });

  it('falls back to a portrait ratio when dimensions are unknown', () => {
    const { container } = render(<OptimizedImage src="/a.jpg" alt="a" />);
    expect((container.firstElementChild as HTMLElement).style.aspectRatio).toBe('2 / 3');
  });

  it('renders the image immediately when priority is set', () => {
    render(<OptimizedImage src="/a.jpg" alt="a" priority />);
    const img = screen.getByRole('img');

    expect(img).toHaveAttribute('src', '/a.jpg');
    expect(img).toHaveAttribute('fetchpriority', 'high');
    expect(img).toHaveAttribute('loading', 'eager');
  });

  it('renders the image only after it intersects', () => {
    render(<OptimizedImage src="/a.jpg" alt="a" />);
    expect(screen.queryByRole('img')).toBeNull();

    observers[0]?.([{ isIntersecting: true }]);
    expect(screen.getByRole('img')).toHaveAttribute('src', '/a.jpg');
  });

  it('omits srcset entirely when the value is empty', () => {
    render(<OptimizedImage src="/a.jpg" alt="a" priority srcSet="" />);
    expect(screen.getByRole('img')).not.toHaveAttribute('srcset');
  });

  it('applies srcset and sizes when supplied', () => {
    render(
      <OptimizedImage src="/a.jpg" alt="a" priority srcSet="/a.jpg?w=400 400w" sizes="50vw" />
    );
    const img = screen.getByRole('img');

    expect(img).toHaveAttribute('srcset', '/a.jpg?w=400 400w');
    expect(img).toHaveAttribute('sizes', '50vw');
  });
});
```

- [ ] **Step 2: Run it and confirm it fails**

```bash
pnpm test -- src/components/OptimizedImage.test.tsx
```

Expected: FAIL on the first case — `aspectRatio` is `''` because the container has no style.

- [ ] **Step 3: Rewrite the component**

Replace the whole of `src/components/OptimizedImage.tsx`:

```tsx
/**
 * Lazily-loaded image that reserves its layout box before the bytes arrive.
 *
 * The previous version rendered nothing until the observer fired, so every
 * container was 0 px tall. With a CSS multi-column gallery that stacked all
 * items at the same y, they all intersected at once and lazy loading never
 * deferred anything. Reserving space via aspect-ratio fixes the layout shift
 * and makes the deferral real.
 */

import { useState, useRef, useEffect } from 'react';

interface OptimizedImageProps {
  src: string;
  alt: string;
  className?: string;
  onClick?: () => void;
  priority?: boolean;
  enableZoom?: boolean;
  /** Intrinsic pixel width, used for the reserved aspect ratio. */
  width?: number;
  /** Intrinsic pixel height, used for the reserved aspect ratio. */
  height?: number;
  /** Pass '' to omit the attribute — see buildImageSrcSet. */
  srcSet?: string;
  sizes?: string;
}

/** Portrait default: this is a model portfolio, most frames are 2:3. */
const FALLBACK_ASPECT = '2 / 3';

export function OptimizedImage({
  src,
  alt,
  className = '',
  onClick,
  priority = false,
  enableZoom = false,
  width,
  height,
  srcSet,
  sizes,
}: OptimizedImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(priority);
  const [isActive, setIsActive] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (priority || !containerRef.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      // 200px was chosen when containers had no height; with a reserved box
      // it prefetches roughly one viewport ahead, which is the intent.
      { rootMargin: '300px 0px', threshold: 0 }
    );

    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [priority]);

  // Touch devices have no hover, so the colour/zoom effect keys off the image
  // being near the centre of the viewport instead. Bail before allocating
  // anything on pointer devices.
  useEffect(() => {
    if (!enableZoom || !containerRef.current) return;

    const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    if (!isTouch) return;

    const observer = new IntersectionObserver(
      ([entry]) => setIsActive(Boolean(entry?.isIntersecting)),
      // A single band across the middle of the viewport — one threshold
      // instead of five, so this fires twice per item per scroll pass.
      { rootMargin: '-35% 0px -35% 0px', threshold: 0 }
    );

    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [enableZoom]);

  const aspectRatio = width && height ? `${width} / ${height}` : FALLBACK_ASPECT;

  return (
    <div
      ref={containerRef}
      className={`relative overflow-hidden bg-neutral-900 ${onClick ? 'cursor-pointer' : ''}`}
      style={{ aspectRatio }}
      onMouseEnter={enableZoom ? () => setIsActive(true) : undefined}
      onMouseLeave={enableZoom ? () => setIsActive(false) : undefined}
      onClick={onClick}
    >
      {isInView && (
        <img
          src={src}
          {...(srcSet ? { srcSet } : {})}
          {...(sizes ? { sizes } : {})}
          {...(width ? { width } : {})}
          {...(height ? { height } : {})}
          alt={alt}
          loading={priority ? 'eager' : 'lazy'}
          decoding="async"
          fetchPriority={priority ? 'high' : 'auto'}
          onLoad={() => setIsLoaded(true)}
          className={className}
          style={{
            transform: enableZoom && isActive ? 'scale(1.05)' : 'scale(1)',
            filter: enableZoom && !isActive ? 'grayscale(1)' : 'grayscale(0)',
            opacity: isLoaded ? 1 : 0,
            transition: 'transform 0.7s ease-out, opacity 0.3s ease-out, filter 0.5s ease-out',
          }}
        />
      )}
    </div>
  );
}
```

Two behaviour changes worth noting for review: `loading` is now derived from `priority` rather than accepted as a prop (the old signature let a caller pass `loading="lazy"` with `priority`, which contradicts itself), and the grayscale filter is applied only when `enableZoom` is set — the hero already gets its greyscale from a Tailwind class at `HeroSection.tsx:23`, and applying both produced a double transition.

- [ ] **Step 4: Run the tests to verify they pass**

```bash
pnpm test -- src/components/OptimizedImage.test.tsx
```

Expected: PASS, 6 tests.

- [ ] **Step 5: Add the reduced-motion escape hatch**

`src/index.css:16` sets `scroll-behavior: smooth` globally, and this component animates transform for 0.7 s. Add at the end of `src/index.css`:

```css
@media (prefers-reduced-motion: reduce) {
  :root {
    scroll-behavior: auto;
  }

  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

- [ ] **Step 6: Verify the full suite**

```bash
pnpm check && pnpm test
```

Expected: everything green. `PhotoGallery.test.tsx:13` mocks `OptimizedImage`, so it is unaffected by this rewrite.

- [ ] **Step 7: Commit**

```bash
git add src/components/OptimizedImage.tsx src/components/OptimizedImage.test.tsx src/index.css
git commit -m "fix(images): reserve layout box so lazy loading actually defers"
```

### Task 7: Wire every call site, capture dimensions, and make paths unguessable

Four components request originals. Fixing them is the payload of this phase. The same task captures `width`/`height` at upload so Task 6's aspect ratio has real values, anchors the MIME check, and replaces the enumerable `Date.now()` path prefix with a UUID — the draft-protection decision from the constraints.

**Files:**
- Modify: `src/components/PhotoGallery.tsx:3,92-98`
- Modify: `src/components/HeroSection.tsx:3,20-25`
- Modify: `src/components/PhotoLightbox.tsx:1,57-62`
- Modify: `src/components/Admin/PhotoCard.tsx:3,37-45`
- Modify: `src/hooks/useFileUpload.ts`
- Modify: `src/hooks/useAdminPhotos.ts:74-78`
- Modify: `src/types/index.ts` (`UploadedFile`)
- Test: `src/hooks/useFileUpload.test.ts` (new)

**Interfaces:**
- Consumes: `buildImageUrl`, `buildImageSrcSet`, `GALLERY_WIDTHS`, `HERO_WIDTHS`, `THUMB_WIDTH` (Task 5); the extended `OptimizedImageProps` (Task 6).
- Produces: `UploadedFile` gains `width: number | null` and `height: number | null`. `useAdminPhotos.saveUploadedFiles` persists them.

- [ ] **Step 1: Write the failing test for the upload path**

Create `src/hooks/useFileUpload.test.ts`:

```ts
import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const upload = vi.fn();
const getPublicUrl = vi.fn(() => ({ data: { publicUrl: 'https://cdn/x' } }));

vi.mock('@/lib/supabase', () => ({
  supabase: { storage: { from: () => ({ upload, getPublicUrl }) } },
}));

import { useFileUpload } from '@/hooks/useFileUpload';

const jpeg = () => new File(['x'], 'DSC_0001.jpg', { type: 'image/jpeg' });

beforeEach(() => {
  upload.mockReset().mockResolvedValue({ data: { path: 'p' }, error: null });
  vi.stubGlobal('crypto', { randomUUID: () => '11111111-2222-3333-4444-555555555555' });
});

describe('useFileUpload', () => {
  it('prefixes the stored path with a UUID, not a timestamp', async () => {
    const { result } = renderHook(() => useFileUpload({}));
    await act(async () => {
      await result.current.processFiles([jpeg()]);
    });

    const storedPath = upload.mock.calls[0]?.[0] as string;
    expect(storedPath).toMatch(/^11111111-2222-3333-4444-555555555555-DSC_0001\.jpg$/);
    expect(storedPath).not.toMatch(/^\d{13}-/);
  });

  it('rejects a forged MIME type that merely contains an allowed one', async () => {
    const onError = vi.fn();
    const { result } = renderHook(() => useFileUpload({ onError }));
    const forged = new File(['x'], 'e.html', { type: 'xximage/jpegyy' });

    await act(async () => {
      await result.current.processFiles([forged]);
    });

    expect(upload).not.toHaveBeenCalled();
    expect(onError).toHaveBeenCalled();
  });

  it('accepts an exactly-matching MIME type', async () => {
    const { result } = renderHook(() => useFileUpload({}));
    await act(async () => {
      await result.current.processFiles([jpeg()]);
    });

    expect(upload).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Run it and confirm it fails**

```bash
pnpm test -- src/hooks/useFileUpload.test.ts
```

Expected: FAIL on case 1 (path starts with a 13-digit timestamp, per `useFileUpload.ts:67-69`) and on case 2 (`file.type.match(...)` at `:35` builds an unanchored regex, so `xximage/jpegyy` passes).

- [ ] **Step 3: Fix validation, path generation and dimension capture**

In `src/hooks/useFileUpload.ts`, replace `validateFile` (lines 32-44):

```ts
  const validateFile = useCallback(
    (file: File): string | null => {
      // Exact match only. The previous version compiled the accept entry into
      // an unanchored RegExp, so "xximage/jpegyy" passed.
      const allowed = accept.split(',').map((t) => t.trim());
      if (!allowed.includes(file.type)) {
        return `Type "${file.type}" non supporté`;
      }
      if (file.size > maxSize) {
        return `Fichier trop volumineux (max ${Math.round(maxSize / 1024 / 1024)}MB)`;
      }
      return null;
    },
    [accept, maxSize]
  );
```

Task 14 moves those two strings to `t()`; leave them for now so this task stays reviewable on its own.

Add a dimension reader above `processFiles`:

```ts
  /** Intrinsic pixel size, read from an object URL. Null if the file will not
   *  decode — the upload still proceeds, the gallery just uses its fallback
   *  aspect ratio for that photo. */
  const readDimensions = (
    file: File
  ): Promise<{ width: number | null; height: number | null }> =>
    new Promise((resolve) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        URL.revokeObjectURL(url);
        resolve({ width: img.naturalWidth, height: img.naturalHeight });
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        resolve({ width: null, height: null });
      };
      img.src = url;
    });
```

Replace the path construction (lines 67-69):

```ts
          // A UUID prefix, not Date.now(). The bucket is public, so an
          // object's URL is its only access control; a millisecond timestamp
          // plus a camera filename like DSC_0001.jpg is brute-forceable,
          // 128 bits of entropy is not.
          const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
          const filePath = `${crypto.randomUUID()}-${safeName}`;
```

And carry the dimensions into the result (replacing line 80):

```ts
            const { width, height } = await readDimensions(file);
            uploaded.push({
              name: file.name,
              path: data.path,
              size: file.size,
              publicUrl: urlData.publicUrl,
              width,
              height,
            });
```

Add `Image`, `URL` and `crypto` to the `globals` block in `eslint.config.js` — `URL` is already listed, `Image` and `crypto` are not.

- [ ] **Step 4: Extend `UploadedFile` and persist the dimensions**

`src/types/index.ts`, in the `UploadedFile` interface:

```ts
  width: number | null;
  height: number | null;
```

`src/hooks/useAdminPhotos.ts`, replacing lines 77-78 inside the `insertRow('photos', {...})` call:

```ts
            width: file.width,
            height: file.height,
            mime_type: null,
```

- [ ] **Step 5: Run the tests to verify they pass**

```bash
pnpm test -- src/hooks/useFileUpload.test.ts
```

Expected: PASS, 3 tests.

- [ ] **Step 6: Convert the gallery**

`src/components/PhotoGallery.tsx` — replace the import on line 3 and the `OptimizedImage` block at lines 92-98:

```tsx
import { buildImageUrl, buildImageSrcSet, GALLERY_WIDTHS } from '@/lib/imageUrl';
```

```tsx
              <OptimizedImage
                src={buildImageUrl(photo.storage_path, { width: 800 })}
                srcSet={buildImageSrcSet(photo.storage_path, GALLERY_WIDTHS)}
                sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"
                alt={photo.title}
                width={photo.width ?? undefined}
                height={photo.height ?? undefined}
                className="w-full h-auto"
                onClick={() => onPhotoClick(photo)}
                enableZoom
              />
```

The `sizes` values mirror the `columns-1 md:columns-2 lg:columns-3` breakpoints at line 89. If those change, `sizes` must change with them.

- [ ] **Step 7: Convert the hero**

`src/components/HeroSection.tsx` — line 3 and lines 20-25:

```tsx
import { buildImageUrl, buildImageSrcSet, HERO_WIDTHS } from '@/lib/imageUrl';
```

```tsx
              <OptimizedImage
                src={buildImageUrl(heroPhoto.storage_path, { width: 1280 })}
                srcSet={buildImageSrcSet(heroPhoto.storage_path, HERO_WIDTHS)}
                sizes="(min-width: 1024px) 50vw, 100vw"
                alt={heroPhoto.title}
                width={heroPhoto.width ?? undefined}
                height={heroPhoto.height ?? undefined}
                className="w-full h-auto max-h-[calc(100vh-5rem)] object-contain grayscale hover:grayscale-0 transition-all duration-700"
                priority
              />
```

- [ ] **Step 8: Convert the lightbox**

The lightbox is the one place a large image is legitimate — it is the full-screen view. Cap it at 1920 rather than serving a 50 MB original. `src/components/PhotoLightbox.tsx` line 1 and lines 57-62:

```tsx
import { buildImageUrl } from '@/lib/imageUrl';
```

```tsx
      <img
        src={buildImageUrl(photo.storage_path, { width: 1920, quality: 82 })}
        alt={photo.title}
        className="max-w-[90vw] max-h-[90vh] object-contain"
      />
```

The `onClick={(e) => e.stopPropagation()}` on line 61 is removed here — Task 12 restructures this component's event handling so the backdrop is a button and the image is not interactive.

- [ ] **Step 9: Convert the admin grid**

`src/components/Admin/PhotoCard.tsx` line 3 and lines 37-45. This is the largest single win in the admin panel: the grid currently renders one full-resolution `<img>` per photo with no `loading` attribute.

```tsx
import { buildImageUrl, THUMB_WIDTH } from '@/lib/imageUrl';
```

```tsx
          src={buildImageUrl(photo.storage_path, { width: THUMB_WIDTH })}
          alt={photo.title}
          loading="lazy"
          decoding="async"
          width={photo.width ?? undefined}
          height={photo.height ?? undefined}
```

- [ ] **Step 10: Verify against a real browser**

```bash
pnpm build && pnpm preview
```

Open the site, hard-reload with the network panel open, and check three things: the gallery issues requests to `/render/image/public/` (or to `/object/public/` if `VITE_IMAGE_TRANSFORM=false`), each gallery response is on the order of tens of kB rather than megabytes, and images below the fold do **not** request until you scroll toward them. The third is the proof that Task 6 worked.

- [ ] **Step 11: Verify the suite**

```bash
pnpm check && pnpm test
```

`PhotoGallery.test.tsx:15` mocks `getStorageUrl`; add a matching mock for `@/lib/imageUrl` exporting `buildImageUrl`, `buildImageSrcSet` and `GALLERY_WIDTHS` so that suite keeps passing.

- [ ] **Step 12: Commit**

```bash
git add src/components/PhotoGallery.tsx src/components/HeroSection.tsx \
        src/components/PhotoLightbox.tsx src/components/Admin/PhotoCard.tsx \
        src/hooks/useFileUpload.ts src/hooks/useFileUpload.test.ts \
        src/hooks/useAdminPhotos.ts src/types/index.ts \
        src/components/PhotoGallery.test.tsx eslint.config.js
git commit -m "perf(images): serve resized variants and unguessable paths"
```

### Task 8: Fix chunking, self-host the fonts, and shorten the critical path

Three separate causes of a slow first paint:

- `vite.config.ts:29-33` declares `manualChunks: { vendor: ['react', 'react-dom'] }`. The object form matches only the exact module ids listed. `src/main.tsx:6` imports `react-dom/client`, a different id, and both packages are CJS so the real code lives in `react-dom/cjs/react-dom.production.min.js`. Nothing matches: the built `vendor` chunk is 30 bytes and React ends up inside the 161.9 kB `router` chunk.
- `index.html:58-60` requests three Google Font families and `src/index.css:5` requests two more with an `@import`. The `@import` survives minification to the first byte of the built stylesheet, so it is a *chained* blocking request: HTML → 33.7 kB CSS → googleapis CSS → gstatic woff2.
- `index.html` preconnects to the font hosts but never to the Supabase origin, which serves both the data and every image.

**Files:**
- Modify: `vite.config.ts:27-43`
- Modify: `index.html:56-60`
- Modify: `src/index.css:5`
- Modify: `tailwind.config.js:26-29`
- Create: `public/fonts/inter-{400,500,600}.woff2`, `public/fonts/playfair-{400,600}.woff2`

**Interfaces:**
- Consumes: nothing.
- Produces: a `react-vendor` chunk. Task 10's CSP can drop the Google Font origins once this lands — that dependency is why Task 8 precedes Task 10.

- [ ] **Step 1: Record the current chunk sizes**

```bash
VITE_SUPABASE_URL=http://localhost:8000 VITE_SUPABASE_ANON_KEY=dummy pnpm build 2>&1 | grep -E "dist/assets"
```

Baseline measured on this repo: `router` 161.91 kB / 52.86 gz, `supabase` 176.02 kB / 46.23 gz, `index` 66.45 kB / 21.53 gz, `vendor` 0.03 kB.

- [ ] **Step 2: Replace the object form with the function form**

`vite.config.ts`, replacing `rollupOptions` (lines 28-35):

```ts
        rollupOptions: {
            output: {
                // Function form, not object form: the object form matches only
                // exact module ids, and main.tsx imports 'react-dom/client'
                // while the code itself lives in react-dom/cjs/*. Nothing
                // matched, so `vendor` came out at 30 bytes and React was
                // swept into the router chunk.
                manualChunks(id) {
                    if (!id.includes('node_modules')) return undefined;
                    // Must precede the react test — 'react-router' contains 'react'.
                    if (id.includes('react-router')) return 'router';
                    if (/[\\/]node_modules[\\/](react|react-dom|scheduler)[\\/]/.test(id)) {
                        return 'react-vendor';
                    }
                    if (id.includes('@supabase')) return 'supabase';
                    if (id.includes('i18next')) return 'i18n';
                    return undefined;
                },
            },
        },
```

- [ ] **Step 3: Rebuild and confirm the split is real**

```bash
VITE_SUPABASE_URL=http://localhost:8000 VITE_SUPABASE_ANON_KEY=dummy pnpm build 2>&1 | grep -E "dist/assets"
```

Expected: a `react-vendor` chunk around 140 kB, `router` down to roughly 20 kB (react-router alone), a separate `i18n` chunk, and the entry chunk substantially smaller. If `react-vendor` is still tiny, the regex did not match — print `id` inside `manualChunks` to see the real paths.

- [ ] **Step 4: Download the fonts**

Only the weights actually used: `tailwind.config.js:26-29` maps `sans → Inter` and `serif → Playfair Display`. Cormorant Garamond, requested at `index.html:59`, is mapped to nothing and is pure waste.

```bash
mkdir -p public/fonts
# Fetch the woff2 files google-webfonts-helper serves for latin subsets:
#   https://gwfh.mranftl.com/fonts/inter?subsets=latin            (400,500,600)
#   https://gwfh.mranftl.com/fonts/playfair-display?subsets=latin (400,600)
# Save as public/fonts/inter-400.woff2 … playfair-600.woff2
ls -la public/fonts
```

Five files. Latin subset only; the site has no non-latin copy except the Cyrillic string in the `profile_settings` seed, which is data rather than UI chrome and falls back to a system font.

- [ ] **Step 5: Declare them locally and delete both remote requests**

Replace `src/index.css:5` (the `@import`) with `@font-face` rules placed *before* the `@tailwind` directives:

```css
@font-face {
  font-family: 'Inter';
  font-style: normal;
  font-weight: 400;
  font-display: swap;
  src: url('/fonts/inter-400.woff2') format('woff2');
}
@font-face {
  font-family: 'Inter';
  font-style: normal;
  font-weight: 500;
  font-display: swap;
  src: url('/fonts/inter-500.woff2') format('woff2');
}
@font-face {
  font-family: 'Inter';
  font-style: normal;
  font-weight: 600;
  font-display: swap;
  src: url('/fonts/inter-600.woff2') format('woff2');
}
@font-face {
  font-family: 'Playfair Display';
  font-style: normal;
  font-weight: 400;
  font-display: swap;
  src: url('/fonts/playfair-400.woff2') format('woff2');
}
@font-face {
  font-family: 'Playfair Display';
  font-style: normal;
  font-weight: 600;
  font-display: swap;
  src: url('/fonts/playfair-600.woff2') format('woff2');
}
```

In `index.html`, delete lines 56-60 entirely (both `preconnect`s and the stylesheet `link`) and put in their place:

```html
  <!-- Supabase serves both the API and every image — connect early. -->
  <link rel="preconnect" href="https://api.henrardvisuals.com" crossorigin />
  <link rel="dns-prefetch" href="https://api.henrardvisuals.com" />

  <!-- Self-hosted; preload only what renders above the fold. -->
  <link rel="preload" href="/fonts/playfair-600.woff2" as="font" type="font/woff2" crossorigin />
  <link rel="preload" href="/fonts/inter-400.woff2" as="font" type="font/woff2" crossorigin />
```

The preconnect host must match `VITE_SUPABASE_URL` in production. It is a static hint, so a mismatch costs a wasted connection rather than breaking anything.

- [ ] **Step 6: Confirm nothing reaches Google any more**

```bash
pnpm build
grep -r "fonts.googleapis\|fonts.gstatic" dist/ || echo "no google font references in dist"
```

Expected: `no google font references in dist`. This is the assertion Task 10's CSP depends on.

- [ ] **Step 7: Delete the unused public asset**

`public/HenrardVisual.png` is 210 kB and is referenced by nothing in `src/`, `index.html` or `nginx/`. Vite copies `public/` verbatim into `dist`, so it ships to every deployment.

```bash
git rm public/HenrardVisual.png
```

- [ ] **Step 8: Verify and commit**

```bash
pnpm check && pnpm test && pnpm build
```

```bash
git add vite.config.ts index.html src/index.css public/fonts
git commit -m "perf(build): split react vendor chunk and self-host fonts"
```

### Task 9: Fix the data-layer correctness bugs behind the perceived slowness

Five defects that make the app feel slow or broken independently of image weight.

**Files:**
- Modify: `src/hooks/useHomeData.ts`
- Modify: `src/components/Layout/SiteLayout.tsx:41-65`
- Modify: `src/context/LanguageContext.tsx`
- Modify: `src/hooks/useAdminPhotos.ts`
- Modify: `src/components/Admin/CategoryManager.tsx:46`
- Test: `src/hooks/useHomeData.test.ts` (extend)

**Interfaces:**
- Consumes: `public.set_hero_photo` from Task 3.
- Produces: no signature changes. `useHomeData`'s return shape is unchanged.

- [ ] **Step 1: Write the failing test**

Append to `src/hooks/useHomeData.test.ts`:

```ts
  it('clears a previous error when a later fetch succeeds', async () => {
    // First fetch fails.
    mockRange.mockResolvedValueOnce({ data: null, count: null, error: new Error('boom') });
    const { result } = renderHook(() => useHomeData());
    await waitFor(() => expect(result.current.error).toBe('boom'));

    // Second fetch succeeds — the error must not persist.
    mockRange.mockResolvedValueOnce({ data: [], count: 0, error: null });
    act(() => result.current.setCurrentPage(1));

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.error).toBeNull();
  });
```

Match `mockRange` to whatever the existing suite already stubs for the `.range()` call.

- [ ] **Step 2: Run it and confirm it fails**

```bash
pnpm test -- src/hooks/useHomeData.test.ts
```

Expected: FAIL — `error` is still `'boom'`. `useHomeData.ts:32` sets `isLoading` but never resets `error`, and `PhotoGallery.tsx:88` gates the grid on `!error`, so a single transient failure hides the gallery until a full page reload.

- [ ] **Step 3: Reset the error and guard against out-of-order responses**

In `src/hooks/useHomeData.ts`, rewrite the effect body (lines 30-78):

```ts
  useEffect(() => {
    // Rapid filter/page clicks fire overlapping queries; without this flag the
    // last response to arrive wins regardless of which was requested last.
    let cancelled = false;

    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        if (!staticDataLoaded.current) {
          const [settingsRes, categoriesRes, heroRes] = await Promise.all([
            supabase
              .from('site_settings')
              .select('value')
              .eq('key', 'profile_settings')
              .maybeSingle(),
            supabase
              .from('categories')
              .select('id, name, slug, sort_order')
              .order('sort_order', { ascending: true }),
            supabase
              .from('photos')
              .select('id, title, storage_path, width, height')
              .eq('is_hero', true)
              .eq('is_published', true)
              .maybeSingle(),
          ]);

          if (cancelled) return;

          const raw = (settingsRes.data as { value: unknown } | null)?.value;
          if (isProfileSettings(raw)) setProfileSettings(raw);
          setCategories((categoriesRes.data ?? []) as Category[]);
          setHeroPhoto(heroRes.data as Photo | null);
          staticDataLoaded.current = true;
        }

        let photosQuery = supabase
          .from('photos')
          // Explicit projection: the grid renders id, title, storage_path,
          // category and the dimensions. Selecting * also pulled the metadata
          // JSONB, description, file_size, mime_type and both timestamps.
          .select('id, title, storage_path, category, width, height', { count: 'exact' })
          .eq('is_published', true)
          .eq('is_hero', false);

        if (activeFilter !== 'All') {
          photosQuery = photosQuery.eq('category', activeFilter);
        }

        const safePage = Math.max(0, currentPage);
        const { data, count, error: photosError } = await photosQuery
          .order('sort_order', { ascending: true })
          .range(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE - 1);

        if (cancelled) return;
        if (photosError) throw photosError;

        setPhotos((data ?? []) as Photo[]);
        setTotalCount(count ?? 0);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Failed to load');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    fetchData();
    return () => {
      cancelled = true;
    };
  }, [activeFilter, currentPage, staticDataVersion]);
```

The narrowed `select` requires `Photo` fields the grid does not use to be optional at the call sites — `PhotoGallery` and `HeroSection` after Task 7 read only `id`, `title`, `storage_path`, `category`, `width`, `height`. If `tsc` objects, introduce a `GalleryPhoto = Pick<Photo, 'id' | 'title' | 'storage_path' | 'category' | 'width' | 'height'>` in `src/types/index.ts` and use it for these two components rather than widening the query back to `*`.

- [ ] **Step 4: Run the test to verify it passes**

```bash
pnpm test -- src/hooks/useHomeData.test.ts
```

Expected: PASS, 9 tests.

- [ ] **Step 5: Stop re-subscribing the scroll listener every frame**

`SiteLayout.tsx:60` calls `setLastScrollY` on every scroll event, and line 65 lists `lastScrollY` as a dependency — so each of ~60-120 events per second triggers a state update *plus* a full `removeEventListener`/`addEventListener` cycle. Replace lines 41-65:

```tsx
  const [showNavbar, setShowNavbar] = useState(true);
  const lastScrollY = useRef(0);
  const ticking = useRef(false);

  useEffect(() => {
    const update = () => {
      const y = window.scrollY;

      if (y < lastScrollY.current || y < 50) {
        setShowNavbar(true);
      } else if (y > lastScrollY.current && y > 100) {
        setShowNavbar(false);
        setIsMenuOpen(false);
      }

      lastScrollY.current = y;
      ticking.current = false;
    };

    // Ref, not state: the previous position is bookkeeping, not something the
    // UI renders. Holding it in state re-rendered the layout on every frame
    // and re-ran this effect, competing with image decode.
    const onScroll = () => {
      if (ticking.current) return;
      ticking.current = true;
      window.requestAnimationFrame(update);
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
```

Add `useRef` to the React import on line 1 and `requestAnimationFrame` to the `globals` block in `eslint.config.js`.

- [ ] **Step 6: Memoize both context values**

`LanguageContext.tsx` recreates `setLanguage` and the provider value object on every render, invalidating context for every consumer — `SiteLayout`, `Footer`, `PhotoGallery`, `Contact` and every admin component. Wrap the provider value:

```tsx
  const value = useMemo(() => ({ language, setLanguage, t }), [language, setLanguage, t]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
```

Confirm `setLanguage` is already wrapped in `useCallback` with `[]` deps and that `t` is stable; if `t` is redefined each render, wrap it in `useCallback` too. Task 4 already memoized `AuthContext`'s value.

- [ ] **Step 7: Stop refetching categories on every language toggle**

`CategoryManager.tsx:46` lists `t` in `fetchCategories`'s dependency array, and `t`'s identity changes when the language changes, so `useEffect([fetchCategories])` at `:48-50` re-queries the categories table every time the user switches FR/EN. Remove `t` from that dependency array and read the error string through a ref, or move the `t()` call out of the callback and into the render that displays the message.

`ProfileSettings.tsx:41` has the mirror-image bug: it *uses* `t` inside `fetchSettings` but omits it from the deps, so the error string is captured stale. Resolve both the same way.

- [ ] **Step 8: Use the atomic RPC and stop orphaning storage objects**

`useAdminPhotos.toggleHero` (lines 152-179) does two sequential writes with a comment admitting they are not transactional, while `set_hero_photo()` has existed since migration 004. Replace the body:

```ts
  const toggleHero = useCallback(
    async (photo: Photo) => {
      try {
        if (photo.is_hero) {
          const { error } = await updateRow('photos', photo.id, { is_hero: false });
          if (error) throw error;
        } else {
          const { error } = await supabase.rpc('set_hero_photo', { target_id: photo.id });
          if (error) throw error;
        }
        fetchPhotos();
        showMessage({
          type: 'success',
          text: photo.is_hero ? 'Image héros retirée' : 'Image héros définie',
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Erreur lors de la mise à jour';
        setError(msg);
        showMessage({ type: 'error', text: msg });
      }
    },
    [fetchPhotos, showMessage]
  );
```

`deletePhoto` (lines 119-134) removes the row but never the object, so a deleted photo stays retrievable at its public URL forever. Delete the object first — if that fails, the row survives and the operation can be retried, which is the safer ordering:

```ts
        const { error: storageError } = await supabase.storage
          .from('photos')
          .remove([photo.storage_path]);
        if (storageError) throw storageError;

        const { error } = await supabase.from('photos').delete().eq('id', photo.id);
        if (error) throw error;
```

`saveUploadedFiles` (lines 65-99) inserts one row per round trip. Replace the loop with a single batched insert via `typedFrom('photos').insert(rows)`, keeping the existing success/error message shape.

Add `Functions` typing for `set_hero_photo` to the `Database` type in `src/types/index.ts` so `supabase.rpc` type-checks — the type already has a `Functions` slot per commit `1ccd264`.

- [ ] **Step 9: Verify and commit**

```bash
pnpm check && pnpm test
```

```bash
git add src/hooks/useHomeData.ts src/hooks/useHomeData.test.ts \
        src/components/Layout/SiteLayout.tsx src/context/LanguageContext.tsx \
        src/hooks/useAdminPhotos.ts src/components/Admin/CategoryManager.tsx \
        src/components/Admin/ProfileSettings.tsx src/types/index.ts eslint.config.js
git commit -m "fix(data): guard against stale fetches and orphaned storage objects"
```

---

# PHASE 3 — EDGE AND RUNTIME HARDENING

### Task 10: Make the security headers actually reach the browser

`nginx/default.conf:24-31` declares five security headers at server level. nginx's `add_header` inheritance rule is that a `location` block inherits the parent's `add_header` directives **only if it declares none of its own**. Lines 36, 43-44 and 50-51 each declare one, and `location /` at line 48 catches everything not matched by the other two. Every response therefore goes through a block that has its own `add_header`, and all five inherited headers are discarded. The site currently serves **no** CSP, no `X-Frame-Options`, no `X-Content-Type-Options`, no `Referrer-Policy` and no `Permissions-Policy`.

Concretely: `/admin` is framable, so the Publish/Delete/Set-hero buttons are clickjackable; and with no CSP, any script that reaches the origin can read the Supabase session out of `localStorage` (`src/lib/supabase.ts:18-24` sets `persistSession: true`).

**Depends on Task 8.** The declared CSP has `style-src 'self'` and `font-src 'self' data:`, which would block Google Fonts the moment headers start applying. Task 8 removed both Google Fonts requests, so the CSP below is safe. Do not run this task first.

**Files:**
- Create: `nginx/security-headers.conf`
- Modify: `nginx/default.conf` (full rewrite)
- Delete: `nginx/nginx.conf`

**Interfaces:**
- Consumes: Task 8's guarantee that `dist/` contains no reference to `fonts.googleapis.com` or `fonts.gstatic.com`.
- Produces: no code symbols.

- [ ] **Step 1: Confirm the headers are currently missing**

```bash
docker build -t henrard-hdr --target production \
  --build-arg VITE_SUPABASE_URL=http://localhost:8000 \
  --build-arg VITE_SUPABASE_ANON_KEY=dummy . >/dev/null
docker run -d --name henrard-hdr-test -p 8099:80 henrard-hdr >/dev/null
sleep 2
curl -sI http://localhost:8099/ | grep -iE "content-security-policy|x-frame-options|x-content-type" \
  || echo "NO SECURITY HEADERS PRESENT"
```

Expected before the fix: `NO SECURITY HEADERS PRESENT`. Keep the container running for step 4.

- [ ] **Step 2: Extract the headers into an includable snippet**

Create `nginx/security-headers.conf`:

```nginx
# Included into EVERY location block. nginx discards inherited add_header
# directives in any block that declares its own, so these cannot live at
# server level alone — see nginx/default.conf.

add_header X-Content-Type-Options "nosniff"                          always;
add_header X-Frame-Options        "DENY"                             always;
add_header Referrer-Policy        "strict-origin-when-cross-origin"  always;
add_header Permissions-Policy     "camera=(), microphone=(), geolocation=(), interest-cohort=()" always;
add_header Strict-Transport-Security "max-age=63072000; includeSubDomains" always;

# script-src has no 'unsafe-inline': Vite emits external modules only.
# style-src keeps it because Tailwind's runtime and React inline styles
# (OptimizedImage sets style={{…}}) require it.
# connect-src is pinned to the API origin rather than all of https:.
# Fonts are self-hosted since the Task 8 change, so 'self' suffices.
add_header Content-Security-Policy "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https://api.henrardvisuals.com; font-src 'self'; connect-src 'self' https://api.henrardvisuals.com; frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'" always;
```

`X-XSS-Protection` from the old line 26 is deliberately dropped: it is deprecated, no current browser implements it, and in legacy Chrome its filter introduced its own vulnerabilities.

If `VITE_SUPABASE_URL` differs from `https://api.henrardvisuals.com` in a given deployment, both `img-src` and `connect-src` must be updated to match, or every API call and image is blocked.

- [ ] **Step 3: Rewrite `nginx/default.conf` so every block includes it**

```nginx
server {
    listen 80;
    listen [::]:80;
    root /usr/share/nginx/html;
    index index.html;

    # ---- Compression ----
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types
        text/plain
        text/css
        text/xml
        application/json
        application/javascript
        application/rss+xml
        application/atom+xml
        image/svg+xml
        font/woff2;

    # Serve .gz siblings produced at build time rather than compressing per
    # request. Falls back to on-the-fly gzip above when no sibling exists.
    gzip_static on;

    # ---- Static assets: content-hashed by Vite, safe to cache forever ----
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot|webp)$ {
        include /etc/nginx/security-headers.conf;
        expires 1y;
        add_header Cache-Control "public, immutable" always;
        access_log off;
    }

    # ---- HTML: never cache, so a deploy is picked up immediately ----
    location ~* \.html$ {
        include /etc/nginx/security-headers.conf;
        expires -1;
        add_header Cache-Control "no-store, must-revalidate" always;
    }

    # ---- SPA catch-all ----
    location / {
        include /etc/nginx/security-headers.conf;
        try_files $uri $uri/ /index.html;
        add_header Cache-Control "no-store, must-revalidate" always;
    }
}
```

Every `location` now re-includes the snippet, which is the only way nginx will emit these headers on a response that matches a block declaring its own `add_header`. The `Pragma` headers from the old config are gone — they are an HTTP/1.0 request header and have no meaning on a response.

Copy the snippet into the image. In `Dockerfile`, after line 67:

```dockerfile
COPY nginx/security-headers.conf /etc/nginx/security-headers.conf
```

- [ ] **Step 4: Verify the headers now appear**

```bash
docker rm -f henrard-hdr-test >/dev/null 2>&1
docker build -t henrard-hdr --target production \
  --build-arg VITE_SUPABASE_URL=http://localhost:8000 \
  --build-arg VITE_SUPABASE_ANON_KEY=dummy . >/dev/null
docker run -d --name henrard-hdr-test -p 8099:80 henrard-hdr >/dev/null
sleep 2
echo "--- / ---";              curl -sI http://localhost:8099/ | grep -icE "content-security-policy|x-frame-options|x-content-type|referrer-policy|permissions-policy|strict-transport"
echo "--- an asset ---";       curl -sI "http://localhost:8099/$(docker run --rm henrard-hdr sh -c 'ls assets/*.js | head -1')" | grep -icE "content-security-policy|x-frame-options"
docker rm -f henrard-hdr-test >/dev/null
```

Expected: `6` for `/` and `2` for the asset. Then load the site in a real browser and check the console for CSP violations — a blocked stylesheet or font means Task 8 was not completed.

- [ ] **Step 5: Emit precompressed assets so `gzip_static` has something to serve**

`gzip_static on` is inert without `.gz` siblings. Add the plugin:

```bash
pnpm add -D vite-plugin-compression2
```

In `vite.config.ts`, add to `plugins`:

```ts
        compression({ algorithm: 'gzip', exclude: [/\.(br)$/, /\.(gz)$/] }),
```

with `import { compression } from 'vite-plugin-compression2';` at the top. Verify:

```bash
pnpm build && ls dist/assets/*.gz | head -3
```

Brotli is deliberately not added: `nginx:alpine` does not ship `ngx_brotli`, so `brotli_static` would require a custom nginx image. Gzip is the correct cost/benefit here; note the brotli option in the commit body for a future reviewer.

- [ ] **Step 6: Delete the dead nginx config**

`nginx/nginx.conf` is never copied into any image — `Dockerfile:67` takes only `default.conf`. It also references `upstream supabase_studio { server studio:3000; }` at lines 57-60 for a service no compose file defines, so nginx would refuse to start with it. It is 168 lines of misleading configuration, including a rate-limit zone (`:43-44`) that a reader would reasonably assume is active. It is not.

```bash
git rm nginx/nginx.conf
```

Task 11 adds the rate limiting where it actually runs, at Kong.

- [ ] **Step 7: Commit**

```bash
git add nginx/security-headers.conf nginx/default.conf Dockerfile vite.config.ts package.json pnpm-lock.yaml
git commit -m "fix(nginx): include security headers in every location block"
```

### Task 11: Close the Compose, GoTrue, Kong and PostgREST gaps

Six configuration defects, no application code.

**Files:**
- Modify: `docker-compose.yml`
- Modify: `docker-compose.dev.yml`
- Modify: `volumes/kong/kong.yml`
- Modify: `Caddyfile` (or delete — see step 6)

**Interfaces:**
- Consumes: Task 3's migration (the `authenticator` role change assumes RLS is correct).
- Produces: no code symbols.

- [ ] **Step 1: Default `DISABLE_SIGNUP` to closed**

`docker-compose.yml:88` — an unset variable becomes an empty string, which GoTrue reads as false. Combined with `GOTRUE_MAILER_AUTOCONFIRM` defaulting true at `:95`, `POST /auth/v1/signup` hands out a usable `authenticated` JWT to anyone. Change:

```yaml
      GOTRUE_DISABLE_SIGNUP: ${DISABLE_SIGNUP:-true}
      GOTRUE_MAILER_AUTOCONFIRM: ${ENABLE_EMAIL_AUTOCONFIRM:-false}
```

Note the second change too: autoconfirm defaulting to `true` means an address is never verified. Setting it `false` requires working SMTP, which `.env.example:62-67` already provisions. Apply the identical change in `docker-compose.dev.yml`, where `true` is acceptable for local work — set it explicitly there rather than relying on a default.

- [ ] **Step 2: Require re-authentication for credential changes**

Add to the `auth` service environment in `docker-compose.yml`, after line 101. Task 4 added the client half; this is the server half that actually enforces it:

```yaml
      GOTRUE_SECURITY_UPDATE_PASSWORD_REQUIRE_REAUTHENTICATION: "true"
      GOTRUE_MAILER_SECURE_EMAIL_CHANGE_ENABLED: "true"
      GOTRUE_SECURITY_MANUAL_LINKING_ENABLED: "false"
```

Without these, a stolen access token becomes permanent account takeover in two requests: change the email to the attacker's address, then change the password. The victim gets no notification.

- [ ] **Step 3: Stop exposing the storage schema over PostgREST**

`docker-compose.yml:115` sets `PGRST_DB_SCHEMAS: public,storage,graphql_public`. The Storage service's own migrations grant table privileges in `storage` to `anon`, and the only policy on `storage.objects` is the blanket bucket check. The result is that an anonymous caller can list every stored object:

```bash
curl "$API_EXTERNAL_URL/rest/v1/objects?select=name,created_at&bucket_id=eq.photos" \
  -H "apikey: $ANON_KEY" -H "Accept-Profile: storage"
```

That returns draft filenames and upload times, which is what turns the public-bucket design into a real leak rather than an unlisted-link one. Nothing in `src/` queries the storage schema over REST — all storage access goes through `supabase.storage`, i.e. `/storage/v1/*`. Change both `docker-compose.yml:115` and `docker-compose.dev.yml:106`:

```yaml
      PGRST_DB_SCHEMAS: public
```

Verify afterwards that the curl above returns `404` or `406`, and that uploading a photo through the admin panel still works.

- [ ] **Step 4: Give PostgREST a non-superuser authenticator**

`docker-compose.yml:114` connects PostgREST as `postgres`. PostgREST issues `SET LOCAL ROLE <jwt role claim>`, and on a superuser connection that succeeds for **any** role — including `service_role` (which is `BYPASSRLS`) and `postgres` itself. Task 3's `FORCE ROW LEVEL SECURITY` closes the owner-exemption half; this closes the role-escalation half.

Append to `supabase/migrations/005_rls_hardening.sql`:

```sql
-- ----------------------------------------
-- 9. Dedicated PostgREST authenticator
-- ----------------------------------------
-- PostgREST performs SET LOCAL ROLE from the JWT's role claim. Connecting as
-- a superuser lets that succeed for any role, including service_role
-- (BYPASSRLS). This role owns nothing and can only become the three intended
-- roles. NOINHERIT means it holds none of their privileges until it switches.
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'authenticator') THEN
    EXECUTE format(
      'CREATE ROLE authenticator LOGIN NOINHERIT PASSWORD %L',
      current_setting('henrard.authenticator_password', true)
    );
  END IF;
END $$;

GRANT anon, authenticated, service_role TO authenticator;
```

Apply it with the password supplied as a setting, then repoint PostgREST:

```bash
psql "$DATABASE_URL" \
  -c "SET henrard.authenticator_password = '$AUTHENTICATOR_PASSWORD'" \
  -f supabase/migrations/005_rls_hardening.sql
```

`docker-compose.yml:114`:

```yaml
      PGRST_DB_URI: postgres://authenticator:${AUTHENTICATOR_PASSWORD}@db:5432/henrard_db
```

Add `AUTHENTICATOR_PASSWORD=` to `.env.example` under the JWT section, and to `SECURITY.md`'s rotation list. Re-run `pnpm test:rls` — it must still pass.

- [ ] **Step 5: Fix Kong's CORS and add auth rate limiting**

`volumes/kong/kong.yml` sets `origins: ["*"]` with `credentials: true` on all three routes (`:24-25/44`, `:58-59/81`, `:95-96/120`). That combination is invalid per the Fetch spec, and Kong resolves it by reflecting the request's `Origin` — effectively allowing credentialed access from anywhere.

In each of the three `cors` plugin blocks, replace the `origins` list:

```yaml
          origins:
            - "https://henrardvisuals.com"
            - "https://www.henrardvisuals.com"
```

For local development, `docker-compose.dev.yml` should mount a variant that also lists `http://localhost:5173`.

Then add rate limiting to the auth route. There is currently none anywhere in the production path: `nginx/nginx.conf`'s `limit_req_zone` was never loaded (Task 10 deleted the file), `KONG_PLUGINS` at `docker-compose.yml:56` does not include `rate-limiting`, and GoTrue v2.132.3 throttles mail sending, not the password grant. Password brute force against a known admin address is unmetered.

`docker-compose.yml:56`:

```yaml
      KONG_PLUGINS: request-transformer,cors,key-auth,acl,rate-limiting
```

`volumes/kong/kong.yml`, in the `auth-v1` service's `plugins` list:

```yaml
      - name: rate-limiting
        config:
          minute: 20
          policy: local
          limit_by: ip
          fault_tolerant: true
          hide_client_headers: false
```

Verify:

```bash
for i in $(seq 1 25); do
  curl -s -o /dev/null -w '%{http_code} ' -X POST "$API_EXTERNAL_URL/auth/v1/token?grant_type=password" \
    -H "apikey: $ANON_KEY" -H 'Content-Type: application/json' \
    -d '{"email":"nobody@example.com","password":"wrong"}'
done; echo
```

Expected: `400`s giving way to `429` before the 25th request.

- [ ] **Step 6: Bind development ports to loopback**

`docker-compose.dev.yml` publishes postgres-meta on `0.0.0.0:8080` (`:174-175`). That service serves `POST /query {"query":"…"}` and executes it as `postgres` — unauthenticated arbitrary SQL to anyone who can reach the port. Docker's port publishing writes DOCKER-chain iptables rules that bypass ufw, so on any shared network this is remotely reachable. The same file publishes Postgres (`:41-42`), GoTrue (`:65-66`), PostgREST (`:102-103`, bypassing Kong entirely), Storage (`:123-124`) and imgproxy (`:156-157`).

Prefix every one of those with `127.0.0.1:`, for example:

```yaml
    ports:
      - "127.0.0.1:8080:8080"
```

Leave the Vite dev server (`:19-20`) and Kong published as-is if you test from other devices on the LAN; everything else should be reachable only from the host.

While in this file, fix imgproxy's root at `docker-compose.dev.yml:160` and `docker-compose.yml:179` — `IMGPROXY_LOCAL_FILESYSTEM_ROOT: /` gives it the container root rather than the storage directory:

```yaml
      IMGPROXY_LOCAL_FILESYSTEM_ROOT: /var/lib/storage
```

- [ ] **Step 7: Resolve the orphaned Caddyfile**

`Caddyfile` strips Kong's CORS headers and re-adds a fixed origin (`:23-33`) — but no compose file defines a Caddy service, and `docs/DEPLOY.md:101-119` tells the operator to install Caddy on the host manually. On the documented Coolify path, Coolify's own proxy fronts the stack and performs no such stripping, so that protection does not exist in production. Step 5 fixes CORS at Kong itself, which is where it belongs.

Either delete `Caddyfile` (Coolify supersedes it) or add a header comment stating plainly that it is for the manual-VPS path only and is not used by any compose file. Do not leave it as-is; a reviewer will read it as an active control.

- [ ] **Step 8: Verify the stack still comes up**

```bash
docker compose -f docker-compose.dev.yml down -v
docker compose -f docker-compose.dev.yml up -d
sleep 20
docker compose -f docker-compose.dev.yml ps --format '{{.Name}} {{.Status}}'
```

Expected: every service `Up` (or `healthy`). Then run the admin panel end to end — log in, upload, publish, set hero, delete — to confirm the `PGRST_DB_SCHEMAS` narrowing and the authenticator role did not break storage or writes.

- [ ] **Step 9: Commit**

```bash
git add docker-compose.yml docker-compose.dev.yml volumes/kong/kong.yml \
        supabase/migrations/005_rls_hardening.sql .env.example SECURITY.md Caddyfile
git commit -m "fix(infra): close signup, CORS, schema and rate-limit gaps"
```

---

# PHASE 4 — ACCESSIBILITY AND SEO

### Task 12: Make the gallery and lightbox usable from a keyboard

The lightbox cannot be opened without a mouse. `PhotoGallery.tsx:91-99` wraps each photo in a `<div>` with an `onClick` and no `tabIndex`, `role` or key handler, and `OptimizedImage`'s container (`:94-100` before Task 6, the equivalent after) is likewise a bare `<div>`. Once open, the lightbox is a `<div onClick>` with no `role="dialog"`, no accessible name, no focus management and no focus trap; its three controls contain only decorative SVG with no label.

**Files:**
- Modify: `src/components/PhotoGallery.tsx:90-100`
- Modify: `src/components/PhotoLightbox.tsx` (full rewrite)
- Modify: `src/i18n/fr.ts`, `src/i18n/en.ts`
- Test: `src/components/PhotoLightbox.test.tsx` (new)

**Interfaces:**
- Consumes: `useLightbox` from `src/hooks/useLightbox.ts` — unchanged, it already handles Escape and arrows correctly at `:22-31`.
- Produces: no signature changes. `PhotoLightboxProps` keeps `photo`, `index`, `total`, `onClose`, `onPrevious`, `onNext`.

- [ ] **Step 1: Write the failing test**

Create `src/components/PhotoLightbox.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';

import { PhotoLightbox } from '@/components/PhotoLightbox';
import i18n from '@/i18n';

vi.mock('@/lib/imageUrl', () => ({
  buildImageUrl: (p: string) => `https://cdn.example.com/${p}`,
}));

const photo = {
  id: '1',
  title: 'Editorial 01',
  storage_path: 'a.jpg',
  category: 'editorial',
} as never;

const renderLightbox = (overrides = {}) =>
  render(
    <PhotoLightbox
      photo={photo}
      index={0}
      total={3}
      onClose={vi.fn()}
      onPrevious={vi.fn()}
      onNext={vi.fn()}
      {...overrides}
    />
  );

describe('PhotoLightbox', () => {
  beforeAll(async () => {
    await i18n.changeLanguage('en');
  });

  it('is exposed as a modal dialog named after the photo', () => {
    renderLightbox();
    const dialog = screen.getByRole('dialog');

    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAccessibleName('Editorial 01');
  });

  it('gives every control an accessible name', () => {
    renderLightbox();

    expect(screen.getByRole('button', { name: /close/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /previous/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /next/i })).toBeInTheDocument();
  });

  it('moves focus to the close button on open', () => {
    renderLightbox();
    expect(screen.getByRole('button', { name: /close/i })).toHaveFocus();
  });

  it('traps Tab inside the dialog', async () => {
    const user = userEvent.setup();
    renderLightbox();

    const buttons = screen.getAllByRole('button');
    await user.tab();
    await user.tab();
    await user.tab();
    // After cycling past the last control, focus returns to the first.
    expect(buttons).toContain(document.activeElement);
  });

  it('locks body scroll while open and restores it on unmount', () => {
    const { unmount } = renderLightbox();
    expect(document.body.style.overflow).toBe('hidden');

    unmount();
    expect(document.body.style.overflow).toBe('');
  });
});
```

- [ ] **Step 2: Run it and confirm it fails**

```bash
pnpm test -- src/components/PhotoLightbox.test.tsx
```

Expected: FAIL on the first case — `getByRole('dialog')` finds nothing.

- [ ] **Step 3: Rewrite the lightbox**

Replace the whole of `src/components/PhotoLightbox.tsx`:

```tsx
import { useEffect, useRef } from 'react';

import { useLanguage } from '@/context/LanguageContext';
import { buildImageUrl } from '@/lib/imageUrl';
import type { Photo } from '@/types';

interface PhotoLightboxProps {
  photo: Photo;
  index: number;
  total: number;
  onClose: () => void;
  onPrevious: () => void;
  onNext: () => void;
}

const TITLE_ID = 'lightbox-title';

export function PhotoLightbox({
  photo,
  index,
  total,
  onClose,
  onPrevious,
  onNext,
}: PhotoLightboxProps) {
  const { t } = useLanguage();
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const restoreFocusTo = useRef<HTMLElement | null>(null);

  // Escape and arrow keys are already handled by useLightbox. This effect owns
  // focus and scroll only.
  useEffect(() => {
    restoreFocusTo.current = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousOverflow;
      restoreFocusTo.current?.focus();
    };
  }, []);

  // Tab must not escape to the gallery behind the overlay.
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key !== 'Tab' || !dialogRef.current) return;

    const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
      'button, [href], [tabindex]:not([tabindex="-1"])'
    );
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (!first || !last) return;

    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby={TITLE_ID}
      onKeyDown={handleKeyDown}
      className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center"
    >
      {/* The backdrop is a labelled button rather than a click handler on the
          dialog itself, so closing by clicking outside is reachable by AT. */}
      <button
        type="button"
        aria-label={t('lightbox.close')}
        onClick={onClose}
        className="absolute inset-0 cursor-default"
        tabIndex={-1}
      />

      <button
        ref={closeRef}
        type="button"
        aria-label={t('lightbox.close')}
        onClick={onClose}
        className="fixed top-6 right-6 z-10 p-3 text-gray-300 hover:text-white focus:outline-none focus:ring-2 focus:ring-white"
      >
        <svg aria-hidden="true" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>

      <button
        type="button"
        aria-label={t('lightbox.previous')}
        onClick={onPrevious}
        className="fixed left-4 top-1/2 -translate-y-1/2 z-10 p-3 text-gray-300 hover:text-white focus:outline-none focus:ring-2 focus:ring-white"
      >
        <svg aria-hidden="true" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <polyline points="15 18 9 12 15 6" />
        </svg>
      </button>

      <button
        type="button"
        aria-label={t('lightbox.next')}
        onClick={onNext}
        className="fixed right-4 top-1/2 -translate-y-1/2 z-10 p-3 text-gray-300 hover:text-white focus:outline-none focus:ring-2 focus:ring-white"
      >
        <svg aria-hidden="true" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </button>

      <div className="fixed top-6 left-6 z-10">
        <h2 id={TITLE_ID} className="font-serif text-2xl text-white">
          {photo.title}
        </h2>
        {photo.category && (
          <p className="text-sm text-gray-400 mt-1 uppercase tracking-wider">{photo.category}</p>
        )}
      </div>

      <img
        src={buildImageUrl(photo.storage_path, { width: 1920, quality: 82 })}
        alt={photo.title}
        className="relative max-w-[90vw] max-h-[90vh] object-contain"
      />

      <p className="fixed bottom-6 right-6 z-10 text-gray-400 text-sm" aria-live="polite">
        {t('lightbox.position', { current: index + 1, total })}
      </p>
    </div>
  );
}

export default PhotoLightbox;
```

Note `text-gray-500` on the counter became `text-gray-400`: `#6b7280` on black measures 4.34:1, below the 4.5:1 AA threshold for normal text. `text-gray-400` is 8.27:1.

- [ ] **Step 4: Add the translation keys**

`src/i18n/fr.ts`:

```ts
    lightbox: {
      close: 'Fermer',
      previous: 'Photo précédente',
      next: 'Photo suivante',
      position: 'Photo {{current}} sur {{total}}',
    },
```

`src/i18n/en.ts`:

```ts
    lightbox: {
      close: 'Close',
      previous: 'Previous photo',
      next: 'Next photo',
      position: 'Photo {{current}} of {{total}}',
    },
```

- [ ] **Step 5: Run the tests to verify they pass**

```bash
pnpm test -- src/components/PhotoLightbox.test.tsx
```

Expected: PASS, 5 tests.

- [ ] **Step 6: Make gallery items keyboard-operable**

In `src/components/PhotoGallery.tsx`, replace the wrapper at lines 90-100. A real `<button>` gets keyboard activation, focus and role for free:

```tsx
          {photos.map((photo) => (
            <div key={photo.id} className="break-inside-avoid">
              <button
                type="button"
                onClick={() => onPhotoClick(photo)}
                aria-label={t('gallery.openPhoto', { title: photo.title })}
                className="block w-full text-left focus:outline-none focus:ring-2 focus:ring-white"
              >
                <OptimizedImage
                  src={buildImageUrl(photo.storage_path, { width: 800 })}
                  srcSet={buildImageSrcSet(photo.storage_path, GALLERY_WIDTHS)}
                  sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"
                  alt={photo.title}
                  width={photo.width ?? undefined}
                  height={photo.height ?? undefined}
                  className="w-full h-auto"
                  enableZoom
                />
              </button>
            </div>
          ))}
```

`OptimizedImage` no longer receives `onClick`, so its container stops rendering `cursor-pointer`; add `cursor-pointer` to the button's class list.

- [ ] **Step 7: Announce filter and page changes, and label the controls**

Still in `PhotoGallery.tsx`:

- Line 41: `<h3>` becomes `<h2>` (Task 13 promotes the hero to `<h1>`, so the gallery heading is level 2).
- Lines 44-66: add `aria-pressed={activeFilter === 'All'}` and `aria-pressed={activeFilter === cat.slug}` to the filter buttons; add `type="button"` to both.
- Line 72: give the spinner `role="status"` and `aria-label={t('gallery.loading')}`.
- Lines 88-102: wrap the grid in `<div aria-live="polite" aria-busy={isLoading}>` so a filter change is announced.
- Lines 110-130: wrap the pagination in `<nav aria-label={t('gallery.pagination')}>`, add `type="button"`, and replace the hardcoded French `aria-label`s at `:115` and `:126` with `t('gallery.previousPage')` / `t('gallery.nextPage')`. Give the `1 / 3` indicator `aria-live="polite"` and a full sentence via `t('gallery.pagePosition', { current, total })`.

Add every one of those keys to both locale files.

- [ ] **Step 8: Verify and commit**

```bash
pnpm check && pnpm test
```

```bash
git add src/components/PhotoLightbox.tsx src/components/PhotoLightbox.test.tsx \
        src/components/PhotoGallery.tsx src/i18n/fr.ts src/i18n/en.ts
git commit -m "fix(a11y): make gallery and lightbox keyboard operable"
```

### Task 13: Fix navigation semantics, heading order and contrast

Both navigation menus stay in the tab order while invisible, the desktop language switcher is hover-only, and the document has no `<h1>`.

**Files:**
- Modify: `src/components/Layout/SiteLayout.tsx`
- Modify: `src/components/Navigation/BurgerMenu.tsx:17-21`
- Modify: `src/components/HeroSection.tsx:35`
- Modify: `src/components/Layout/Footer.tsx`
- Modify: `src/pages/Contact.tsx:86,134,180`
- Modify: `src/i18n/fr.ts`, `src/i18n/en.ts`

**Interfaces:**
- Consumes: `t` from `useLanguage`.
- Produces: no signature changes.

- [ ] **Step 1: Take hidden navigation out of the tab order**

`SiteLayout.tsx:83-84` hides the desktop nav with `opacity-0 pointer-events-none`, which removes it visually and from the mouse but leaves three controls focusable. `:147-150` translates the mobile drawer off-screen with the same result. Replace both visibility mechanisms:

```tsx
            <nav
              aria-label={t('nav.primary')}
              className={`hidden lg:flex items-center gap-6 ${isMenuOpen ? '' : 'lg:hidden'}`}
            >
```

and for the drawer container:

```tsx
      <div
        id="mobile-menu"
        {...(isMenuOpen ? {} : { inert: '' })}
        aria-hidden={!isMenuOpen}
        className={`fixed top-0 right-0 h-full w-64 bg-black border-l border-gray-800 z-40 transform transition-transform duration-300 ease-in-out lg:hidden ${
          isMenuOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
```

`inert` needs a type declaration; add to `src/types/index.ts`:

```ts
declare module 'react' {
  interface HTMLAttributes<T> {
    inert?: '' | undefined;
  }
}
```

- [ ] **Step 2: Make the language switcher work without a pointer**

`SiteLayout.tsx:86-115` opens the dropdown purely via the CSS `:hover` on `.group`, and the trigger button at `:87` has no `onClick`, `aria-haspopup` or `aria-expanded`. A keyboard user can never change language on desktop. Convert it to state:

```tsx
  const [isLangOpen, setIsLangOpen] = useState(false);
```

```tsx
              <div className="relative">
                <button
                  type="button"
                  aria-haspopup="menu"
                  aria-expanded={isLangOpen}
                  aria-label={t('nav.changeLanguage')}
                  onClick={() => setIsLangOpen((open) => !open)}
                  className="hover:opacity-70 transition-opacity focus:outline-none focus:ring-2 focus:ring-white"
                >
                  {language === 'fr' ? <FrenchFlag /> : <UKFlag />}
                </button>
                <div
                  role="menu"
                  className={`absolute top-full left-0 mt-2 bg-black border border-gray-800 rounded-lg overflow-hidden transition-all duration-200 min-w-[100px] ${
                    isLangOpen ? 'opacity-100 visible' : 'opacity-0 invisible'
                  }`}
                >
                  <button type="button" role="menuitem" onClick={() => { setLanguage('fr'); setIsLangOpen(false); }} /* … */>
                    <FrenchFlag className="w-5 h-3" /> FR
                  </button>
                  <button type="button" role="menuitem" onClick={() => { setLanguage('en'); setIsLangOpen(false); }} /* … */>
                    <UKFlag className="w-5 h-3" /> EN
                  </button>
                </div>
              </div>
```

Close it on Escape and on outside click with the same pattern the mobile overlay uses.

- [ ] **Step 3: Label the flags and the burger**

`FrenchFlag` and `UKFlag` at `SiteLayout.tsx:8-32` are decorative wherever a text label sits beside them and meaningful where they stand alone. Add `aria-hidden="true"` to both SVG roots, and give the two standalone mobile buttons at `:154-165` `aria-label="Français"` / `aria-label="English"` (untranslated on purpose — a language name is written in its own language).

`BurgerMenu.tsx:21` has `aria-expanded` but no `aria-controls`. Add `aria-controls="mobile-menu"` to match the `id` from step 1, plus `type="button"` and `aria-label={t('nav.toggleMenu')}`.

- [ ] **Step 4: Fix the heading hierarchy and add a skip link**

The public page currently starts at `<h2>`. In `HeroSection.tsx:35`, change `<h2>` to `<h1>` (Task 12 already moved the gallery heading from `<h3>` to `<h2>`). `Login.tsx:103` is the `<h2>` on an unauthenticated `/admin`; promote it to `<h1>` as well.

In `SiteLayout.tsx`, add a skip link as the first child of the outer div and an id on `<main>` at `:192`:

```tsx
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[60] focus:bg-white focus:text-black focus:px-4 focus:py-2"
      >
        {t('nav.skipToContent')}
      </a>
```

```tsx
      <main id="main" tabIndex={-1}>{children}</main>
```

- [ ] **Step 5: Raise the contrast floor**

Measured against `#000`: `text-gray-600` (`#4b5563`) is 2.78:1, `text-gray-500` (`#6b7280`) is 4.34:1, `text-white/30` is 2.48:1, `text-white/40` is 3.66:1. AA requires 4.5:1 for normal text. `text-gray-400` (`#9ca3af`) is 8.27:1 and passes comfortably.

Replace at these sites: `Footer.tsx:84,87` (`gray-600` → `gray-400`); `Footer.tsx:26,35,39,52,59,68` and `PhotoGallery.tsx:49,61` (`gray-500` → `gray-400`); `Contact.tsx:180` (`white/30` → `white/70`); `Contact.tsx:86,134` (`white/40` → `white/70`).

- [ ] **Step 6: Add every new key to both locale files**

`nav.primary`, `nav.changeLanguage`, `nav.toggleMenu`, `nav.skipToContent`, plus whatever Task 12 introduced that is not yet present.

- [ ] **Step 7: Audit with a real tool**

```bash
pnpm build && pnpm preview &
pnpm dlx @axe-core/cli http://localhost:4173 --exit
```

Expected: zero `critical` or `serious` violations. `moderate` findings on colour contrast in the admin panel are acceptable at this stage — the admin panel is a white-on-white theme and is out of this task's scope.

- [ ] **Step 8: Verify and commit**

```bash
pnpm check && pnpm test
```

```bash
git add src/components/Layout/SiteLayout.tsx src/components/Navigation/BurgerMenu.tsx \
        src/components/HeroSection.tsx src/components/Layout/Footer.tsx \
        src/components/Auth/Login.tsx src/pages/Contact.tsx \
        src/types/index.ts src/i18n/fr.ts src/i18n/en.ts
git commit -m "fix(a11y): correct nav semantics, heading order and contrast"
```

### Task 14: Finish the i18n migration and associate every form label

The repo has a complete i18next setup with typed keys (`src/i18n/i18next.d.ts`), and roughly a hundred user-facing strings that never reach it — French in the hooks, English in the admin components. Separately, 18 admin `<label>` elements have no `htmlFor` and do not wrap their input, so every one is announced as an unlabelled edit field.

**Files:**
- Modify: `src/hooks/useAdminPhotos.ts` (11 strings), `src/hooks/useFileUpload.ts` (2)
- Modify: `src/pages/Admin.tsx` (5), `src/components/Auth/Login.tsx` (9)
- Modify: `src/components/Admin/PhotoCard.tsx` (10), `CategoryForm.tsx` (11), `CategoryItem.tsx` (2), `ProfileSettings.tsx` (8), `AccountSettings.tsx` (4), `FileUpload.tsx` (5)
- Modify: `src/i18n/fr.ts`, `src/i18n/en.ts`

**Interfaces:**
- Consumes: `t` from `useLanguage`. Hooks cannot call `useLanguage` at module scope — they must take `t` via `useLanguage()` inside the hook body, which is legal since both are hooks.
- Produces: no signature changes.

- [ ] **Step 1: Enumerate what is left**

```bash
grep -rnE "'[A-ZÀ-Ü][a-zà-ü][^']{4,}'|\"[A-ZÀ-Ü][a-zà-ü][^\"]{4,}\"" \
  src/components src/pages src/hooks \
  --include=*.tsx --include=*.ts | grep -v "\.test\." | grep -v "className" | wc -l
```

Record the count. It should reach zero (or only non-UI strings) by step 5.

- [ ] **Step 2: Write the failing test**

Create `src/i18n/parity.test.ts` — this is the test that keeps the migration from regressing:

```ts
import { describe, it, expect } from 'vitest';

import en from '@/i18n/en';
import fr from '@/i18n/fr';

const flatten = (obj: Record<string, unknown>, prefix = ''): string[] =>
  Object.entries(obj).flatMap(([k, v]) =>
    typeof v === 'object' && v !== null
      ? flatten(v as Record<string, unknown>, `${prefix}${k}.`)
      : [`${prefix}${k}`]
  );

describe('i18n resources', () => {
  it('defines exactly the same keys in both locales', () => {
    const enKeys = flatten(en).sort();
    const frKeys = flatten(fr).sort();

    expect(enKeys.filter((k) => !frKeys.includes(k))).toEqual([]);
    expect(frKeys.filter((k) => !enKeys.includes(k))).toEqual([]);
  });

  it('has no empty values', () => {
    const empty = (obj: Record<string, unknown>, prefix = ''): string[] =>
      Object.entries(obj).flatMap(([k, v]) =>
        typeof v === 'object' && v !== null
          ? empty(v as Record<string, unknown>, `${prefix}${k}.`)
          : String(v).trim() === ''
            ? [`${prefix}${k}`]
            : []
      );

    expect(empty(fr)).toEqual([]);
    expect(empty(en)).toEqual([]);
  });
});
```

- [ ] **Step 3: Run it**

```bash
pnpm test -- src/i18n/parity.test.ts
```

It may already pass — the existing resources are probably in parity. That is fine; its value is as a guard while you add ~100 keys in step 4, when drift is easy.

- [ ] **Step 4: Migrate the strings**

Work file by file, adding keys under a namespace matching the component. Where a hook produces the string, take `t` from `useLanguage()` inside the hook:

```ts
export function useAdminPhotos() {
  const { t } = useLanguage();
  // …
      setError(err instanceof Error ? err.message : t('admin.photos.loadError'));
```

`t` then becomes a dependency of the `useCallback`s that use it — which is exactly the churn Task 9 warned about in `CategoryManager`. Avoid re-triggering fetches by keeping `t` out of `fetchPhotos`'s deps and calling it only in the `catch`, reading through a ref if `exhaustive-deps` objects.

Run the parity test after each file.

- [ ] **Step 5: Associate every admin label**

For each of the 18 sites — `CategoryForm.tsx:50,60,70,80`; `AccountSettings.tsx:73,87,130`; `PhotoCard.tsx:89`; `ProfileSettings.tsx:104,113,124,133,154,163,173,182,202,211` — give the input a unique `id` and the label a matching `htmlFor`. Where a list renders many instances (ProfileSettings' stats rows), derive the id from the index: `id={`stat-${i}-value`}`.

While in `PhotoCard.tsx`, fix the invisible-controls bug at `:46-81`: the overlay is `opacity-0 group-hover:opacity-100`, so keyboard users tab into five permanently invisible buttons per card. Add `group-focus-within:opacity-100` to the overlay's class list.

Add `type="button"` to the 29 buttons that lack it — the grep from `caveman:cavecrew-investigator`-style search is `grep -rn "<button" src/ | grep -v 'type='`. The three inside `<form>` elements are correctly `type="submit"`; leave those.

- [ ] **Step 6: Verify**

```bash
pnpm check && pnpm test
```

Re-run the step 1 grep. Expected: zero UI strings outside `src/i18n/`.

- [ ] **Step 7: Commit**

```bash
git add src/components src/pages src/hooks src/i18n
git commit -m "refactor(i18n): route all user-facing copy through translations"
```

### Task 15: Make the site findable

`index.html:35` says `Model Portfolio` and `:36` describes it as `Male model portfolio` — 20 characters against a 155-character budget, containing neither the subject's name nor the brand. `og:image` points at the 200×200 favicon, so every share of a photography portfolio renders an icon. There is no canonical, no `robots.txt`, no `sitemap.xml`, no JSON-LD, and `lang="fr"` is hardcoded on a bilingual site whose language lives only in `localStorage` — so the English content has no URL and no crawler can reach it.

**Files:**
- Modify: `index.html`
- Create: `src/hooks/useDocumentMeta.ts`
- Create: `public/robots.txt`, `public/sitemap.xml`, `public/og-image.jpg`
- Modify: `src/pages/Home.tsx`, `src/pages/Contact.tsx`, `src/pages/Admin.tsx`
- Modify: `src/context/LanguageContext.tsx`
- Modify: `nginx/default.conf`

**Interfaces:**
- Consumes: `useLanguage()` for the active language.
- Produces: `useDocumentMeta({ title, description, noindex? }): void`.

- [ ] **Step 1: Rewrite the static head**

In `index.html`, replace lines 34-54:

```html
  <title>Tristan Henrard — Model Portfolio | HenrardVisuals</title>
  <meta name="description"
    content="Portfolio of Tristan Henrard, editorial and fashion model based in France. Measurements, biography and selected work. Book via HenrardVisuals." />
  <link rel="canonical" href="https://henrardvisuals.com/" />
  <link rel="alternate" hreflang="fr" href="https://henrardvisuals.com/" />
  <link rel="alternate" hreflang="en" href="https://henrardvisuals.com/?lang=en" />
  <link rel="alternate" hreflang="x-default" href="https://henrardvisuals.com/" />

  <meta property="og:site_name" content="HenrardVisuals" />
  <meta property="og:title" content="Tristan Henrard — Model Portfolio" />
  <meta property="og:description" content="Editorial and fashion model portfolio." />
  <meta property="og:type" content="website" />
  <meta property="og:url" content="https://henrardvisuals.com/" />
  <meta property="og:locale" content="fr_FR" />
  <meta property="og:locale:alternate" content="en_GB" />
  <meta property="og:image" content="https://henrardvisuals.com/og-image.jpg" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />

  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="Tristan Henrard — Model Portfolio" />
  <meta name="twitter:description" content="Editorial and fashion model portfolio." />
  <meta name="twitter:image" content="https://henrardvisuals.com/og-image.jpg" />
```

Delete the `keywords` meta at line 37 — no major engine has used it since 2009, and its content does not match the subject. Change `theme-color` at `:63` from `#171717` to `#000000` to match the actual background.

- [ ] **Step 2: Produce the social image**

Export a 1200×630 crop of the hero photograph to `public/og-image.jpg`, target under 200 kB. This single file is what a recruiter sees when the link is pasted into Slack or LinkedIn.

- [ ] **Step 3: Add `robots.txt` and `sitemap.xml`**

`public/robots.txt`:

```
User-agent: *
Allow: /
Disallow: /admin

Sitemap: https://henrardvisuals.com/sitemap.xml
```

`public/sitemap.xml`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.w3.org/1999/xhtml/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
  <url>
    <loc>https://henrardvisuals.com/</loc>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
    <xhtml:link rel="alternate" hreflang="fr" href="https://henrardvisuals.com/" />
    <xhtml:link rel="alternate" hreflang="en" href="https://henrardvisuals.com/?lang=en" />
  </url>
  <url>
    <loc>https://henrardvisuals.com/contact</loc>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
  </url>
</urlset>
```

Use the correct namespace `http://www.sitemaps.org/schemas/sitemap/0.9` for `urlset` — verify with `curl -s https://henrardvisuals.com/sitemap.xml | xmllint --noout -` after deploying.

- [ ] **Step 4: Give each route its own title and keep `lang` truthful**

Create `src/hooks/useDocumentMeta.ts`:

```ts
import { useEffect } from 'react';

import { useLanguage } from '@/context/LanguageContext';

interface DocumentMeta {
  title: string;
  description: string;
  noindex?: boolean;
}

const upsertMeta = (selector: string, attr: string, value: string, content: string) => {
  let el = document.head.querySelector<HTMLMetaElement>(selector);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, value);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
};

/**
 * Per-route document metadata. This is a client-side SPA, so it does not help
 * crawlers that never execute JS — but it does fix the browser tab, the
 * bookmark title, and the screen-reader page announcement, and it keeps
 * documentElement.lang honest for a bilingual site.
 */
export function useDocumentMeta({ title, description, noindex = false }: DocumentMeta): void {
  const { language } = useLanguage();

  useEffect(() => {
    document.title = title;
    document.documentElement.lang = language;

    upsertMeta('meta[name="description"]', 'name', 'description', description);
    upsertMeta('meta[property="og:title"]', 'property', 'og:title', title);
    upsertMeta('meta[property="og:description"]', 'property', 'og:description', description);

    const robots = document.head.querySelector<HTMLMetaElement>('meta[name="robots"]');
    if (noindex) {
      upsertMeta('meta[name="robots"]', 'name', 'robots', 'noindex, nofollow');
    } else {
      robots?.remove();
    }
  }, [title, description, noindex, language]);
}
```

Call it at the top of each page: `Home` with the site title, `Contact` with a contact-specific one, and `Admin` with `noindex: true`.

- [ ] **Step 5: Add the structured data**

For a person's portfolio, a `Person` graph is the single highest-leverage addition. Add to `index.html` before `</head>`, filling `sameAs` from the social links in `Footer.tsx`:

```html
  <script type="application/ld+json">
    {
      "@context": "https://schema.org",
      "@type": "Person",
      "name": "Tristan Henrard",
      "jobTitle": "Model",
      "url": "https://henrardvisuals.com/",
      "image": "https://henrardvisuals.com/og-image.jpg",
      "height": { "@type": "QuantitativeValue", "value": 188, "unitCode": "CMT" },
      "sameAs": ["https://www.instagram.com/…", "https://www.linkedin.com/in/…"]
    }
  </script>
```

Replace the `sameAs` placeholders with the real profile URLs before committing — a JSON-LD block with fake URLs is worse than none.

- [ ] **Step 6: Stop returning 200 for unknown paths**

`nginx/default.conf`'s `try_files $uri $uri/ /index.html` returns HTTP 200 for every unknown path, so `App.tsx:50`'s 404 route renders inside a 200 response and crawlers index soft-404s. Add before the SPA catch-all:

```nginx
    # Real 404 for paths that will never be a route, so crawlers do not index
    # soft-404s. The SPA's own 404 view still handles unknown in-app routes.
    location ~ ^/(api|wp-admin|wp-login|\.env|\.git) {
        include /etc/nginx/security-headers.conf;
        return 404;
    }
```

A fully correct fix requires prerendering, which is Task 19's noted follow-up.

- [ ] **Step 7: Verify and commit**

```bash
pnpm build
grep -c "og-image\|canonical\|ld+json" dist/index.html
```

Expected: at least 3. Then validate the JSON-LD at `search.google.com/test/rich-results` after deploying.

```bash
git add index.html public/robots.txt public/sitemap.xml public/og-image.jpg \
        src/hooks/useDocumentMeta.ts src/pages nginx/default.conf
git commit -m "feat(seo): add canonical, hreflang, sitemap and structured data"
```

---

# PHASE 5 — CI AND REPOSITORY POLISH

The repository has 69 passing unit tests, a clean type check, 50 commits at 100% Conventional Commits conformity, and three genuinely good docs. None of it is verified automatically: there is no `.github/` directory at all. For a repository whose purpose is to be shown in an interview, the absence of CI undercuts everything else in it.

### Task 16: Add the CI pipeline

**Files:**
- Create: `.github/workflows/ci.yml`
- Create: `.github/workflows/codeql.yml`
- Create: `.github/dependabot.yml`
- Modify: `package.json` (coverage script)
- Modify: `vite.config.ts` (coverage config)
- Modify: `README.md` (badge)

**Interfaces:**
- Consumes: `pnpm check`, `pnpm test`, `pnpm build`, and `pnpm test:rls` from Task 3.
- Produces: a `ci` workflow whose status badge the README links to.

- [ ] **Step 1: Add coverage reporting**

```bash
pnpm add -D @vitest/coverage-v8
```

In `vite.config.ts`, inside `test`:

```ts
        coverage: {
            provider: 'v8',
            reporter: ['text', 'lcov'],
            include: ['src/**/*.{ts,tsx}'],
            exclude: ['src/**/*.test.{ts,tsx}', 'src/test/**', 'src/types/**', 'src/i18n/**'],
            thresholds: {
                // Set at the level the suite currently reaches. Raise it as
                // coverage grows; never lower it to make a build pass.
                statements: 55,
                branches: 70,
                functions: 55,
                lines: 55,
            },
        },
```

In `package.json` scripts:

```json
    "test:coverage": "vitest run --coverage",
```

Run `pnpm test:coverage` and set the four thresholds to the actual measured numbers, rounded down to the nearest 5. Do not invent targets the suite cannot meet — a red build on day one teaches everyone to ignore the badge.

- [ ] **Step 2: Write the workflow**

Create `.github/workflows/ci.yml`:

```yaml
name: ci

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

concurrency:
  group: ci-${{ github.ref }}
  cancel-in-progress: true

jobs:
  verify:
    name: typecheck, lint, test, build
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v4
        with:
          version: 8.15.9

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm

      - run: pnpm install --frozen-lockfile

      - name: Type check and lint
        run: pnpm check

      - name: Unit tests with coverage
        run: pnpm test:coverage

      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: coverage
          path: coverage/
          retention-days: 7

      - name: Production build
        run: pnpm build
        env:
          # Build-time only; the anon key is public by design and RLS is the
          # actual access control. These are placeholders, not secrets.
          VITE_SUPABASE_URL: http://localhost:8000
          VITE_SUPABASE_ANON_KEY: ci-placeholder
          VITE_IMAGE_TRANSFORM: 'false'

      - name: Fail if any chunk exceeds 200 kB
        run: |
          oversized=$(find dist/assets -name '*.js' -size +200k)
          if [ -n "$oversized" ]; then
            echo "Chunks over 200 kB:"; echo "$oversized"; ls -la $oversized; exit 1
          fi
          echo "All chunks within budget."

  database:
    name: RLS policy tests
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Run RLS regression tests
        run: ./supabase/tests/run-rls-tests.sh

  audit:
    name: dependency audit
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with:
          version: 8.15.9
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - name: Audit production dependencies
        run: pnpm audit --prod --audit-level high

  docker:
    name: docker image builds
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Build production image
        run: |
          docker build --target production \
            --build-arg VITE_SUPABASE_URL=http://localhost:8000 \
            --build-arg VITE_SUPABASE_ANON_KEY=ci-placeholder \
            -t henrard:ci .
      - name: Assert security headers are served
        run: |
          docker run -d --name hdr -p 8099:80 henrard:ci
          sleep 3
          count=$(curl -sI http://localhost:8099/ | grep -icE \
            'content-security-policy|x-frame-options|x-content-type-options|referrer-policy|permissions-policy|strict-transport-security')
          docker rm -f hdr
          if [ "$count" -lt 6 ]; then
            echo "Expected 6 security headers, found $count"; exit 1
          fi
```

The header assertion is deliberate: Task 10's fix is the kind of configuration bug that silently regresses when someone adds a `location` block. A test is the only thing that keeps it fixed.

The chunk-size gate protects Task 8's work the same way.

- [ ] **Step 3: Add CodeQL and Dependabot**

`.github/workflows/codeql.yml`:

```yaml
name: codeql

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]
  schedule:
    - cron: '0 6 * * 1'

jobs:
  analyze:
    runs-on: ubuntu-latest
    permissions:
      security-events: write
      actions: read
      contents: read
    steps:
      - uses: actions/checkout@v4
      - uses: github/codeql-action/init@v3
        with:
          languages: javascript-typescript
          queries: security-extended
      - uses: github/codeql-action/analyze@v3
```

`.github/dependabot.yml`:

```yaml
version: 2
updates:
  - package-ecosystem: npm
    directory: /
    schedule:
      interval: weekly
    open-pull-requests-limit: 5
    groups:
      dev-dependencies:
        dependency-type: development
  - package-ecosystem: docker
    directory: /
    schedule:
      interval: weekly
  - package-ecosystem: github-actions
    directory: /
    schedule:
      interval: monthly
```

- [ ] **Step 4: Run the workflow logic locally before pushing**

```bash
pnpm install --frozen-lockfile && pnpm check && pnpm test:coverage
VITE_SUPABASE_URL=http://localhost:8000 VITE_SUPABASE_ANON_KEY=ci-placeholder VITE_IMAGE_TRANSFORM=false pnpm build
find dist/assets -name '*.js' -size +200k
pnpm audit --prod --audit-level high
./supabase/tests/run-rls-tests.sh
```

Every one must exit 0 and the `find` must print nothing. If `pnpm audit --prod --audit-level high` fails, Task 18 is a prerequisite — do that first and come back.

- [ ] **Step 5: Add the badge**

At the top of `README.md`, as the first badge:

```markdown
[![ci](https://github.com/K-Schmitt/HenrardVisuals/actions/workflows/ci.yml/badge.svg)](https://github.com/K-Schmitt/HenrardVisuals/actions/workflows/ci.yml)
```

- [ ] **Step 6: Commit**

```bash
git add .github package.json vite.config.ts pnpm-lock.yaml README.md
git commit -m "ci: add verify, rls, audit and docker jobs"
```

### Task 17: Repair the e2e suite so it tests what it claims

`e2e/rls.spec.ts:19,25,30` each assert `await expect(page).toHaveURL(/\/login/)` after visiting `/admin`. `src/App.tsx:47-50` defines only `/`, `/contact`, `/admin` and `*` — there is no `/login` route, and `Admin.tsx:24-30` renders `<Login>` inline without navigating. The suite can only ever fail, and because there was no CI it never ran. Its header comment also points at `supabase/tests/rls.sql`, which did not exist until Task 3.

**Files:**
- Modify: `e2e/rls.spec.ts`
- Modify: `e2e/auth.spec.ts`, `e2e/gallery.spec.ts` (verify against the same reality)
- Modify: `.github/workflows/ci.yml`

**Interfaces:**
- Consumes: `data-testid="login-form-container"` (already present at `Login.tsx:100`), and Task 4's non-admin screen.
- Produces: an `e2e` CI job.

- [ ] **Step 1: Rewrite the assertions to match the actual design**

```ts
import { test, expect } from '@playwright/test';

/**
 * Surface tests for the unauthenticated admin route.
 *
 * The admin panel does not redirect — it renders the login form in place at
 * /admin. These tests assert that no write affordance is reachable without a
 * session. True policy coverage lives in supabase/tests/rls_test.sql, run by
 * the `database` CI job.
 */
test.describe('admin surface (unauthenticated)', () => {
  test('renders the login form in place, without redirecting', async ({ page }) => {
    await page.goto('/admin');

    await expect(page.getByTestId('login-form-container')).toBeVisible();
    await expect(page).toHaveURL(/\/admin$/);
  });

  test('exposes no upload control', async ({ page }) => {
    await page.goto('/admin');
    await expect(page.locator('input[type="file"]')).toHaveCount(0);
  });

  test('exposes no photo or category management controls', async ({ page }) => {
    await page.goto('/admin');

    await expect(page.getByRole('button', { name: /publish|supprimer|delete/i })).toHaveCount(0);
    await expect(page.getByRole('tab')).toHaveCount(0);
  });

  test('is marked noindex', async ({ page }) => {
    await page.goto('/admin');
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
      'content',
      /noindex/
    );
  });
});
```

The last case depends on Task 15's `useDocumentMeta`; drop it if that task has not landed yet.

- [ ] **Step 2: Run them and check the other two specs**

```bash
pnpm e2e
```

`e2e/auth.spec.ts` and `e2e/gallery.spec.ts` have never run either. Read both, and correct any assertion that describes behaviour the app does not have. Do not weaken an assertion to make it pass — if the app is wrong, fix the app or delete the test with a note saying why.

- [ ] **Step 3: Add the e2e job to CI**

Append to `.github/workflows/ci.yml`:

```yaml
  e2e:
    name: end-to-end
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with:
          version: 8.15.9
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm exec playwright install --with-deps chromium
      - run: pnpm e2e
        env:
          VITE_SUPABASE_URL: http://localhost:8000
          VITE_SUPABASE_ANON_KEY: ci-placeholder
          VITE_IMAGE_TRANSFORM: 'false'
      - uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: playwright-report
          path: playwright-report/
          retention-days: 7
```

`playwright.config.ts:34-39` already starts the Vite dev server when `PLAYWRIGHT_BASE_URL` is unset, so no extra setup is needed. The tests above only exercise the unauthenticated surface, which does not need a live Supabase — `src/lib/supabase.ts:14-16` throws on missing env vars, hence the placeholders.

- [ ] **Step 4: Commit**

```bash
git add e2e .github/workflows/ci.yml
git commit -m "test(e2e): assert the real admin surface and run in ci"
```

### Task 18: Upgrade the dependencies that carry advisories

`pnpm audit --prod` reports six findings. `react-router-dom` resolves to 6.30.3, and one of its advisories — GHSA-jjmj-jmhj-qwj2, an open redirect leading to XSS — is listed with `Patched versions: <0.0.0`, meaning no fix exists anywhere on the 6.x line.

Reachability, stated honestly: every `<Link to=…>` in this app is a static literal (`SiteLayout.tsx:76,118,130,169,176`; `Footer.tsx:20,35,38`) and there is no `useNavigate` anywhere, so no user-controlled navigation target exists today. These are latent, not currently exploitable. They still block `pnpm audit --prod --audit-level high` in Task 16's CI, and "we shipped a dependency with an unpatchable advisory" is a poor answer in an interview.

**Files:**
- Modify: `package.json`, `pnpm-lock.yaml`
- Modify: `src/App.tsx` if any v7 API differs

**Interfaces:**
- Consumes: nothing.
- Produces: nothing.

- [ ] **Step 1: Record the current state**

```bash
pnpm audit --prod 2>&1 | tail -40
```

- [ ] **Step 2: Upgrade react-router**

```bash
pnpm add react-router-dom@^7.18.0
```

v7 is largely a drop-in for this app's four static routes. `BrowserRouter`, `Routes`, `Route` and `Link` keep their signatures. Run the type checker first, then the suite:

```bash
pnpm check && pnpm test
```

- [ ] **Step 3: Upgrade the dev toolchain**

The full audit (dev included) reports a critical in `vitest@2.1.9` and one in `vite@5.4.21`. These matter because `docker-compose.dev.yml:19-20` publishes the Vite dev server.

```bash
pnpm add -D vitest@latest @vitest/coverage-v8@latest vite@latest
pnpm check && pnpm test && pnpm build
```

A Vite major bump can change `manualChunks` behaviour — re-run the chunk check from Task 8 step 3 and confirm `react-vendor` is still split correctly.

- [ ] **Step 4: Verify the audit gate passes**

```bash
pnpm audit --prod --audit-level high
```

Expected: exit 0. `ws@8.20.0` may still appear at moderate; it arrives through `@supabase/supabase-js` as a Node-only transitive and is not in the browser bundle, so it does not affect the deployed SPA. If it blocks at `high`, document the reasoning in the commit body rather than silencing the audit.

- [ ] **Step 5: Verify the app in a browser**

```bash
pnpm build && pnpm preview
```

Click through home, filter, pagination, lightbox, contact and admin login. Router majors break navigation in ways type checking does not catch.

- [ ] **Step 6: Commit**

```bash
git add package.json pnpm-lock.yaml src/App.tsx
git commit -m "build(deps): upgrade react-router to 7 and refresh toolchain"
```

### Task 19: Finish the repository presentation

The README is already strong — badges, feature list, API table, project structure, environment table. Four things are missing that a reviewer notices immediately.

**Files:**
- Modify: `README.md`
- Create: `CONTRIBUTING.md`
- Create: `docs/screenshots/*.png`
- Create: `src/components/ErrorBoundary.tsx`
- Modify: `src/App.tsx`
- Modify: `docs/ARCHITECTURE.md`

**Interfaces:**
- Consumes: nothing.
- Produces: `ErrorBoundary` — a class component wrapping `<AppRoutes />`.

- [ ] **Step 1: Add an error boundary**

A render error currently produces a blank black page, and `PhotoGallery.tsx:80`'s recovery affordance is `window.location.reload()`. Create `src/components/ErrorBoundary.tsx`:

```tsx
import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

/**
 * Last line of defence. React has no hook equivalent for error boundaries, so
 * this stays a class component.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // No error-reporting service is wired up; the console is the only sink.
    console.error('Unhandled render error', error, info.componentStack);
  }

  render(): ReactNode {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-6 bg-black px-6 text-center">
        <h1 className="font-serif text-4xl text-white">Something went wrong</h1>
        <a href="/" className="border border-white px-6 py-2 text-sm uppercase tracking-wider text-white hover:bg-white hover:text-black transition-colors">
          Back to the portfolio
        </a>
      </div>
    );
  }
}
```

The copy is deliberately untranslated: `LanguageProvider` sits inside the boundary, so `t()` may itself be the thing that failed.

Wrap it in `src/App.tsx`:

```tsx
export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <LanguageProvider>
          <AppRoutes />
        </LanguageProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}
```

- [ ] **Step 2: Add screenshots**

A portfolio project shown in an interview is judged partly on how it looks, and the reviewer will not run it. Capture three 1600px-wide PNGs into `docs/screenshots/`: the home hero, the gallery grid with the lightbox open, and the admin photos tab. Reference them near the top of `README.md`, right after the "Live demo" line:

```markdown
| Home | Gallery | Admin |
|---|---|---|
| ![Home](docs/screenshots/home.png) | ![Gallery](docs/screenshots/gallery.png) | ![Admin](docs/screenshots/admin.png) |
```

- [ ] **Step 3: Write `CONTRIBUTING.md`**

```markdown
# Contributing

## Setup

    pnpm install
    cp .env.example .env      # fill in the values, or run node generate-keys.cjs
    docker compose -f docker-compose.dev.yml up -d
    pnpm dev

## Before opening a pull request

    pnpm check          # tsc --noEmit + eslint
    pnpm test           # unit tests
    pnpm test:rls       # RLS policy tests (requires Docker)
    pnpm e2e            # Playwright

## Commit messages

Conventional Commits, imperative mood, 72 characters maximum:

    <type>(<scope>): <summary>

Types: feat, fix, refactor, perf, docs, test, chore, build, ci, style, revert.
A body is required for breaking changes, security fixes and data migrations.

## Database changes

Every schema change is a new numbered file in `supabase/migrations/`. Never
edit an applied migration. Add an assertion to `supabase/tests/rls_test.sql`
for anything that touches a policy, a grant or a SECURITY DEFINER function.
```

- [ ] **Step 4: Correct the documentation that this plan invalidated**

- `README.md`'s Security section claims "No hardcoded secrets — all credentials are injected via environment variables; no fallback defaults in Docker Compose". True of the current tip, false of the history. Point it at `SECURITY.md` instead of asserting it.
- `README.md`'s project structure block lists `src/hooks/ # useAuth` — it now holds six hooks. Update it.
- `docs/ARCHITECTURE.md:171` documents an `henrard-imgproxy` service; add a line explaining the `VITE_IMAGE_TRANSFORM` flag and what happens when transforms are unavailable.
- `docs/SETUP.md` and `docs/DEPLOY.md` reference `supabase/setup-complete.sql`, deleted in Task 2. Task 2 step 5 covered this; verify no reference survives:

```bash
grep -rn "setup-complete\|init.sql\|nginx.conf" README.md docs/ || echo "no stale references"
```

- [ ] **Step 5: Note the deliberate non-goals**

Add a short section at the end of `README.md`. Stating what you knowingly did not do is a stronger signal than silence:

```markdown
## Known limitations

- **No server-side rendering.** Content is fetched client-side, so crawlers
  that do not execute JavaScript see an empty shell. Prerendering `/` and
  `/contact` is the natural next step.
- **Draft photos are protected by unguessable URLs, not by access control.**
  The storage bucket is public so that images stay CDN-cacheable; upload paths
  carry 128 bits of entropy. A private bucket with signed URLs would be
  stricter at the cost of image caching.
- **Gzip only.** `nginx:alpine` ships without `ngx_brotli`; adding Brotli would
  require a custom nginx image.
```

- [ ] **Step 6: Final verification**

```bash
pnpm check && pnpm test:coverage && pnpm build && pnpm test:rls && pnpm e2e
```

- [ ] **Step 7: Commit**

```bash
git add README.md CONTRIBUTING.md docs/ src/components/ErrorBoundary.tsx src/App.tsx
git commit -m "docs: add screenshots, contributing guide and error boundary"
```

---

## Self-Review

**Spec coverage.** Every confirmed finding maps to a task: the anonymous-to-admin chain (T3, T11), `set_hero_photo` (T3), `is_admin` NULL and search_path (T3), nginx headers (T10), `.dockerignore` and history leak (T1), Kong CORS and rate limiting (T11), storage enumeration (T11 step 3) and draft paths (T7), dead `getImageUrl` (T5, T7), zero-height lazy loading (T6), duplicated fonts (T8), broken `manualChunks` (T8), scroll re-renders and fetch races (T9), lightbox and keyboard access (T12), navigation semantics and contrast (T13), hardcoded strings (T14), SEO (T15), absent CI (T16), broken e2e (T17), router advisories (T18), missing error boundary and screenshots (T19).

**Deliberately deferred, with reasons.** Prerendering (needs a framework decision); Brotli (needs a custom nginx image); the two-bucket draft flow (the owner chose unguessable paths); `AccountSettings` password-strength rules beyond the existing 8-character minimum; replacing supabase-js on the public read path with plain `fetch`, which would drop ~46 kB gzipped from the public bundle but touches every test in `useHomeData.test.ts` — worth doing after Phase 2 settles.

**Known cross-task dependencies.** T8 → T10 (fonts before CSP). T3 → T9 step 8 (`set_hero_photo` must be authorized before the client calls it). T4 → T17 (the non-admin screen is asserted by an e2e test). T18 → T16 (the audit gate fails until the router is upgraded); if you run T16 first, mark the `audit` job `continue-on-error: true` and remove that line in T18.
