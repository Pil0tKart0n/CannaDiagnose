# ADR-001: Server-Modularisierung

## Status
Geplant

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

## Umsetzung
Schrittweise (nicht alles auf einmal):
1. Sprint 1: `db.js` + `routes/admin.js` extrahieren (geringste Kopplung)
2. Sprint 2: `routes/stripe.js` + `middleware.js` extrahieren
3. Sprint 3: `routes/scan.js` + `routes/quota.js` + `cleanup.js` extrahieren

## Konsequenzen
- **Positiv:** Bessere Wartbarkeit, einzelne Module testbar, Code-Review einfacher
- **Negativ:** Einmaliger Aufwand, Risiko bei Migration
