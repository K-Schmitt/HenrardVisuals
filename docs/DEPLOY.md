# Deployment Guide

Covers deploying HenrardVisuals to a production VPS using Docker and Coolify (or plain Docker Compose + Caddy/Nginx).

---

## VPS Requirements

| Resource | Minimum | Recommended |
|---|---|---|
| CPU | 2 cores | 4 cores |
| RAM | 4 GB | 8 GB |
| Storage | 40 GB SSD | 100 GB SSD |
| OS | Ubuntu 22.04 LTS | Ubuntu 22.04 LTS |

---

## Option A — Coolify (recommended)

[Coolify](https://coolify.io) handles SSL, zero-downtime deploys, and reverse proxy automatically.

1. Install Coolify on your VPS following the [official guide](https://coolify.io/docs/installation)
2. Create a new project → Add resource → Docker Compose
3. Point it to this repository
4. Set all environment variables from `.env.example` in the Coolify UI
5. Deploy

Coolify will use `docker-compose.yml` and expose services via its built-in Traefik proxy.

---

## Option B — Manual Docker Compose

### 1. Server preparation

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl git ufw fail2ban

# Firewall
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable

# Docker
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
```

### 2. Clone & configure

```bash
cd /opt
git clone https://github.com/your-username/HenrardVisuals.git henrardvisuals
cd henrardvisuals

node generate-keys.cjs
cp .env.example .env
nano .env   # Fill in all values
```

**Key production settings in `.env`:**

```bash
POSTGRES_PASSWORD=<strong random password>
JWT_SECRET=<output from generate-keys.cjs>
ANON_KEY=<output from generate-keys.cjs>
SERVICE_ROLE_KEY=<output from generate-keys.cjs>
VITE_SUPABASE_URL=https://api.yourdomain.com
VITE_SUPABASE_ANON_KEY=<same as ANON_KEY>
SITE_URL=https://yourdomain.com
API_EXTERNAL_URL=https://api.yourdomain.com
DISABLE_SIGNUP=true
```

### 3. Deploy

```bash
docker compose up -d --build
docker compose ps        # All services should be "Up"
docker compose logs -f   # Watch logs
```

### 4. Initialise database

```bash
docker compose exec db \
  psql -U postgres -d henrard_db \
  -f /dev/stdin < supabase/setup-complete.sql

docker compose exec db \
  psql -U postgres -d henrard_db \
  -v ADMIN_EMAIL='admin@yourdomain.com' \
  -v ADMIN_PASSWORD='<strong password>' \
  -f /dev/stdin < supabase/create-admin-user.sql
```

---

## SSL (Caddy — simplest)

```bash
sudo apt install -y caddy

cat > /etc/caddy/Caddyfile << 'EOF'
yourdomain.com {
    reverse_proxy localhost:80
}

api.yourdomain.com {
    reverse_proxy localhost:8000
}
EOF

sudo systemctl reload caddy
```

Caddy obtains and auto-renews Let's Encrypt certificates.

---

## Backups

```bash
#!/bin/bash
# Save as /opt/backup-henrard.sh and add to crontab
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/opt/backups/henrardvisuals"
mkdir -p "$BACKUP_DIR"

# Database
docker compose -f /opt/henrardvisuals/docker-compose.yml exec -T db \
  pg_dump -U postgres henrard_db > "$BACKUP_DIR/db_$DATE.sql"

# Storage
tar -czf "$BACKUP_DIR/storage_$DATE.tar.gz" \
  -C /opt/henrardvisuals volumes/storage/

# Retention: keep 7 days
find "$BACKUP_DIR" -type f -mtime +7 -delete

echo "Backup done: $DATE"
```

```bash
# Run daily at 03:00
crontab -e
# Add: 0 3 * * * /opt/backup-henrard.sh >> /var/log/henrard-backup.log 2>&1
```

---

## Updates

```bash
cd /opt/henrardvisuals
git pull origin main
docker compose up -d --build
docker compose ps
```

---

## Security Checklist

- [ ] `POSTGRES_PASSWORD`, `JWT_SECRET` are strong random values
- [ ] `DISABLE_SIGNUP=true` in `.env`
- [ ] SSL/TLS enabled (Caddy or Coolify)
- [ ] UFW firewall enabled (only 80/443/SSH open)
- [ ] Fail2ban installed
- [ ] Database not exposed to the internet (internal Docker network only)
- [ ] Automated backups configured
- [ ] Admin user created with a strong password
