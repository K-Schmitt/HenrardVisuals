-- =========================================
-- HenrardVisuals - Migration Initiale
-- À exécuter dans ton Supabase Coolify
-- via l'éditeur SQL du dashboard Supabase
-- =========================================

-- ----------------------------------------
-- Extensions requises
-- ----------------------------------------
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ----------------------------------------
-- Table: photos
-- Stocke les informations des photos
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
    is_hero BOOLEAN DEFAULT false,
    sort_order INTEGER DEFAULT 0,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour les requêtes fréquentes
CREATE INDEX IF NOT EXISTS idx_photos_category ON public.photos(category);
CREATE INDEX IF NOT EXISTS idx_photos_published ON public.photos(is_published);
CREATE INDEX IF NOT EXISTS idx_photos_sort ON public.photos(sort_order);
CREATE INDEX IF NOT EXISTS idx_photos_hero ON public.photos(is_hero);

-- Commentaires
COMMENT ON TABLE public.photos IS 'Photos du portfolio';
COMMENT ON COLUMN public.photos.is_hero IS 'Photo principale affichée en héro';
COMMENT ON COLUMN public.photos.storage_path IS 'Chemin dans Supabase Storage';

-- ----------------------------------------
-- Table: categories
-- Catégories pour organiser les photos
-- ----------------------------------------
CREATE TABLE IF NOT EXISTS public.categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE,
    slug VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    cover_photo_id UUID REFERENCES public.photos(id) ON DELETE SET NULL,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index
CREATE INDEX IF NOT EXISTS idx_categories_slug ON public.categories(slug);
CREATE INDEX IF NOT EXISTS idx_categories_sort ON public.categories(sort_order);

-- Commentaires
COMMENT ON TABLE public.categories IS 'Catégories de photos';

-- ----------------------------------------
-- Table: site_settings
-- Paramètres du site (clé-valeur JSON)
-- ----------------------------------------
CREATE TABLE IF NOT EXISTS public.site_settings (
    key VARCHAR(100) PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Commentaires
COMMENT ON TABLE public.site_settings IS 'Paramètres configurables du site';

-- ----------------------------------------
-- Paramètres par défaut
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
-- Fonction: Mise à jour automatique updated_at
-- ----------------------------------------
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour photos
DROP TRIGGER IF EXISTS on_photos_updated ON public.photos;
CREATE TRIGGER on_photos_updated
    BEFORE UPDATE ON public.photos
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- Trigger pour site_settings
DROP TRIGGER IF EXISTS on_settings_updated ON public.site_settings;
CREATE TRIGGER on_settings_updated
    BEFORE UPDATE ON public.site_settings
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- ----------------------------------------
-- Row Level Security (RLS)
-- ----------------------------------------

-- Activer RLS sur toutes les tables
ALTER TABLE public.photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------
-- Policies pour photos
-- ----------------------------------------

-- Lecture publique des photos publiées
CREATE POLICY "Photos publiées visibles par tous" 
    ON public.photos 
    FOR SELECT 
    USING (is_published = true);

-- CRUD complet pour utilisateurs authentifiés
CREATE POLICY "Utilisateurs authentifiés gèrent les photos" 
    ON public.photos 
    FOR ALL 
    TO authenticated 
    USING (true) 
    WITH CHECK (true);

-- ----------------------------------------
-- Policies pour categories
-- ----------------------------------------

-- Lecture publique
CREATE POLICY "Catégories visibles par tous" 
    ON public.categories 
    FOR SELECT 
    USING (true);

-- CRUD pour authentifiés
CREATE POLICY "Utilisateurs authentifiés gèrent les catégories" 
    ON public.categories 
    FOR ALL 
    TO authenticated 
    USING (true) 
    WITH CHECK (true);

-- ----------------------------------------
-- Policies pour site_settings
-- ----------------------------------------

-- Lecture publique
CREATE POLICY "Paramètres visibles par tous" 
    ON public.site_settings 
    FOR SELECT 
    USING (true);

-- CRUD pour authentifiés
CREATE POLICY "Utilisateurs authentifiés gèrent les paramètres" 
    ON public.site_settings 
    FOR ALL 
    TO authenticated 
    USING (true) 
    WITH CHECK (true);

-- =========================================
-- FIN DE LA MIGRATION
-- =========================================
