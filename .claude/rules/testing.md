# Testing Rules — LeafScan

## Test-Timing (HARD RULE)
- Tests im SELBEN Commit wie das Feature — nie als separater Batch
- Kein Feature-Commit ohne mindestens einen Test

## Test-Execution (HARD RULE)
- Tests schreiben ist NICHT genug — Tests MÜSSEN ausgeführt werden
- `npm run test` nach jedem Test-File
- Rote Tests = Blocker. Nie committen mit failing Tests.

## Test-Typen

### Unit Tests (Vitest)
- Business logic functions (no DB, no HTTP)
- Server: `server/index.test.js`
- Co-located: `*.test.ts` neben der Quelldatei

### Integration Tests
- API-Endpoints gegen echte SQLite DB
- Auth-Flow: Session-Token erstellen → prüfen → verwenden

### E2E Tests (zukünftig)
- Playwright für Web
- Kritische Flows: Diagnose (Home → Kamera → Fragebogen → Analyse → Ergebnis)

## Bug-Fix Testing (HARD RULE)
1. Reproduzieren — Was genau passiert?
2. Regression-Test ZUERST schreiben (Red)
3. Fix implementieren (Green)
4. Verifizieren

## Was testen
- Diagnose-Flow: Bildvalidierung, Quota-Check, API-Response-Parsing
- Premium: Session-Erstellung, Verifizierung, Ablauf
- Promo-Codes: Einlösung, Limits, Duplikaterkennung
- Rate Limiting: IP-basiert, Blacklist
- Korrektur-Matrix: EC/pH-Evaluation, Diagnose-Typ-Erkennung
