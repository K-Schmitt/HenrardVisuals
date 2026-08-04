#!/usr/bin/env bash
# Applies every migration to a disposable Postgres, then runs the RLS
# assertions. Requires Docker. Exits non-zero on the first failure.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

CONTAINER="henrard-rls-test-$$"
cleanup() { docker rm -f "$CONTAINER" >/dev/null 2>&1 || true; }
trap cleanup EXIT

docker run -d --name "$CONTAINER" \
  -e POSTGRES_PASSWORD=test -e POSTGRES_DB=henrard_test \
  postgres:15-alpine >/dev/null

psql_run() {
  docker exec -i "$CONTAINER" \
    psql -U postgres -d henrard_test -v ON_ERROR_STOP=1 -q < "$1"
}

printf 'waiting for postgres'
ready=0
for _ in $(seq 1 60); do
  # pg_isready can answer during initdb's temporary server, so require a
  # real query against the target database before declaring the box up.
  if docker exec "$CONTAINER" pg_isready -U postgres -d henrard_test >/dev/null 2>&1 &&
     docker exec "$CONTAINER" psql -U postgres -d henrard_test -c 'SELECT 1' >/dev/null 2>&1; then
    ready=1
    break
  fi
  printf '.'
  sleep 1
done
echo
if [ "$ready" -ne 1 ]; then
  echo "postgres never became ready" >&2
  docker logs "$CONTAINER" >&2 || true
  exit 1
fi

echo "--- phase 1: clean install ---"
# 000 creates the roles that the stubs grant to, so it runs first.
psql_run "$ROOT/supabase/migrations/000_bootstrap.sql"
psql_run "$ROOT/supabase/tests/fixtures/00_stubs.sql"
for f in "$ROOT"/supabase/migrations/*.sql; do
  case "$(basename "$f")" in
    000_*) continue ;; # applied above, before the stubs
  esac
  echo "applying $(basename "$f")"
  psql_run "$f"
done

echo "running assertions"
psql_run "$ROOT/supabase/tests/rls_test.sql"

echo "--- phase 2: legacy database upgrade + idempotency ---"
# Restore the pre-hardening state an already-deployed database still
# carries, then apply 005 a second time. This exercises the cleanup loop
# in 005 and proves the migration is safe to replay.
psql_run "$ROOT/supabase/tests/fixtures/01_legacy_state.sql"
echo "re-applying 005_rls_hardening.sql"
psql_run "$ROOT/supabase/migrations/005_rls_hardening.sql"

echo "re-running assertions"
psql_run "$ROOT/supabase/tests/rls_test.sql"

echo "RLS tests passed"
