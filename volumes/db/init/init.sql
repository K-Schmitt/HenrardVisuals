-- =========================================
-- HenrardVisuals Database Initialization
-- Supabase Schema Setup
-- =========================================

-- Create extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ----------------------------------------
-- Auth Schema (for GoTrue)
-- ----------------------------------------
CREATE SCHEMA IF NOT EXISTS auth;

-- Grant permissions
GRANT USAGE ON SCHEMA auth TO postgres;
GRANT ALL ON ALL TABLES IN SCHEMA auth TO postgres;
GRANT ALL ON ALL SEQUENCES IN SCHEMA auth TO postgres;

-- ----------------------------------------
-- Storage Schema (for Supabase Storage)
-- ----------------------------------------
CREATE SCHEMA IF NOT EXISTS storage;

-- Grant permissions
GRANT USAGE ON SCHEMA storage TO postgres;
GRANT ALL ON ALL TABLES IN SCHEMA storage TO postgres;
GRANT ALL ON ALL SEQUENCES IN SCHEMA storage TO postgres;
GRANT ALL ON ALL ROUTINES IN SCHEMA storage TO postgres;

-- ----------------------------------------
-- Create Roles
-- ----------------------------------------
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

-- Grant schema access to roles
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

-- ----------------------------------------
-- Photos Table
-- ----------------------------------------
CREATE TABLE IF NOT EXISTS public.photos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100),
    storage_path VARCHAR(500) NOT NULL,
    thumbnail_path VARCHAR(500),
    width INTEGER,
    height INTEGER,
    file_size BIGINT,
    mime_type VARCHAR(100),
    is_published BOOLEAN DEFAULT false,
    sort_order INTEGER DEFAULT 0,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_photos_category ON public.photos(category);
CREATE INDEX IF NOT EXISTS idx_photos_published ON public.photos(is_published);
CREATE INDEX IF NOT EXISTS idx_photos_sort ON public.photos(sort_order);

-- Enable RLS
ALTER TABLE public.photos ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Public photos are viewable by everyone" 
    ON public.photos FOR SELECT 
    USING (is_published = true);

CREATE POLICY "Authenticated users can manage photos" 
    ON public.photos FOR ALL 
    TO authenticated 
    USING (true) 
    WITH CHECK (true);

-- ----------------------------------------
-- Categories Table
-- ----------------------------------------
CREATE TABLE IF NOT EXISTS public.categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE,
    slug VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    cover_photo_id UUID REFERENCES public.photos(id),
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_categories_slug ON public.categories(slug);

-- Enable RLS
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Categories are viewable by everyone" 
    ON public.categories FOR SELECT 
    USING (true);

CREATE POLICY "Authenticated users can manage categories" 
    ON public.categories FOR ALL 
    TO authenticated 
    USING (true) 
    WITH CHECK (true);

-- ----------------------------------------
-- Site Settings Table
-- ----------------------------------------
CREATE TABLE IF NOT EXISTS public.site_settings (
    key VARCHAR(100) PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Settings are viewable by everyone" 
    ON public.site_settings FOR SELECT 
    USING (true);

CREATE POLICY "Authenticated users can manage settings" 
    ON public.site_settings FOR ALL 
    TO authenticated 
    USING (true) 
    WITH CHECK (true);

-- Insert default settings
INSERT INTO public.site_settings (key, value) VALUES
    ('site_title', '"HenrardVisuals"'),
    ('site_description', '"Photography Portfolio"'),
    ('contact_email', '"contact@henrardvisuals.com"'),
    ('social_links', '{"instagram": "", "twitter": "", "linkedin": ""}')
ON CONFLICT (key) DO NOTHING;

-- ----------------------------------------
-- Grant Permissions
-- ----------------------------------------
GRANT SELECT ON public.photos TO anon;
GRANT SELECT ON public.categories TO anon;
GRANT SELECT ON public.site_settings TO anon;

GRANT ALL ON public.photos TO authenticated;
GRANT ALL ON public.categories TO authenticated;
GRANT ALL ON public.site_settings TO authenticated;

GRANT ALL ON public.photos TO service_role;
GRANT ALL ON public.categories TO service_role;
GRANT ALL ON public.site_settings TO service_role;

-- ----------------------------------------
-- Functions
-- ----------------------------------------

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for photos
CREATE TRIGGER on_photos_updated
    BEFORE UPDATE ON public.photos
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- Trigger for site_settings
CREATE TRIGGER on_settings_updated
    BEFORE UPDATE ON public.site_settings
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();
