# Performance Budgets — LeafScan

## Frontend (Web)

| Metrik | Budget | Messung | CI-Gate |
|--------|--------|---------|---------|
| **LCP** | ≤ 2.5s | Lighthouse | Empfohlen |
| **INP** | ≤ 200ms | Lighthouse | Nein |
| **CLS** | ≤ 0.1 | Lighthouse | Empfohlen |
| **Lighthouse Performance** | ≥ 80 | Lighthouse | Empfohlen |
| **JS Bundle (gzipped)** | ≤ 300 KB | `npx expo export` + gzip | Nein |
| **First Load** | ≤ 3s (3G) | WebPageTest | Nein |

## API Response Times

| Endpoint | Budget (p95) | Notiz |
|----------|-------------|-------|
| `GET /api/health` | ≤ 50ms | Kein DB-Zugriff |
| `GET /api/quota` | ≤ 200ms | 1 DB-Query |
| `POST /api/scan` (diagnose) | ≤ 30s | GPT-4o Latenz dominiert |
| `POST /api/scan` (refine) | ≤ 20s | Kürzerer Prompt |
| `POST /api/validate` | ≤ 10s | GPT-4o-mini |
| `POST /api/redeem-code` | ≤ 300ms | DB-Queries |
| `GET /api/admin/dashboard` | ≤ 500ms | Aggregation über mehrere Tabellen |

## Image Processing

| Metrik | Budget | Notiz |
|--------|--------|-------|
| **Client Resize** | ≤ 2s pro Bild | 1568px max |
| **Upload (3 Bilder)** | ≤ 5s (LTE) | Nach Optimierung ~200-400 KB pro Bild |
| **Gesamter Diagnose-Flow** | ≤ 35s | Resize + Upload + GPT-4o |

## Mobile (Native)

| Metrik | Budget | Notiz |
|--------|--------|-------|
| **App Start** | ≤ 3s | Splash Screen bis Home |
| **Screen Navigation** | ≤ 300ms | React Navigation Transition |
| **AsyncStorage Read** | ≤ 100ms | Diagnose-History laden |

## Database

| Metrik | Budget | Notiz |
|--------|--------|-------|
| **Single Query** | ≤ 10ms | Prepared Statements |
| **Dashboard Aggregation** | ≤ 200ms | Admin Stats |
| **GDPR Cleanup** | ≤ 5s | Täglicher Cron |

## Monitoring

- **API Response Times:** Geloggt via `api_usage` Tabelle (Tokens + Timing)
- **Error Rate:** Admin Board (`/api/admin/board`)
- **Disk Usage:** `/api/admin/stats/disk`
- **Token Costs:** `/api/admin/stats/tokens`

## Baseline-Messung

Baseline sollte gemessen werden nach jedem Sprint:
```bash
# Lighthouse (Web)
npx lighthouse https://leafscan.de --output json --output-path lighthouse-report.json

# Bundle Size
npx expo export --platform web && du -sh dist/

# API Health
curl -w "@curl-format.txt" https://leafscan.de/api/health
```
