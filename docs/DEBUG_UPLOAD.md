# 🐛 Débogage Upload d'Images

## Problème
Upload infini lors de l'ajout d'images depuis le panel admin.

## Étapes de diagnostic

### 1. Vérifier les logs du navigateur
Ouvrir la console développeur (F12) et observer les logs lors de l'upload:
- `📁 Processing files:` - Confirme que les fichiers sont détectés
- `🚀 Starting upload:` - Upload commence vers Supabase
- `📦 Upload response:` - Réponse de Supabase (succès ou erreur)
- `💾 Saving photo to database:` - Sauvegarde en BDD
- `✅ Upload complete:` - Fin du processus

### 2. Vérifier la configuration Supabase

#### A. Bucket Storage existe-t-il?
Aller dans Supabase Dashboard → Storage → Buckets
- Le bucket `photos` doit exister
- Il doit être configuré comme PUBLIC

#### B. Policies Storage
Vérifier que ces policies existent dans Storage:
```sql
-- Lecture publique
CREATE POLICY "Images publiques accessibles à tous"
ON storage.objects FOR SELECT
USING (bucket_id = 'photos');

-- Upload pour authentifiés
CREATE POLICY "Utilisateurs authentifiés peuvent uploader"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'photos');
```

#### C. Variables d'environnement
Dans Coolify, vérifier que ces variables sont définies:
- `VITE_SUPABASE_URL` → URL de votre Supabase (ex: https://xxx.supabase.co)
- `VITE_SUPABASE_ANON_KEY` → Clé publique anon

### 3. Vérifier la table photos

La table `photos` doit exister avec ces colonnes:
```sql
CREATE TABLE public.photos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    storage_path VARCHAR(500) NOT NULL,
    file_size BIGINT,
    is_published BOOLEAN DEFAULT false,
    sort_order INTEGER DEFAULT 0,
    category VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 4. Vérifier les permissions de la table

Dans Supabase Dashboard → Authentication → Policies:
```sql
-- Lecture pour tous
CREATE POLICY "Photos publiées accessibles à tous"
ON public.photos FOR SELECT
USING (is_published = true);

-- CRUD pour authentifiés
CREATE POLICY "Utilisateurs authentifiés peuvent gérer les photos"
ON public.photos FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);
```

## Solutions courantes

### Erreur: "new row violates row-level security policy"
→ Les policies RLS ne sont pas correctement configurées
→ Solution: Exécuter les policies ci-dessus dans SQL Editor

### Erreur: "Bucket not found"
→ Le bucket 'photos' n'existe pas
→ Solution: Exécuter le fichier `supabase/migrations/002_storage_bucket.sql`

### Erreur: "Invalid JWT" ou "Not authenticated"
→ L'utilisateur n'est pas connecté ou le token a expiré
→ Solution: Se reconnecter via /admin

### Upload bloqué sans erreur
→ Problème CORS ou réseau
→ Vérifier dans Network tab si les requêtes vers Supabase aboutissent
→ Vérifier que l'URL Supabase est accessible depuis le navigateur

## Script de diagnostic rapide

Exécuter dans la console du navigateur (sur la page /admin):
```javascript
// Tester la connexion Supabase
const testSupabase = async () => {
  const { supabase } = await import('./lib/supabase');
  
  // Tester l'auth
  const { data: { user } } = await supabase.auth.getUser();
  console.log('User:', user);
  
  // Tester le bucket
  const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
  console.log('Buckets:', buckets, bucketsError);
  
  // Tester l'accès à la table photos
  const { data: photos, error: photosError } = await supabase.from('photos').select('*').limit(1);
  console.log('Photos:', photos, photosError);
};
testSupabase();
```

## Contact
Si le problème persiste, fournir:
1. Les logs de la console (F12)
2. Les erreurs dans l'onglet Network
3. La configuration Supabase (sans les clés secrètes!)
