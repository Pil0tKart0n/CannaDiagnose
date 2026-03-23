# Deployment Runbook — LeafScan

## Voraussetzungen

- VPS mit Docker + Docker Compose
- Domain (leafscan.de) mit DNS auf VPS-IP
- Let's Encrypt SSL-Zertifikate
- `.env` und `.env.server` auf dem Server konfiguriert

## Deploy-Prozess

### 1. Web-App bauen

```bash
# Lokal
npx expo export --platform web

# SEO-Tags injizieren
bash inject-seo.sh
```

### 2. Auf Server übertragen

```bash
# Via SCP oder rsync
rsync -avz --exclude node_modules --exclude .env --exclude .env.server \
  ./ user@server:/opt/apps/leafscan/
```

### 3. Docker starten

```bash
ssh user@server
cd /opt/apps/leafscan

# Bauen und starten
docker compose up -d --build

# Logs prüfen
docker compose logs -f
```

### 4. Health Check

```bash
curl https://leafscan.de/api/health
# Erwartete Antwort: {"status":"ok"}
```

## Architektur

```
Internet → Nginx (Port 80/443)
              ├── Static Files (Expo Web Build)
              └── /api/* → Express (Port 4000)
                              └── SQLite DB (/data/leafscan.db)
```

## Docker Services

| Service | Image | Port | Volumes |
|---------|-------|------|---------|
| `web` | Nginx Alpine | 80, 443 | SSL-Certs, dist/ |
| `api` | Node 20 Alpine | 4000 (intern) | leafscan-data |

## SSL-Zertifikate

Let's Encrypt Zertifikate unter `/etc/letsencrypt/live/leafscan.de/`.
Auto-Renewal via Certbot Cron oder Docker Certbot Container.

## Rollback

```bash
# Zum vorherigen Image zurück
docker compose down
git checkout HEAD~1
docker compose up -d --build
```

## Monitoring

- Health Check: `GET /api/health`
- Admin Dashboard: `GET /api/admin/dashboard` (mit Admin-Key)
- Disk Usage: `GET /api/admin/stats/disk`
- Server Board: `GET /api/admin/board`

## Troubleshooting

| Problem | Lösung |
|---------|--------|
| 502 Bad Gateway | Express-Container prüfen: `docker compose logs api` |
| SSL-Fehler | Zertifikat erneuern: `certbot renew` |
| DB locked | WAL-Mode prüfen, ggf. Container neustarten |
| Hohe Kosten | Token-Usage prüfen: `/api/admin/stats/tokens` |
| Rate Limit Beschwerden | Blacklist prüfen: `/api/admin/blacklist` |
