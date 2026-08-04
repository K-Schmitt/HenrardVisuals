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

-- =========================================
-- Base storage tables
-- =========================================
-- supabase/storage-api ships `select 1` as its 0001-initialmigration: it
-- assumes the platform's own Postgres image already provides storage.buckets
-- and storage.objects, which postgres:15-alpine does not. Its second
-- migration, 0002-pathtoken-column, then does
--   alter table storage.objects add column path_tokens ...
-- which fails with `relation "storage.objects" does not exist`, rolls back,
-- and takes the service into a permanent crash loop on every cold boot.
--
-- These are therefore the pre-0002 shape of the upstream tables. Everything
-- after that — path_tokens, the size functions, owner_id, versioning — is
-- added by storage-api's own migrations once it can start. IF NOT EXISTS
-- throughout, so this is a no-op against a managed Supabase.
CREATE TABLE IF NOT EXISTS storage.buckets (
  id         text PRIMARY KEY,
  name       text NOT NULL,
  owner      uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS bname ON storage.buckets (name);

CREATE TABLE IF NOT EXISTS storage.objects (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bucket_id        text REFERENCES storage.buckets (id),
  name             text,
  owner            uuid,
  created_at       timestamptz DEFAULT now(),
  updated_at       timestamptz DEFAULT now(),
  last_accessed_at timestamptz DEFAULT now(),
  metadata         jsonb
);
CREATE UNIQUE INDEX IF NOT EXISTS bucketid_objname ON storage.objects (bucket_id, name);
CREATE INDEX IF NOT EXISTS name_prefix_search ON storage.objects (name text_pattern_ops);

ALTER TABLE storage.buckets ENABLE ROW LEVEL SECURITY;
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- storage-api connects as the superuser for its own bookkeeping, but every
-- request PostgREST proxies arrives as anon or authenticated.
GRANT USAGE ON SCHEMA storage TO anon, authenticated, service_role;
GRANT SELECT ON storage.buckets TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON storage.objects TO anon, authenticated, service_role;
