-- =========================================
-- HenrardVisuals - Textes éditoriaux et coordonnées
--
-- Les phrases éditoriales (« Paris — disponible à l'international », le chapô
-- « Pour un casting… », la signature du pied de page…) vivaient dans les
-- fichiers i18n, donc figées au build. Elles passent en base pour devenir
-- éditables depuis l'onglet « content » de l'administration.
--
-- Le chrome d'interface (libellés de boutons, filtres, états vides, libellés
-- d'accessibilité) reste volontairement dans src/i18n : un champ vidé par
-- erreur y priverait un contrôle de son nom accessible.
-- =========================================

-- ----------------------------------------
-- 1. site_copy : les phrases, bilingues
-- ----------------------------------------
-- Le front fusionne cette valeur par-dessus ses propres constantes
-- (src/constants/siteContentDefaults.ts), champ par champ. Une ligne absente,
-- partielle ou malformée dégrade donc vers le texte livré plutôt que vers du
-- vide — ce qui rend cette insertion pratique, pas indispensable.
INSERT INTO public.site_settings (key, value) VALUES (
    'site_copy',
    '{
        "heroAvailability": {
            "fr": "Paris — disponible à l''international",
            "en": "Paris — available internationally"
        },
        "heroSpecsTitle":   { "fr": "Fiche technique", "en": "Measurements" },
        "contactLead": {
            "fr": "Pour un casting,\nun essayage, un book.",
            "en": "For a casting, a fitting,\na book."
        },
        "contactBase":    { "fr": "Paris, FR", "en": "Paris, FR" },
        "contactTagline": { "fr": "Travaillons ensemble", "en": "Let''s work together" },
        "contactDescription": {
            "fr": "Pour toute demande de collaboration, projet photographique ou booking, n''hésitez pas à me contacter.",
            "en": "For any collaboration request, photography project, or booking inquiry, feel free to reach out."
        },
        "contactResponseTime": { "fr": "Réponse sous 24-48h", "en": "Response within 24-48h" },
        "footerSignature": {
            "fr": "L''essentiel, sans démonstration",
            "en": "The essential, without demonstration"
        },
        "footerTagline": {
            "fr": "L''essentiel, sans démonstration - l''image au service de l''art.",
            "en": "The essential, without demonstration - the image at the service of art."
        }
    }'::jsonb
)
ON CONFLICT (key) DO NOTHING;

-- ----------------------------------------
-- 2. contact_email / social_links : corriger 001
-- ----------------------------------------
-- Ces deux clés existent depuis la migration initiale mais n'ont jamais été
-- lues par le front, et portent des valeurs de remplissage : une adresse
-- « contact@henrardvisuals.com » qui n'existe pas, et des réseaux vides.
-- Maintenant que le front les lit, il faut qu'elles portent le vrai contenu.
--
-- Le WHERE limite la reprise aux valeurs de remplissage : si quelqu'un a déjà
-- saisi une vraie adresse depuis le panneau, cette migration ne la piétine pas.
UPDATE public.site_settings
SET value = '"henrard.tristan@proton.me"'::jsonb
WHERE key = 'contact_email'
  AND value = '"contact@henrardvisuals.com"'::jsonb;

UPDATE public.site_settings
SET value = '{
        "instagram": "https://www.instagram.com/dyavol_litso",
        "linkedin":  "https://www.linkedin.com/in/tristan-henrard-2688a6198/"
    }'::jsonb
WHERE key = 'social_links'
  AND COALESCE(value ->> 'instagram', '') = ''
  AND COALESCE(value ->> 'linkedin', '') = '';

-- Pour une base créée avant 001 ou dont les lignes auraient été supprimées.
INSERT INTO public.site_settings (key, value) VALUES
    ('contact_email', '"henrard.tristan@proton.me"'),
    ('social_links', '{
        "instagram": "https://www.instagram.com/dyavol_litso",
        "linkedin":  "https://www.linkedin.com/in/tristan-henrard-2688a6198/"
    }')
ON CONFLICT (key) DO NOTHING;

-- Aucun GRANT ni policy à rejouer : 005 accorde les droits au niveau table et
-- site_settings est déjà lisible par anon, écrivable par les seuls admins.

-- =========================================
-- FIN DE LA MIGRATION
-- =========================================
