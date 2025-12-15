# HenrardVisuals - Architecture Documentation

## Overview

HenrardVisuals is a professional photography portfolio built with a modern, containerized architecture using **Docker**, **React/Vite/TypeScript**, and **self-hosted Supabase** for backend services.

---

## System Architecture

```mermaid
graph TB
    subgraph "Client Layer"
        BROWSER((Web Browser))
    end

    subgraph "VPS - Docker Host"
        subgraph "Reverse Proxy Layer"
            NGINX["Nginx<br/>:80/:443<br/>SSL Termination<br/>Load Balancing"]
        end

        subgraph "Application Layer"
            APP["React/Vite App<br/>:5173<br/>- TypeScript<br/>- Tailwind CSS<br/>- Design System"]
        end

        subgraph "Supabase Self-Hosted"
            KONG["Kong API Gateway<br/>:8000<br/>Rate Limiting<br/>Auth Routing"]
            
            subgraph "Core Services"
                AUTH["GoTrue<br/>:9999<br/>Authentication<br/>JWT Tokens"]
                REST["PostgREST<br/>:3000<br/>REST API<br/>Auto-generated"]
                STORAGE["Storage API<br/>:5000<br/>File Uploads<br/>Image Transforms"]
            end
            
            subgraph "Admin & Tools"
                STUDIO["Supabase Studio<br/>:3000<br/>Admin Dashboard"]
                META["Postgres Meta<br/>:8080<br/>Schema Info"]
                IMGPROXY["ImgProxy<br/>:8080<br/>Image Processing"]
            end
            
            subgraph "Data Layer"
                POSTGRES[("PostgreSQL 15<br/>:5432<br/>- Photos<br/>- Categories<br/>- Settings<br/>- Auth Users")]
            end
        end
    end

    BROWSER --> NGINX
    NGINX -->|"/*"| APP
    NGINX -->|"/rest/*, /auth/*, /storage/*"| KONG
    
    KONG --> AUTH
    KONG --> REST
    KONG --> STORAGE
    
    APP -.->|"Supabase SDK"| KONG
    
    AUTH --> POSTGRES
    REST --> POSTGRES
    STORAGE --> POSTGRES
    STUDIO --> META
    META --> POSTGRES
    STORAGE --> IMGPROXY
```

---

## Data Flow

### Authentication Flow

```mermaid
sequenceDiagram
    participant U as User
    participant A as React App
    participant K as Kong Gateway
    participant G as GoTrue Auth
    participant D as PostgreSQL

    U->>A: Enter credentials
    A->>K: POST /auth/v1/token
    K->>G: Forward auth request
    G->>D: Validate user
    D-->>G: User data
    G-->>K: JWT Token + Session
    K-->>A: Auth response
    A->>A: Store session (localStorage)
    A-->>U: Redirect to dashboard
```

### Photo Upload Flow

```mermaid
sequenceDiagram
    participant U as User
    participant A as React App
    participant K as Kong Gateway
    participant S as Storage API
    participant R as PostgREST
    participant D as PostgreSQL
    participant I as ImgProxy

    U->>A: Select photo file
    A->>K: POST /storage/v1/object/photos
    K->>S: Upload to storage
    S->>D: Save file metadata
    S-->>K: Upload success + path
    K-->>A: File path
    A->>K: POST /rest/v1/photos
    K->>R: Insert photo record
    R->>D: Save photo entry
    D-->>R: Created
    R-->>K: Photo record
    K-->>A: Success
    A-->>U: Photo added to gallery
    
    Note over A,I: On gallery view
    A->>K: GET /storage/v1/object/public/photos/...
    K->>S: Request with transforms
    S->>I: Transform image
    I-->>S: Optimized image
    S-->>K: Image data
    K-->>A: Serve image
```

---

## Container Configuration

| Container | Image | Port | Purpose |
|-----------|-------|------|---------|
| `henrard-app` | Custom (Vite) | 5173 | React frontend |
| `henrard-nginx` | nginx:alpine | 80, 443 | Reverse proxy |
| `henrard-db` | postgres:15-alpine | 5432 | PostgreSQL database |
| `henrard-kong` | kong:2.8 | 8000 | API Gateway |
| `henrard-auth` | supabase/gotrue | 9999 | Authentication |
| `henrard-rest` | postgrest/postgrest | 3000 | REST API |
| `henrard-storage` | supabase/storage-api | 5000 | File storage |
| `henrard-studio` | supabase/studio | 3000 | Admin UI |
| `henrard-meta` | supabase/postgres-meta | 8080 | DB metadata |
| `henrard-imgproxy` | darthsim/imgproxy | 8080 | Image processing |

---

## Database Schema

```mermaid
erDiagram
    USERS ||--o{ PHOTOS : uploads
    CATEGORIES ||--o{ PHOTOS : contains
    PHOTOS ||--o| STORAGE_OBJECTS : references

    USERS {
        uuid id PK
        string email
        string encrypted_password
        timestamp created_at
    }

    PHOTOS {
        uuid id PK
        string title
        text description
        string category
        string storage_path
        int width
        int height
        bigint file_size
        boolean is_published
        int sort_order
        jsonb metadata
        timestamp created_at
        timestamp updated_at
    }

    CATEGORIES {
        uuid id PK
        string name
        string slug UK
        text description
        uuid cover_photo_id FK
        int sort_order
        timestamp created_at
    }

    SITE_SETTINGS {
        string key PK
        jsonb value
        timestamp updated_at
    }

    STORAGE_OBJECTS {
        uuid id PK
        string bucket_id FK
        string name
        uuid owner FK
        jsonb metadata
        timestamp created_at
    }
```

---

## Security Architecture

### Row Level Security (RLS)

All database tables have RLS enabled:

- **Public read**: Published photos, categories, settings
- **Authenticated write**: Full CRUD for authenticated users
- **Service role bypass**: For admin operations

### Authentication Flow

1. **JWT-based**: GoTrue issues JWTs with configurable expiry
2. **Session persistence**: Stored in localStorage
3. **Auto-refresh**: SDK handles token refresh automatically
4. **Role-based**: `anon`, `authenticated`, `service_role`

### Network Security

- **Isolated Docker network**: All services on `henrard-network`
- **Internal-only access**: Database not exposed externally
- **Rate limiting**: Kong enforces request limits
- **CORS configuration**: Strict origin policies

---

## Technology Decisions

### Why Self-Hosted Supabase?

1. **Data sovereignty**: Full control over photography data
2. **Cost efficiency**: No per-request pricing
3. **Customization**: Full access to PostgreSQL
4. **Privacy**: Client data stays on VPS

### Why React + Vite?

1. **Performance**: Fast HMR, optimized builds
2. **TypeScript**: Type safety throughout
3. **Ecosystem**: Rich component libraries
4. **Developer experience**: Modern tooling

### Why Masonry Layout?

1. **Visual appeal**: Asymmetric grids suit photography
2. **Flexibility**: Handles varying aspect ratios
3. **Performant**: CSS Grid-based implementation
4. **Responsive**: Adapts to screen sizes

---

## File Structure

```
/home/kyky/Tristan/
├── docker-compose.yml          # Container orchestration
├── Dockerfile                  # Multi-stage React build
├── nginx/
│   └── nginx.conf              # Reverse proxy config
├── volumes/
│   ├── db/                     # PostgreSQL persistence
│   │   └── init/init.sql       # Schema initialization
│   ├── kong/kong.yml           # API Gateway config
│   └── storage/                # Uploaded files
├── src/                        # React application
│   ├── components/             # UI components
│   ├── hooks/                  # Custom React hooks
│   ├── lib/                    # Supabase client
│   ├── pages/                  # Route pages
│   └── types/                  # TypeScript types
├── tests/                      # Test setup
│   └── mocks/                  # MSW handlers
└── docs/                       # Documentation
```
