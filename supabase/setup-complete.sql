-- =========================================
-- HenrardVisuals - Setup Complet Supabase
-- Copie-colle ce fichier entier dans l'éditeur SQL
-- =========================================

-- ----------------------------------------
-- ÉTAPE 1: Extensions
-- ----------------------------------------
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ----------------------------------------
-- ÉTAPE 2: Tables
-- ----------------------------------------

-- Table photos
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
    is_hero BOOLEAN DEFAULT false,
    sort_order INTEGER DEFAULT 0,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_photos_category ON public.photos(category);
CREATE INDEX IF NOT EXISTS idx_photos_published ON public.photos(is_published);
CREATE INDEX IF NOT EXISTS idx_photos_sort ON public.photos(sort_order);
CREATE INDEX IF NOT EXISTS idx_photos_hero ON public.photos(is_hero);

-- Table categories
CREATE TABLE IF NOT EXISTS public.categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE,
    slug VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    cover_photo_id UUID REFERENCES public.photos(id) ON DELETE SET NULL,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_categories_slug ON public.categories(slug);
CREATE INDEX IF NOT EXISTS idx_categories_sort ON public.categories(sort_order);

-- Table site_settings
CREATE TABLE IF NOT EXISTS public.site_settings (
    key VARCHAR(100) PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ----------------------------------------
-- ÉTAPE 3: Données par défaut
-- ----------------------------------------
INSERT INTO public.site_settings (key, value) VALUES
    ('site_title', '"HenrardVisuals"'),
    ('site_description', '"Photography Portfolio"'),
    ('contact_email', '"contact@henrardvisuals.com"'),
    ('social_links', '{"instagram": "", "twitter": "", "linkedin": ""}'),
    ('profile_settings', '{
        "subtitle": "диво дьявола • Life is but a dream",
        "subtitle_en": "Life is but a dream",
        "stats": [
            {"value": "188", "unit": "6'' 2\"", "label": "TAILLE", "label_en": "HEIGHT"},
            {"value": "94", "unit": "37\"", "label": "POITRINE", "label_en": "CHEST"},
            {"value": "74", "unit": "29\"", "label": "TAILLE", "label_en": "WAIST"},
            {"value": "92", "unit": "36\"", "label": "HANCHES", "label_en": "HIPS"},
            {"value": "44", "unit": "EU", "label": "POINTURE", "label_en": "SHOES"}
        ],
        "attributes": "Cheveux: Blond Platine | Yeux: Bleus",
        "attributes_en": "Hair: Platinum Blonde | Eyes: Blue",
        "biography": "Alliant l''élégance parisienne à l''énergie brute de l''underground, Tristan incarne une dualité moderne.",
        "biography_en": "Blending Parisian editorial elegance with raw underground energy, Tristan embodies a modern duality."
    }')
ON CONFLICT (key) DO NOTHING;

-- ----------------------------------------
-- ÉTAPE 4: Triggers
-- ----------------------------------------
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_photos_updated ON public.photos;
CREATE TRIGGER on_photos_updated
    BEFORE UPDATE ON public.photos
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS on_settings_updated ON public.site_settings;
CREATE TRIGGER on_settings_updated
    BEFORE UPDATE ON public.site_settings
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- ----------------------------------------
-- ÉTAPE 5: Row Level Security (RLS)
-- ----------------------------------------
ALTER TABLE public.photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

-- Policies pour photos
DROP POLICY IF EXISTS "Photos publiées visibles par tous" ON public.photos;
CREATE POLICY "Photos publiées visibles par tous" 
    ON public.photos FOR SELECT 
    USING (is_published = true);

DROP POLICY IF EXISTS "Utilisateurs authentifiés gèrent les photos" ON public.photos;
CREATE POLICY "Utilisateurs authentifiés gèrent les photos" 
    ON public.photos FOR ALL 
    TO authenticated 
    USING (true) 
    WITH CHECK (true);

-- Policies pour categories
DROP POLICY IF EXISTS "Catégories visibles par tous" ON public.categories;
CREATE POLICY "Catégories visibles par tous" 
    ON public.categories FOR SELECT 
    USING (true);

DROP POLICY IF EXISTS "Utilisateurs authentifiés gèrent les catégories" ON public.categories;
CREATE POLICY "Utilisateurs authentifiés gèrent les catégories" 
    ON public.categories FOR ALL 
    TO authenticated 
    USING (true) 
    WITH CHECK (true);

-- Policies pour site_settings
DROP POLICY IF EXISTS "Paramètres visibles par tous" ON public.site_settings;
CREATE POLICY "Paramètres visibles par tous" 
    ON public.site_settings FOR SELECT 
    USING (true);

DROP POLICY IF EXISTS "Utilisateurs authentifiés gèrent les paramètres" ON public.site_settings;
CREATE POLICY "Utilisateurs authentifiés gèrent les paramètres" 
    ON public.site_settings FOR ALL 
    TO authenticated 
    USING (true) 
    WITH CHECK (true);

-- ----------------------------------------
-- ÉTAPE 6: Storage Bucket
-- ----------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'photos',
    'photos',
    true,
    52428800,
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET
    public = true,
    file_size_limit = 52428800,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

-- Policies Storage
DROP POLICY IF EXISTS "Images publiques accessibles à tous" ON storage.objects;
CREATE POLICY "Images publiques accessibles à tous"
ON storage.objects FOR SELECT
USING (bucket_id = 'photos');

DROP POLICY IF EXISTS "Utilisateurs authentifiés peuvent uploader" ON storage.objects;
CREATE POLICY "Utilisateurs authentifiés peuvent uploader"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'photos');

DROP POLICY IF EXISTS "Utilisateurs authentifiés peuvent modifier" ON storage.objects;
CREATE POLICY "Utilisateurs authentifiés peuvent modifier"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'photos');

DROP POLICY IF EXISTS "Utilisateurs authentifiés peuvent supprimer" ON storage.objects;
CREATE POLICY "Utilisateurs authentifiés peuvent supprimer"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'photos');

-- =========================================
-- ✅ TERMINÉ !
-- Tu peux maintenant:
-- 1. Aller dans Authentication > Users
-- 2. Créer un utilisateur admin
-- 3. Te connecter sur https://henrardvisuals.com/admin
-- =========================================
