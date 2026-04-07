# Security Rules — LeafScan

## Secrets
- NEVER commit secrets, API keys, tokens, or credentials to Git
- Use environment variables (`.env` / `.env.server`, both in `.gitignore`)
- Server-side only: OpenAI Key (GPT-4.1), Stripe Key, Admin Key, Tester Key
- Client-side allowed: `EXPO_PUBLIC_API_PROXY_URL`, `EXPO_PUBLIC_REVENUECAT_GOOGLE_KEY`
- Rotate compromised secrets immediately

## Authentication
- Premium sessions: token-based (stored in SQLite)
- Admin access: key-based (`x-leafscan-key` header)
- Tester access: key-based (`x-leafscan-key` header)
- Session expiry: 35 days for premium

## Rate Limiting
- Global: 30 requests/minute per IP
- Free scans: 1 per day per IP
- IP Blacklist: persistent in SQLite
- Promo codes: 1 redemption per IP + device

## Headers (Nginx)
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Strict-Transport-Security: max-age=31536000; includeSubDomains`
- SSL/TLS 1.2+ only

## Data Protection (DSGVO)
- IP-Adressen: nach 7 Tagen löschen
- Diagnose-Daten: nach 90 Tagen löschen
- Impressum mit Postanschrift
- Datenschutzerklärung vollständig
- Cookie Consent Banner (Web)
- Kein PII in Logs

## Input Validation
- Bilder: max 5 base64 Data URIs, Format-Check
- Fragebogen: Server-seitige Validation
- Promo-Codes: Case-insensitive, Limit-Check
- Admin-Endpoints: Key-Check auf jedem Request

## Dependencies
- Lock file (`package-lock.json`) always committed
- `npm audit` regelmäßig ausführen
