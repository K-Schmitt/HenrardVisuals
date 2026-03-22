# 📋 Audit du Projet HenrardVisuals

**Date de l'audit:** 2 février 2026  
**Version:** 1.0.0  
**Type:** Portfolio Photographique Professionnel

---

## 📖 Résumé Exécutif

**HenrardVisuals** est une application web moderne de type **portfolio photographique** destinée à présenter le travail d'un photographe/mannequin. Le projet utilise une architecture conteneurisée avec **Supabase self-hosted** pour le backend et **React/TypeScript** pour le frontend.

### Points Clés
- ✅ Architecture moderne et scalable
- ✅ Stack technique cohérente et à jour
- ✅ Sécurité via Row Level Security (RLS)
- ✅ Déploiement Docker complet
- ✅ Support multi-langue (FR/EN)

---

## 🏗️ Architecture Générale

### Vue d'Ensemble

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT (Browser)                         │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                      NGINX (Reverse Proxy)                       │
│                      Port 80/443 - SSL                           │
└─────────────────────────────────────────────────────────────────┘
                    │                           │
                    ▼                           ▼
┌─────────────────────────────┐   ┌─────────────────────────────────┐
│      React/Vite App         │   │      Kong API Gateway           │
│      Port 5173              │   │      Port 8000                  │
│      - TypeScript           │   │      - Rate Limiting            │
│      - Tailwind CSS         │   │      - Auth Routing             │
│      - React Router         │   │      - CORS                     │
└─────────────────────────────┘   └─────────────────────────────────┘
                                               │
                    ┌──────────────────────────┼──────────────────────────┐
                    │                          │                          │
                    ▼                          ▼                          ▼
         ┌─────────────────┐        ┌─────────────────┐        ┌─────────────────┐
         │    GoTrue       │        │   PostgREST     │        │  Storage API    │
         │    Port 9999    │        │   Port 3000     │        │   Port 5000     │
         │    Auth/JWT     │        │   REST API      │        │   Fichiers      │
         └─────────────────┘        └─────────────────┘        └─────────────────┘
                    │                          │                          │
                    └──────────────────────────┼──────────────────────────┘
                                               │
                                               ▼
                              ┌─────────────────────────────────┐
                              │         PostgreSQL 15           │
                              │         Port 5432               │
                              │    - Photos, Categories         │
                              │    - Auth Users                 │
                              │    - Site Settings              │
                              └─────────────────────────────────┘
```

### Services Docker (docker-compose.coolify.yml)

| Service | Image | Port | Rôle |
|---------|-------|------|------|
| `app` | Custom (Vite/Nginx) | 80 | Frontend React |
| `db` | postgres:15-alpine | 5432 | Base de données |
| `auth` | supabase/gotrue:v2.132.3 | 9999 | Authentification JWT |
| `rest` | postgrest/postgrest:v11.2.2 | 3000 | API REST auto-générée |
| `storage` | supabase/storage-api:v0.43.11 | 5000 | Stockage fichiers |
| `imgproxy` | darthsim/imgproxy:v3.8.0 | 8080 | Transformation images |
| `meta` | supabase/postgres-meta:v0.68.0 | 8080 | Métadonnées DB |
| `kong` | Custom (Kong) | 8000 | API Gateway |

---

## 📦 Dépendances

### Frontend (package.json)

#### Dépendances de Production

| Package | Version | Description |
|---------|---------|-------------|
| `react` | ^18.2.0 | Bibliothèque UI |
| `react-dom` | ^18.2.0 | Rendu DOM React |
| `react-router-dom` | ^6.21.0 | Routage SPA |
| `@supabase/supabase-js` | ^2.39.0 | Client Supabase |

#### Dépendances de Développement

| Package | Version | Description |
|---------|---------|-------------|
| `typescript` | ^5.3.3 | Typage statique |
| `vite` | ^5.0.10 | Build tool & dev server |
| `@vitejs/plugin-react` | ^4.2.1 | Plugin React pour Vite |
| `tailwindcss` | ^3.4.0 | Framework CSS utility-first |
| `postcss` | ^8.4.32 | Transformation CSS |
| `autoprefixer` | ^10.4.16 | Préfixes CSS automatiques |
| `eslint` | ^9.39.2 | Linter JavaScript/TypeScript |
| `@typescript-eslint/*` | ^8.49.0 | ESLint pour TypeScript |
| `prettier` | ^3.7.4 | Formatteur de code |

### Serveur Upload (server/package.json)

| Package | Version | Description |
|---------|---------|-------------|
| `express` | ^4.18.2 | Framework serveur HTTP |
| `multer` | ^1.4.5-lts.1 | Gestion uploads multipart |
| `cors` | ^2.8.5 | Middleware CORS |

---

## 🗄️ Schéma de Base de Données

### Tables Principales

#### `photos`
```sql
id              UUID PRIMARY KEY
title           VARCHAR(255) NOT NULL
description     TEXT
category        VARCHAR(100)
storage_path    VARCHAR(500) NOT NULL
thumbnail_path  VARCHAR(500)
width           INTEGER
height          INTEGER
file_size       BIGINT
mime_type       VARCHAR(100)
is_published    BOOLEAN DEFAULT false
is_hero         BOOLEAN
sort_order      INTEGER DEFAULT 0
metadata        JSONB DEFAULT '{}'
created_at      TIMESTAMPTZ DEFAULT NOW()
updated_at      TIMESTAMPTZ DEFAULT NOW()
```

#### `categories`
```sql
id              UUID PRIMARY KEY
name            VARCHAR(100) NOT NULL UNIQUE
slug            VARCHAR(100) NOT NULL UNIQUE
description     TEXT
cover_photo_id  UUID REFERENCES photos(id)
sort_order      INTEGER DEFAULT 0
created_at      TIMESTAMPTZ DEFAULT NOW()
```

#### `site_settings`
```sql
key             VARCHAR(100) PRIMARY KEY
value           JSONB NOT NULL
updated_at      TIMESTAMPTZ DEFAULT NOW()
```

### Rôles PostgreSQL

| Rôle | Description | Permissions |
|------|-------------|-------------|
| `anon` | Utilisateurs anonymes | SELECT sur tables publiques |
| `authenticated` | Utilisateurs connectés | CRUD complet |
| `service_role` | Services internes | Bypass RLS |

### Politiques RLS (Row Level Security)

- **Photos publiques:** Lecture pour tous (`is_published = true`)
- **Toutes photos:** CRUD pour `authenticated`
- **Catégories:** Lecture pour tous, CRUD pour `authenticated`
- **Paramètres:** Lecture pour tous, CRUD pour `authenticated`

---

## 🎨 Structure Frontend

### Arborescence des Composants

```
src/
├── App.tsx                         # Point d'entrée, routing
├── main.tsx                        # Bootstrap React
├── index.css                       # Styles globaux Tailwind
│
├── components/
│   ├── index.ts                    # Exports centralisés
│   ├── OptimizedImage.tsx          # Composant image optimisée
│   │
│   ├── Admin/
│   │   ├── CategoryManager.tsx     # Gestion catégories
│   │   └── ProfileSettings.tsx     # Paramètres profil
│   │
│   ├── Auth/
│   │   └── Login.tsx               # Formulaire connexion
│   │
│   ├── Layout/
│   │   ├── Footer.tsx              # Pied de page
│   │   └── SiteLayout.tsx          # Layout principal
│   │
│   ├── Navigation/
│   │   └── BurgerMenu.tsx          # Menu hamburger
│   │
│   └── Upload/
│       └── FileUpload.tsx          # Upload de fichiers
│
├── context/
│   ├── index.ts
│   └── LanguageContext.tsx         # Contexte i18n (FR/EN)
│
├── hooks/
│   ├── index.ts
│   └── useAuth.ts                  # Hook authentification
│
├── lib/
│   ├── index.ts
│   ├── supabase.ts                 # Client Supabase
│   └── url.ts                      # Utilitaires URL
│
├── pages/
│   ├── Admin.tsx                   # Panel administration
│   ├── Contact.tsx                 # Page contact
│   └── Home.tsx                    # Page d'accueil/galerie
│
└── types/
    └── index.ts                    # Définitions TypeScript
```

### Routes Applicatives

| Route | Composant | Description |
|-------|-----------|-------------|
| `/` | `Home` | Galerie principale avec filtres |
| `/contact` | `Contact` | Page de contact |
| `/admin` | `Admin` | Panel d'administration (protégé) |
| `/*` | `NotFound` | Page 404 |

---

## 🔐 Sécurité

### Authentification

- **Mécanisme:** JWT via GoTrue (Supabase Auth)
- **Stockage session:** localStorage avec auto-refresh
- **Expiration:** Configurable via `JWT_EXPIRY` (défaut: 3600s)
- **Rôles:** `anon`, `authenticated`, `service_role`

### Protection des Données

| Couche | Mécanisme |
|--------|-----------|
| Base de données | Row Level Security (RLS) |
| API | Vérification JWT via Kong |
| Réseau | Docker network isolé |
| Transport | HTTPS (via reverse proxy) |

### Variables d'Environnement Requises

```bash
# Supabase
VITE_SUPABASE_URL=           # URL publique Supabase
VITE_SUPABASE_ANON_KEY=      # Clé publique
JWT_SECRET=                   # Secret JWT (32+ caractères)
ANON_KEY=                     # Clé anon encodée
SERVICE_ROLE_KEY=            # Clé service role

# Database
POSTGRES_PASSWORD=           # Mot de passe PostgreSQL

# Application
SITE_URL=                    # URL du site
API_EXTERNAL_URL=            # URL externe API

# Email (optionnel)
SMTP_HOST=
SMTP_PORT=
SMTP_USER=
SMTP_PASS=
```

---

## 🚀 Scripts Disponibles

### Frontend (pnpm)

| Commande | Description |
|----------|-------------|
| `pnpm dev` | Serveur de développement (port 5173) |
| `pnpm build` | Build production (TypeScript + Vite) |
| `pnpm preview` | Preview du build |
| `pnpm type-check` | Vérification types TypeScript |
| `pnpm lint` | Linting ESLint avec fix |
| `pnpm format` | Formatage Prettier |
| `pnpm check` | Type-check + lint |

### Serveur Upload

| Commande | Description |
|----------|-------------|
| `npm start` | Démarrage serveur Express (port 3001) |

---

## 📊 Fonctionnalités Principales

### Galerie Photos
- ✅ Affichage en grille masonry
- ✅ Filtrage par catégorie
- ✅ Modal lightbox avec navigation
- ✅ Images optimisées (via imgproxy)
- ✅ Lazy loading

### Administration
- ✅ Authentification sécurisée
- ✅ Upload de photos (drag & drop)
- ✅ Gestion des catégories
- ✅ Publication/dépublication
- ✅ Paramètres du profil
- ✅ Photo hero configurable

### Multi-langue
- ✅ Français / Anglais
- ✅ Contexte React pour changement dynamique
- ✅ Traductions inline via fonction `t()`

---

## 🐳 Déploiement

### Docker Multi-Stage Build

```dockerfile
1. development   → Node 20 Alpine, pnpm, dev server
2. builder       → Build production avec variables d'env
3. production    → Nginx Alpine, assets statiques
```

### Volumes Persistants

| Volume | Usage |
|--------|-------|
| `db_data` | Données PostgreSQL |
| `storage_data` | Fichiers uploadés |

### Santé des Services

- **PostgreSQL:** `pg_isready -U postgres`
- **Kong:** Health endpoint (désactivé temporairement)

---

## 📁 Fichiers de Configuration

| Fichier | Description |
|---------|-------------|
| `docker-compose.yml` | Développement local |
| `docker-compose.coolify.yml` | Production Coolify |
| `Dockerfile` | Build frontend multi-stage |
| `Dockerfile.kong` | Build Kong avec config |
| `vite.config.ts` | Configuration Vite |
| `tailwind.config.js` | Thème Tailwind |
| `tsconfig.json` | Configuration TypeScript |
| `eslint.config.js` | Règles ESLint |
| `volumes/db/init/init.sql` | Initialisation DB |
| `volumes/kong/kong.yml` | Routes API Gateway |

---

## ⚠️ Points d'Attention

### À Améliorer

1. **Healthcheck Kong désactivé** - À réactiver après debug
2. **CORS `origin: "*"`** - Restreindre en production
3. **Pas de tests automatisés** - Ajouter des tests unitaires/e2e
4. **Pas de CI/CD configuré** - Ajouter GitHub Actions

### Bonnes Pratiques Observées

- ✅ TypeScript strict
- ✅ Composants React fonctionnels avec hooks
- ✅ Lazy loading des pages
- ✅ RLS sur toutes les tables
- ✅ Variables d'environnement pour la config
- ✅ Optimisation des images

---

## 📚 Documentation Existante

| Fichier | Contenu |
|---------|---------|
| [README.md](../README.md) | Guide de démarrage rapide |
| [ARCHITECTURE.md](ARCHITECTURE.md) | Architecture détaillée |
| [SETUP.md](SETUP.md) | Guide d'installation |
| [DEPLOY.md](DEPLOY.md) | Guide de déploiement |
| [TESTING.md](TESTING.md) | Guide des tests |

---

## 🔧 Recommandations

### Court Terme
1. Réactiver le healthcheck Kong
2. Configurer CORS restrictif en production
3. Ajouter des tests unitaires (Vitest)

### Moyen Terme
1. Implémenter un CDN pour les images
2. Ajouter le support PWA
3. Mettre en place CI/CD (GitHub Actions)

### Long Terme
1. Ajouter des analytics
2. Optimisation SEO avancée
3. Support de thèmes (light/dark mode)

---

*Audit généré automatiquement pour le projet HenrardVisuals*
