# Backend Rules — LeafScan

## API Design
- REST: resource-oriented URLs, correct HTTP methods
- Response format: `{ data, meta }` for success, structured errors for failures
- Always return `requestId` in error objects for debugging
- Rate limiting on all public endpoints (30 req/min IP-based)

## Validation & Security
- Validate ALL inputs at boundary (never trust client)
- Parameterized queries only — never string concatenation for SQL
- Rate limiting on auth endpoints
- CORS: explicit origins (leafscan.de), no wildcards in production
- Never log PII, passwords, tokens, or full request bodies

## Error Handling
- Catch errors at handler level, return structured error responses
- Log errors with context: IP, endpoint, params
- Never expose stack traces or internal details in API responses
- Niemals leere catch-Blöcke — jeder catch MUSS loggen

## Database (SQLite)
- WAL mode enabled for concurrent reads
- Prepared statements for all queries (performance + security)
- Transactions for multi-table writes
- GDPR cleanup: IPs nach 7 Tagen, Daten nach 90 Tagen löschen

## Server Structure
- `server/index.js` — Express App, Routes, Middleware
- `server/prompts.js` — KI-Prompts, Korrektur-Matrix, EC/pH Evaluation
- `server/fertilizers.js` — Dünger-Datenbank mit EC-Bereichen

## OpenAI Integration
- GPT-4o für Diagnose, GPT-4o-mini für Validation
- Retry-Logik: max 2 Retries mit 2s/5s Delay
- Token-Usage in `api_usage` Tabelle tracken
- Prompts NUR server-side (Paywall-Schutz)

## Stripe Integration
- Webhook-Signatur IMMER verifizieren
- Idempotent: doppelte Events ignorieren
- Session-Token nach erfolgreichem Checkout erstellen
- Premium-Status server-side prüfen (nicht client-side)
