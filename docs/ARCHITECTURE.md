# Architecture — HenrardVisuals

## Overview

HenrardVisuals is a containerised photography portfolio built with **React/Vite/TypeScript** and a **self-hosted Supabase** stack (PostgreSQL, GoTrue auth, PostgREST, Storage API, Kong API Gateway).

---

## System Architecture

```mermaid
graph TB
    subgraph "Client"
        BROWSER((Browser))
    end

    subgraph "VPS — Docker Host"
        subgraph "Reverse Proxy"
            PROXY["Caddy / Nginx<br/>SSL Termination"]
        end

        subgraph "Application"
            APP["React App (Vite)<br/>:80"]
        end

        subgraph "Supabase Self-Hosted"
            KONG["Kong API Gateway<br/>:8000"]

            subgraph "Core Services"
                AUTH["GoTrue (Auth)<br/>:9999"]
                REST["PostgREST (API)<br/>:3000"]
                STORAGE["Storage API<br/>:5000"]
            end

            subgraph "Data"
                POSTGRES[("PostgreSQL 15<br/>photos · categories<br/>site_settings · auth")]
                IMGPROXY["ImgProxy<br/>:8080"]
            end
        end
    end

    BROWSER --> PROXY
    PROXY --> APP
    PROXY --> KONG

    KONG --> AUTH
    KONG --> REST
    KONG --> STORAGE

    APP -- "Supabase JS SDK" --> KONG

    AUTH --> POSTGRES
    REST --> POSTGRES
    STORAGE --> POSTGRES
    STORAGE --> IMGPROXY
```

---

## Authentication & Authorization Flow

```mermaid
sequenceDiagram
    participant U as Browser
    participant A as React App
    participant K as Kong
    participant G as GoTrue
    participant D as PostgreSQL

    U->>A: Enter credentials
    A->>K: POST /auth/v1/token
    K->>G: Forward request
    G->>D: Validate user
    D-->>G: User row (with app_metadata)
    G-->>A: JWT (contains app_metadata.role = "admin")
    A->>A: Persist session

    Note over A,D: Subsequent requests
    A->>K: Request + Bearer JWT
    K->>REST: Forward
    REST->>D: Execute query
    D->>D: RLS: is_admin() checks JWT claim
    D-->>A: Row(s)
```

### Admin Role

The `is_admin()` Postgres function reads `app_metadata.role` from the JWT — set to `"admin"` when the user is created via `supabase/create-admin-user.sql`. No row-level ownership is needed because there is exactly one admin user.

---

## Photo Upload Flow

```mermaid
sequenceDiagram
    participant A as React App
    participant K as Kong
    participant S as Storage API
    participant R as PostgREST
    participant D as PostgreSQL

    A->>K: PUT /storage/v1/object/photos/<path>
    K->>S: Upload (RLS checks is_admin())
    S-->>A: Storage path

    A->>K: POST /rest/v1/photos
    K->>R: Insert row (RLS checks is_admin())
    R->>D: INSERT INTO photos
    D-->>A: Created photo record

    Note over A,D: Gallery view
    A->>K: GET /storage/v1/object/public/photos/<path>?width=800
    K->>S: Proxy with transform params
    S->>ImgProxy: Resize
    ImgProxy-->>A: Optimised image
```

---

## Database Schema

```mermaid
erDiagram
    PHOTOS {
        uuid id PK
        varchar title
        text description
        varchar category FK
        varchar storage_path
        boolean is_published
        boolean is_hero
        int sort_order
        jsonb metadata
        timestamptz created_at
        timestamptz updated_at
    }

    CATEGORIES {
        uuid id PK
        varchar name
        varchar slug UK
        text description
        uuid cover_photo_id FK
        int sort_order
        timestamptz created_at
    }

    SITE_SETTINGS {
        varchar key PK
        jsonb value
        timestamptz updated_at
    }

    CATEGORIES ||--o{ PHOTOS : "groups"
    PHOTOS ||--o| CATEGORIES : "cover_photo_id"
```

---

## Container Map

| Container | Image | Port(s) | Purpose |
|---|---|---|---|
| `henrard-app` | Custom (Vite prod build) | 80 | React SPA |
| `henrard-db` | postgres:15-alpine | 5432 (internal) | PostgreSQL |
| `henrard-kong` | kong:2.8 | 8000 | API Gateway |
| `henrard-auth` | supabase/gotrue | 9999 (internal) | Auth / JWT |
| `henrard-rest` | postgrest/postgrest | 3000 (internal) | REST API |
| `henrard-storage` | supabase/storage-api | 5000 (internal) | File storage |
| `henrard-meta` | supabase/postgres-meta | 8080 (internal) | DB introspection |
| `henrard-imgproxy` | darthsim/imgproxy | 8080 (internal) | Image transforms |

---

## Security Model

| Layer | Mechanism |
|---|---|
| Auth | GoTrue JWT (HS256), 1h expiry, auto-refresh |
| Database | RLS enabled on all tables; writes gated by `public.is_admin()` |
| Storage | Upload/update/delete policies call `public.is_admin()` |
| Network | All services on isolated `henrard-network`; DB not exposed externally |
| Signup | Disabled in production (`DISABLE_SIGNUP=true`) |

---

## Frontend Structure

```
src/
├── components/
│   ├── Admin/          # AccountSettings, CategoryManager, ProfileSettings
│   ├── Auth/           # Login
│   ├── Layout/         # SiteLayout, Footer
│   ├── Navigation/     # BurgerMenu
│   ├── Upload/         # FileUpload (drag-and-drop → Supabase Storage)
│   └── OptimizedImage  # Lazy-loaded image (Intersection Observer)
├── context/            # LanguageContext (FR/EN, localStorage)
├── hooks/              # useAuth
├── lib/                # supabase.ts — typed client + DB helpers
├── pages/              # Home, Admin, Contact
└── types/              # TypeScript interfaces + Database type
```
