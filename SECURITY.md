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
`JWT_SECRET`, a default `POSTGRES_PASSWORD`, and a seed admin password. The
`JWT_SECRET` currently deployed to production differs from that leaked demo
value. Rotation of the admin account password and the remaining credentials
(`POSTGRES_PASSWORD`, `ANON_KEY`, `SERVICE_ROLE_KEY`) has not yet been
confirmed and is tracked as a pending operator task in `OPERATOR-ACTIONS.md`.
History is retained deliberately; the commits are part of the project's
development record.
