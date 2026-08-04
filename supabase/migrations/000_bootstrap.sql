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
