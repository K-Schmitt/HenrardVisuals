# HenrardVisuals - Guide d'Installation Développeur

## Prérequis

Avant de commencer, assurez-vous d'avoir installé :

| Outil | Version | Installation |
|-------|---------|--------------|
| Node.js | 20.x+ | [nodejs.org](https://nodejs.org) |
| pnpm | 9.x+ | `npm install -g pnpm` |
| Docker | 24.x+ | [docker.com](https://docker.com) |
| Docker Compose | 2.x+ | Inclus avec Docker Desktop |
| Git | 2.x+ | [git-scm.com](https://git-scm.com) |

Vérifier les installations :

```bash
node --version    # v20.x.x
pnpm --version    # 9.x.x
docker --version  # Docker version 24.x.x
docker compose version  # Docker Compose version v2.x.x
git --version     # git version 2.x.x
```

---

## Démarrage Rapide

### 1. Cloner le Repository

```bash
git clone https://github.com/votre-username/HenrardVisuals.git
cd HenrardVisuals
```

### 2. Configuration de l'Environnement

Copier le fichier d'exemple :

```bash
cp .env.example .env
```

Éditer `.env` avec votre configuration :

```bash
# PostgreSQL
POSTGRES_PASSWORD=votre_mot_de_passe_securise

# JWT Configuration (générer une chaîne aléatoire de 32+ caractères)
JWT_SECRET=votre-super-secret-jwt-token-avec-au-moins-32-caracteres

# Clés Supabase (seront auto-générées ou utiliser les valeurs par défaut pour dev)
ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# URLs
SITE_URL=http://localhost:5173
API_EXTERNAL_URL=http://localhost:8000
```

> [!TIP]
> Pour le développement, vous pouvez utiliser les clés de démo par défaut. Pour la production, générez de nouvelles clés.

### 3. Installer les Dépendances

```bash
pnpm install
```

### 4. Démarrer l'Environnement de Développement

#### Option A : Docker Compose (Stack Complète)

```bash
# Démarrer tous les services (PostgreSQL, Supabase, App)
docker compose up -d

# Voir les logs
docker compose logs -f

# Accéder à l'application
open http://localhost:5173
```

#### Option B : Développement Local (Frontend Uniquement)

Si le backend est déjà en cours d'exécution :

```bash
# Démarrer le serveur de développement Vite
pnpm dev
```

---

## Référence des Variables d'Environnement

### Variables Requises

| Variable | Description | Exemple |
|----------|-------------|---------|
| `POSTGRES_PASSWORD` | Mot de passe PostgreSQL | `secure_password_123` |
| `JWT_SECRET` | Secret pour la signature JWT (32+ chars) | `your-super-secret...` |
| `VITE_SUPABASE_URL` | URL de l'API Supabase | `http://localhost:8000` |
| `VITE_SUPABASE_ANON_KEY` | Clé anon publique | `eyJhbGciOiJI...` |

### Variables Optionnelles

| Variable | Description | Défaut |
|----------|-------------|--------|
| `SITE_URL` | URL du frontend | `http://localhost:5173` |
| `API_EXTERNAL_URL` | URL externe de l'API | `http://localhost:8000` |
| `DISABLE_SIGNUP` | Désactiver les inscriptions | `false` |
| `ENABLE_EMAIL_AUTOCONFIRM` | Auto-confirmer les emails | `true` |

---

## Structure du Projet

```
├── src/
│   ├── components/          # Composants React
│   │   ├── gallery/         # Composants galerie (Masonry)
│   │   ├── layout/          # Layout (Navigation, Footer)
│   │   └── ui/              # Composants réutilisables
│   ├── context/             # Contextes React (Auth, Language)
│   ├── hooks/               # Hooks personnalisés
│   ├── lib/                 # Utilitaires (client Supabase, API)
│   ├── pages/               # Pages de routes (Home, Admin, Contact)
│   ├── types/               # Définitions TypeScript
│   ├── App.tsx              # Composant racine
│   ├── main.tsx             # Point d'entrée
│   └── index.css            # Styles globaux
├── server/                  # Serveur d'upload Node.js
├── public/                  # Assets statiques
├── docs/                    # Documentation
├── nginx/                   # Configuration Nginx
├── uploads/                 # Images uploadées
├── volumes/                 # Volumes Docker
│   ├── db/                  # Données PostgreSQL
│   └── storage/             # Fichiers uploadés
├── docker-compose.yml       # Orchestration des conteneurs
├── Dockerfile               # Build multi-stage
├── vite.config.ts           # Configuration Vite
├── tailwind.config.js       # Configuration Tailwind CSS
├── tsconfig.json            # Configuration TypeScript
└── package.json             # Dépendances
```

---

## Workflow de Développement

### Démarrer le Serveur de Développement

```bash
# Stack complète avec Docker
docker compose up -d

# Ou frontend uniquement
pnpm dev
```

### Build pour la Production

```bash
# Build du frontend
pnpm build

# Prévisualiser le build
pnpm preview
```

### Vérification des Types

```bash
pnpm type-check
```

### Linting & Formatage

```bash
# Linter
pnpm lint

# Formater le code
pnpm format

# Vérification complète
pnpm check
```

---

## Commandes Docker

### Démarrer les Services

```bash
# Démarrer tous les services en arrière-plan
docker compose up -d

# Démarrer avec rebuild
docker compose up -d --build

# Démarrer un service spécifique
docker compose up -d app
```

### Arrêter les Services

```bash
# Arrêter tous les services
docker compose down

# Arrêter et supprimer les volumes (⚠️ supprime les données!)
docker compose down -v
```

### Voir les Logs

```bash
# Tous les services
docker compose logs -f

# Service spécifique
docker compose logs -f app
docker compose logs -f db
```

### Accéder aux Conteneurs

```bash
# Entrer dans un shell de conteneur
docker compose exec app sh
docker compose exec db psql -U postgres -d henrard_db
```

---

## Accès aux Services

| Service | URL | Description |
|---------|-----|-------------|
| Frontend | http://localhost:5173 | Application React |
| Serveur Upload | http://localhost:3001 | API d'upload d'images |
| Supabase API | http://localhost:8000 | Kong API Gateway |
| PostgreSQL | localhost:5432 | Base de données (interne) |

---

## Gestion de la Base de Données

### Accéder à la Base de Données

```bash
# Via Docker
docker compose exec db psql -U postgres -d henrard_db

# Ou avec psql directement
psql postgresql://postgres:votre_password@localhost:5432/henrard_db
```

### Commandes SQL Utiles

```sql
-- Lister les tables
\dt

-- Voir les photos
SELECT * FROM photos;

-- Voir les catégories  
SELECT * FROM categories;

-- Vérifier les politiques RLS
SELECT * FROM pg_policies;
```

### Réinitialiser la Base de Données

```bash
# Arrêter les services et supprimer les volumes
docker compose down -v

# Redémarrer
docker compose up -d
```

---

## Dépannage

### Port Déjà Utilisé

```bash
# Trouver le processus utilisant le port
lsof -i :5173
lsof -i :8000

# Tuer le processus
kill -9 <PID>
```

### Problèmes Docker

```bash
# Redémarrer le daemon Docker
sudo systemctl restart docker

# Nettoyer les ressources inutilisées
docker system prune -a
```

### Problèmes de Connexion à la Base de Données

```bash
# Vérifier si PostgreSQL est sain
docker compose ps
docker compose logs db

# Vérifier la connexion
docker compose exec db pg_isready
```

---

## Configuration IDE

### Extensions VS Code

Extensions recommandées :

- **ESLint** - Linting du code
- **Prettier** - Formatage du code
- **Tailwind CSS IntelliSense** - Autocomplétion Tailwind
- **Docker** - Intégration Docker
- **PostgreSQL** - Explorateur de base de données

### Paramètres du Workspace

Créer `.vscode/settings.json` :

```json
{
  "typescript.tsdk": "node_modules/typescript/lib",
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "tailwindCSS.experimental.classRegex": [
    ["clsx\\(([^)]*)\\)", "(?:'|\"|`)([^']*)(?:'|\"|`)"]
  ]
}
```

---

## Prochaines Étapes

1. **Démarrer l'application** : `docker compose up -d`
2. **Accéder à l'admin** : http://localhost:5173/admin
3. **Uploader des photos** via le panneau Admin
4. **Lire le guide de déploiement** : [DEPLOY.md](./DEPLOY.md)
