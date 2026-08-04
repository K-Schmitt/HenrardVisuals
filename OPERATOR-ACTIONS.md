# Operator Actions

Running list of steps that touch the live production deployment and must be
performed by hand — they cannot be run from within this repository or by an
automated agent. Later hardening tasks append their own items below. Check
an item off only once it has actually been executed against production, not
when the code that motivates it merges.

- [ ] **Rotate leaked credentials** (Task 1: lock the build context and
  rotate every leaked credential). Commits `1556e511` through `f59755c`
  contained the public Supabase demo `JWT_SECRET`, a default
  `POSTGRES_PASSWORD`, and a seed admin password — see `SECURITY.md`,
  "Known historical exposure". The deployed `JWT_SECRET` has already been
  confirmed to differ from that leaked demo value, but the seeded admin
  password (`Admin123!`) may still be in use. Follow `SECURITY.md`'s
  "Credential rotation" runbook (steps 1–6) against production: generate a
  new key set, update `POSTGRES_PASSWORD`, `JWT_SECRET`, `ANON_KEY`,
  `SERVICE_ROLE_KEY`, and `VITE_SUPABASE_ANON_KEY` in Coolify, change the
  Postgres role password, rotate the admin password through GoTrue,
  redeploy, and confirm the old anon key is rejected (`401`).

- [ ] **Apply `005_rls_hardening.sql` to the live database** (Task 3: close
  the anonymous-to-content-admin chain). The migration only reaches a new
  deployment automatically; an already-initialised database still carries
  the permissive `FOR ALL ... USING (true)` policies from the old
  `init.sql`, an `is_admin()` that returns `NULL` for a claimless JWT, and
  a `set_hero_photo()` that any unauthenticated caller can invoke. The file
  is idempotent, so it is safe to replay:

  ```bash
  psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/migrations/005_rls_hardening.sql
  ```

  Run it while the full stack is up, not during a cold boot — its storage
  section skips itself (with a `NOTICE`) whenever `storage.objects` does
  not yet exist.

- [ ] **Confirm the hero RPC is closed from outside** (Task 3). After the
  migration is applied, probe the public API with the anon key:

  ```bash
  curl -s -o /dev/null -w '%{http_code}\n' \
    -X POST "$API_EXTERNAL_URL/rest/v1/rpc/set_hero_photo" \
    -H "apikey: $ANON_KEY" -H 'Content-Type: application/json' \
    -d '{"target_id":"00000000-0000-0000-0000-000000000000"}'
  ```

  Expected: `404` (PostgREST hides functions the role cannot execute) or
  `403`. Before this task it returned `200` and wiped the homepage hero
  image, repeatably. If it still returns `200`, the migration did not
  apply — do not treat the item above as done.

- [ ] **Close public signup on the live GoTrue** (Task 11). Read from the
  Coolify environment on 2026-08-04, the deployed app had
  `DISABLE_SIGNUP=false`, `ENABLE_EMAIL_SIGNUP=true` **and**
  `ENABLE_EMAIL_AUTOCONFIRM=true` at the same time: anyone can register a
  confirmed account right now. After Tasks 3 and 4 such an account can write
  nothing and sees the not-authorised screen, but it should not be able to
  register at all. Set `DISABLE_SIGNUP=true` and
  `ENABLE_EMAIL_AUTOCONFIRM=false` in Coolify and redeploy, then confirm:

  ```bash
  curl -s -o /dev/null -w '%{http_code}\n' -X POST "$API_EXTERNAL_URL/auth/v1/signup" \
    -H "apikey: $ANON_KEY" -H 'Content-Type: application/json' \
    -d '{"email":"probe@example.com","password":"probe-probe-probe"}'
  ```

  Expected: `422` (`signup_disabled`). While in that screen, delete the
  second, empty copy of `SERVICE_ROLE_KEY`, `VITE_SUPABASE_URL`, `JWT_SECRET`
  and `ANON_KEY` — the app's variable list carries two of each, and only the
  populated one is doing anything.

- [ ] **Repoint PostgREST at the `authenticator` role** (Task 11). Both
  compose files now connect PostgREST as `authenticator` rather than the
  `postgres` superuser, because PostgREST runs `SET LOCAL ROLE` from the
  JWT's `role` claim and a superuser connection lets that succeed for any
  role, `service_role` (BYPASSRLS) included. `005` creates the role;
  `AUTHENTICATOR_PASSWORD` must be set and the role given that password:

  ```sql
  ALTER ROLE authenticator WITH LOGIN PASSWORD '<AUTHENTICATOR_PASSWORD>';
  ```

  On the Coolify-managed Supabase the PostgREST connection string may not be
  editable. If it is not, this control cannot be applied there — record that
  rather than assuming it is closed.

- [ ] **Verify the admin panel can still write** (Task 3). `005` drops the
  permissive policies that were, in practice, the only reason authenticated
  writes succeeded, and leaves `public.is_admin()` as the sole gate. That
  predicate reads `auth.jwt()`, which GoTrue installs through its own
  migration. After applying `005`, sign in to `/admin` and confirm a photo
  edit, a category change and a hero switch all still succeed. If they fail
  with `function auth.jwt() does not exist`, GoTrue has not run its
  migrations against this database and must be started before the admin
  panel will work.
