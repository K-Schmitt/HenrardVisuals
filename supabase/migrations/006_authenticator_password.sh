#!/bin/sh
# Sets the password for the `authenticator` role created by 005.
#
# This is a shell step rather than SQL because the password must come from the
# environment: writing it into a migration would commit a credential, and the
# migrations are replayed by hand and by the RLS test harness, neither of which
# should be able to overwrite a live one.
#
# The Postgres entrypoint runs every *.sh and *.sql in
# /docker-entrypoint-initdb.d in name order, so this runs immediately after
# 005_rls_hardening.sql on a first boot. It is a no-op on later boots, like
# every other file here.
set -eu

if [ -z "${AUTHENTICATOR_PASSWORD:-}" ]; then
  echo "006_authenticator_password.sh: AUTHENTICATOR_PASSWORD is not set." >&2
  echo "  PostgREST connects as this role; without a password it cannot" >&2
  echo "  authenticate and the API will not serve a single request." >&2
  exit 1
fi

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<SQL
ALTER ROLE authenticator WITH LOGIN PASSWORD '${AUTHENTICATOR_PASSWORD}';
SQL

echo "006_authenticator_password.sh: authenticator password set"
