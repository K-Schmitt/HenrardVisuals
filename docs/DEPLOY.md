# HenrardVisuals - Deployment Guide

## Overview

This guide covers deploying HenrardVisuals to a production VPS environment with Docker, SSL/TLS, and proper security configurations.

---

## Prerequisites

### VPS Requirements

| Resource | Minimum | Recommended |
|----------|---------|-------------|
| CPU | 2 cores | 4 cores |
| RAM | 4 GB | 8 GB |
| Storage | 40 GB SSD | 100 GB SSD |
| OS | Ubuntu 22.04 LTS | Ubuntu 22.04 LTS |

### Domain & DNS

1. Register a domain (e.g., `henrardvisuals.com`)
2. Point A record to your VPS IP
3. Optionally, add a wildcard or subdomain for API

```
henrardvisuals.com      A     YOUR_VPS_IP
api.henrardvisuals.com  A     YOUR_VPS_IP
```

---

## Server Preparation

### 1. Initial Server Setup

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install required packages
sudo apt install -y curl git ufw fail2ban

# Configure firewall
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

### 2. Install Docker

```bash
# Install Docker
curl -fsSL https://get.docker.com | sh

# Add user to docker group
sudo usermod -aG docker $USER

# Install Docker Compose plugin
sudo apt install docker-compose-plugin

# Verify installation
docker --version
docker compose version
```

### 3. Install Certbot (for SSL)

```bash
sudo apt install -y certbot
```

---

## Deployment Steps

### 1. Clone Repository

```bash
cd /home/kyky
mkdir -p Tristan
cd Tristan
git clone https://github.com/K-Schmitt/HenrardVisuals.git .
```

### 2. Configure Environment

```bash
# Copy example env
cp .env.example .env

# Edit with production values
nano .env
```

**Production `.env` configuration:**

```bash
# Generate strong passwords/secrets
POSTGRES_PASSWORD=$(openssl rand -base64 32)
JWT_SECRET=$(openssl rand -base64 64)

# Domain configuration
SITE_URL=https://henrardvisuals.com
API_EXTERNAL_URL=https://henrardvisuals.com

# Disable signup in production (invite-only)
DISABLE_SIGNUP=true
ENABLE_EMAIL_AUTOCONFIRM=false

# SMTP for emails (optional)
SMTP_HOST=smtp.mailgun.org
SMTP_PORT=587
SMTP_USER=postmaster@mg.henrardvisuals.com
SMTP_PASS=your_smtp_password
SMTP_ADMIN_EMAIL=admin@henrardvisuals.com
SMTP_SENDER_NAME=HenrardVisuals
```

### 3. Generate Supabase Keys

```bash
# Generate ANON_KEY (public, limited access)
# Use https://supabase.com/docs/guides/self-hosting#api-keys
# Or generate manually with your JWT_SECRET

# For production, generate proper keys:
# 1. Go to jwt.io
# 2. Use HS256 algorithm
# 3. Payload for anon: {"role": "anon", "iss": "supabase", "iat": ..., "exp": ...}
# 4. Payload for service_role: {"role": "service_role", "iss": "supabase", ...}
```

### 4. SSL Certificate Setup

```bash
# Stop any services using port 80
docker compose down

# Get SSL certificate
sudo certbot certonly --standalone -d henrardvisuals.com -d www.henrardvisuals.com

# Certificate location
# /etc/letsencrypt/live/henrardvisuals.com/fullchain.pem
# /etc/letsencrypt/live/henrardvisuals.com/privkey.pem
```

### 5. Configure Nginx for SSL

Create/update `nginx/nginx.conf` for production:

```nginx
# Production Nginx Configuration
worker_processes auto;
error_log /var/log/nginx/error.log warn;
pid /var/run/nginx.pid;

events {
    worker_connections 1024;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    # Logging
    log_format main '$remote_addr - $remote_user [$time_local] "$request" '
                    '$status $body_bytes_sent "$http_referer" '
                    '"$http_user_agent"';
    access_log /var/log/nginx/access.log main;

    # Performance
    sendfile on;
    keepalive_timeout 65;
    gzip on;
    gzip_types text/plain text/css application/json application/javascript;

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;

    # Upstreams
    upstream frontend {
        server app:5173;
    }

    upstream supabase {
        server kong:8000;
    }

    # HTTP -> HTTPS redirect
    server {
        listen 80;
        server_name henrardvisuals.com www.henrardvisuals.com;
        return 301 https://$server_name$request_uri;
    }

    # HTTPS server
    server {
        listen 443 ssl http2;
        server_name henrardvisuals.com www.henrardvisuals.com;

        # SSL Configuration
        ssl_certificate /etc/nginx/ssl/fullchain.pem;
        ssl_certificate_key /etc/nginx/ssl/privkey.pem;
        ssl_session_timeout 1d;
        ssl_session_cache shared:SSL:50m;
        ssl_session_tickets off;

        # Modern SSL configuration
        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256;
        ssl_prefer_server_ciphers off;

        # HSTS
        add_header Strict-Transport-Security "max-age=63072000" always;

        # Security headers
        add_header X-Frame-Options "SAMEORIGIN" always;
        add_header X-Content-Type-Options "nosniff" always;
        add_header X-XSS-Protection "1; mode=block" always;
        add_header Referrer-Policy "strict-origin-when-cross-origin" always;

        # Max upload size
        client_max_body_size 50M;

        # Supabase API
        location ~ ^/(rest|auth|storage|realtime)/ {
            limit_req zone=api burst=20 nodelay;
            proxy_pass http://supabase;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection "upgrade";
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        # Frontend
        location / {
            proxy_pass http://frontend;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection "upgrade";
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        # Static files caching
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff2)$ {
            proxy_pass http://frontend;
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }
}
```

### 6. Update Docker Compose for Production

Create `docker-compose.prod.yml`:

```yaml
# Production overrides
services:
  app:
    build:
      target: production
    restart: always

  nginx:
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - /etc/letsencrypt/live/henrardvisuals.com:/etc/nginx/ssl:ro
    restart: always

  db:
    restart: always
    volumes:
      - postgres_data:/var/lib/postgresql/data

  kong:
    restart: always

  auth:
    restart: always

  rest:
    restart: always

  storage:
    restart: always

volumes:
  postgres_data:
```

### 7. Deploy

```bash
# Build and start production
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build

# Check status
docker compose ps

# View logs
docker compose logs -f
```

---

## Post-Deployment

### 1. Create Admin User

Access Supabase Studio (temporarily enable port 3000):

```bash
# Temporarily expose Studio
docker compose exec studio sh
# Or via Kong if configured
```

Create your admin user via the Auth section.

### 2. Disable Studio Access

For production, consider removing or protecting Studio access:

```yaml
# In docker-compose.prod.yml
services:
  studio:
    profiles:
      - admin  # Only starts with --profile admin
```

### 3. Setup Auto-Renewal for SSL

```bash
# Test renewal
sudo certbot renew --dry-run

# Add to crontab
sudo crontab -e
# Add: 0 0 1 * * certbot renew --post-hook "docker compose -f /home/kyky/Tristan/docker-compose.yml restart nginx"
```

### 4. Setup Backups

```bash
# Create backup script
cat > /home/kyky/Tristan/backup.sh << 'EOF'
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/home/kyky/backups"
mkdir -p $BACKUP_DIR

# Backup PostgreSQL
docker compose exec -T db pg_dump -U postgres henrard_db > $BACKUP_DIR/db_$DATE.sql

# Backup storage
tar -czf $BACKUP_DIR/storage_$DATE.tar.gz volumes/storage/

# Keep only last 7 days
find $BACKUP_DIR -type f -mtime +7 -delete

echo "Backup completed: $DATE"
EOF

chmod +x backup.sh

# Add to crontab (daily at 3 AM)
crontab -e
# Add: 0 3 * * * /home/kyky/Tristan/backup.sh >> /var/log/henrard-backup.log 2>&1
```

---

## Monitoring

### View Logs

```bash
# All services
docker compose logs -f

# Specific service
docker compose logs -f nginx
docker compose logs -f app
```

### Check Health

```bash
# Container status
docker compose ps

# Resource usage
docker stats
```

### Health Endpoints

- Frontend: `https://henrardvisuals.com/`
- API Health: `https://henrardvisuals.com/rest/v1/` (returns OpenAPI spec)

---

## Updating

### Pull and Rebuild

```bash
cd /home/kyky/Tristan

# Pull latest code
git pull origin main

# Rebuild and restart
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build

# Verify
docker compose ps
docker compose logs -f --tail=100
```

### Zero-Downtime Updates

```bash
# Build new images
docker compose build app

# Rolling update
docker compose up -d --no-deps app
```

---

## Troubleshooting

### Container Won't Start

```bash
# Check logs
docker compose logs <service_name>

# Check configuration
docker compose config
```

### Database Connection Issues

```bash
# Check PostgreSQL
docker compose exec db pg_isready

# Check connection from app
docker compose exec app ping db
```

### SSL Certificate Issues

```bash
# Check certificate
sudo certbot certificates

# Force renewal
sudo certbot renew --force-renewal
```

### High Memory Usage

```bash
# Check usage
docker stats

# Restart heavy services
docker compose restart storage imgproxy
```

---

## Security Checklist

- [ ] Strong `POSTGRES_PASSWORD` and `JWT_SECRET`
- [ ] SSL/TLS enabled and working
- [ ] Firewall configured (UFW)
- [ ] Fail2ban installed
- [ ] Studio access disabled/protected
- [ ] Signup disabled in production
- [ ] Regular backups configured
- [ ] Log rotation configured
- [ ] Rate limiting enabled
