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
