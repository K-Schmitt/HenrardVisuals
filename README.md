# HenrardVisuals

**Portfolio Photographique Professionnel** construit avec React, TypeScript, Tailwind CSS et un serveur d'upload personnalisé.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Node](https://img.shields.io/badge/node-20.x-green.svg)
![TypeScript](https://img.shields.io/badge/typescript-5.x-blue.svg)
![React](https://img.shields.io/badge/react-18.x-61dafb.svg)

---

## ✨ Fonctionnalités

- **Galerie Masonry** - Grille asymétrique élégante pour les photos
- **Design System** - Style luxe/éditorial inspiré des magazines de mode
- **Upload d'images** - Serveur Node.js pour la gestion des fichiers
- **Panel Admin** - Interface d'administration sécurisée
- **Multi-langue** - Support Français / Anglais
- **Docker Ready** - Déploiement conteneurisé complet
- **Responsive** - Design adaptatif mobile-first

---

## 🚀 Démarrage Rapide

```bash
# Cloner le repository
git clone https://github.com/votre-username/HenrardVisuals.git
cd HenrardVisuals

# Lancer le script d'initialisation
chmod +x init.sh
./init.sh

# Démarrer l'environnement de développement
docker compose up -d

# Ouvrir dans le navigateur
open http://localhost:5173
```

---

## 📁 Structure du Projet

```
├── src/                    # Application React
│   ├── components/         # Composants UI
│   │   ├── gallery/        # Composants galerie
│   │   ├── layout/         # Layout & navigation
│   │   └── ui/             # Composants réutilisables
│   ├── context/            # Contextes React (Auth, Language)
│   ├── hooks/              # Hooks personnalisés
│   ├── lib/                # Utilitaires & clients API
│   ├── pages/              # Pages de l'application
│   └── types/              # Définitions TypeScript
├── server/                 # Serveur d'upload Node.js
├── public/                 # Assets statiques
├── docs/                   # Documentation
├── nginx/                  # Configuration Nginx
├── uploads/                # Dossier des images uploadées
├── docker-compose.yml      # Orchestration des conteneurs
└── Dockerfile              # Build multi-stage
```

---

## 🛠 Stack Technique

| Couche | Technologie |
|--------|-------------|
| **Frontend** | React 18, TypeScript, Vite |
| **Styling** | Tailwind CSS (design system personnalisé) |
| **Routing** | React Router DOM v6 |
| **Backend** | Supabase (self-hosted), Node.js |
| **Database** | PostgreSQL 15 |
| **Storage** | Serveur d'upload custom |
| **Proxy** | Kong API Gateway |
| **Container** | Docker, Docker Compose |

---

## 🔧 Commandes de Développement

```bash
# Installer les dépendances
pnpm install

# Démarrer le serveur de développement
pnpm dev

# Build pour la production
pnpm build

# Vérification des types
pnpm type-check

# Linter
pnpm lint

# Formater le code
pnpm format
```

---

## 🐳 Commandes Docker

```bash
# Démarrer tous les services
docker compose up -d

# Voir les logs
docker compose logs -f

# Arrêter tous les services
docker compose down

# Reconstruire
docker compose up -d --build

# Reconstruire sans cache
docker compose build --no-cache && docker compose up -d
```

---

## 🔐 Variables d'Environnement

Copier `.env.example` vers `.env` et configurer :

```bash
# Base de données
POSTGRES_PASSWORD=your_secure_password

# JWT
JWT_SECRET=your_jwt_secret_32_chars_min

# Supabase
VITE_SUPABASE_URL=http://localhost:8000
VITE_SUPABASE_ANON_KEY=your_anon_key
```

Voir [SETUP.md](./docs/SETUP.md) pour le guide de configuration complet.

---

## 📚 Documentation

| Document | Description |
|----------|-------------|
| [ARCHITECTURE.md](./docs/ARCHITECTURE.md) | Architecture système & diagrammes |
| [SETUP.md](./docs/SETUP.md) | Guide d'installation développeur |
| [DEPLOY.md](./docs/DEPLOY.md) | Procédure de déploiement VPS |
| [TESTING.md](./docs/TESTING.md) | Guide de tests |

---

## 🌐 Démo

- **Production** : [henrardvisuals.com](https://henrardvisuals.com)
- **Port local** : `http://localhost:5173`

---

## 📄 License

MIT License - voir [LICENSE](./LICENSE) pour les détails.

---
