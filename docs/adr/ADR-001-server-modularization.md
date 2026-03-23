# ADR-001: Server-Modularisierung

## Status
Umgesetzt (2026-03-23)

## Kontext
`server/index.js` hat 1850+ Zeilen und vereint Database-Setup, Middleware, 40+ API-Endpoints, Stripe-Integration, Admin-Dashboard und Cleanup-Logic in einer einzigen Datei.

## Entscheidung
Server in Module aufteilen:

```
server/
├── index.js              # App Setup, Middleware, Server-Start (schlank)
├── db.js                 # Database Connection, Schema, Prepared Statements
├── middleware.js          # CORS, Rate Limiting, Auth Checks
├── prompts.js            # ✓ Bereits separiert
├── fertilizers.js        # ✓ Bereits separiert
├── routes/
│   ├── scan.js           # POST /api/scan (Hauptdiagnose)
│   ├── quota.js          # GET /api/quota, POST /api/redeem-code, GET /api/verify-session
│   ├── stripe.js         # Alle /api/stripe/* Endpoints
│   ├── feedback.js       # POST /api/feedback
│   └── admin.js          # Alle /api/admin/* Endpoints (35+)
└── cleanup.js            # GDPR Data Retention, Cron Jobs
```

## Abhängigkeiten
- `db.js` exportiert `db` Instanz + alle prepared statements
- Alle Route-Module importieren von `db.js`
- `middleware.js` exportiert `rateLimit()`, `adminAuth()`, `getClientIP()`, `checkPremium()`
- Route-Module verwenden Express Router Pattern

## Risiken
- Production Server läuft — Refactoring muss backwards-compatible sein
- Tests müssen nach Refactoring grün sein
- Prepared statements referenzieren db-Instanz

## Umsetzung (abgeschlossen)
1. `server/db.js` — DB-Connection, Schema, 25+ Prepared Statements (321 Zeilen)
2. `server/routes/admin.js` — 33 Admin-Endpoints als Express Router (671 Zeilen)
3. `server/routes/stripe.js` — 4 Stripe-Endpoints + ensureProducts (272 Zeilen)
4. `server/index.js` — von 1850 auf 717 Zeilen reduziert (-61%)

## Konsequenzen
- **Positiv:** Bessere Wartbarkeit, einzelne Module testbar, Code-Review einfacher
- **Negativ:** Einmaliger Aufwand, Risiko bei Migration
