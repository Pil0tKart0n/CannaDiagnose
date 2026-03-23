# LeafScan API Documentation

Base URL: `https://leafscan.de/api`

## Authentication

- **Free Users:** IP-basiertes Rate Limiting (1 Scan/Tag, 30 req/min)
- **Tester:** Header `x-leafscan-key: <TESTER_KEY>` (50 Scans/Tag)
- **Admin:** Header `x-leafscan-key: <ADMIN_KEY>`
- **Premium:** Session-Token via Cookie oder Header

---

## Public Endpoints

### POST /api/scan

Hauptdiagnose-Endpoint. Sendet Bilder und Fragebogen an GPT-4o.

**Modes:**
- `diagnose` — Neue Diagnose erstellen
- `refine` — Bestehende Diagnose mit neuen Parametern verfeinern
- `followup` — Follow-up Diagnose nach vorheriger Analyse

**Request Body:**
```json
{
  "images": ["data:image/jpeg;base64,..."],
  "questionnaire": {
    "growPhase": "Blüte",
    "plantAgeWeeks": "6",
    "substrateType": "Kokos",
    "fertilizerType": "Canna Coco A+B",
    "phFeed": "6.0",
    "ecPpm": "1200",
    "lightType": "LED",
    "roomTempCelsius": "25",
    "humidityPercent": "55"
  },
  "mode": "diagnose"
}
```

**Response (200):**
```json
{
  "result": {
    "severity": "mittel",
    "primaryDiagnosis": "Kalziummangel",
    "confidence": 82,
    "rootCauseAnalysis": "...",
    "contributingFactors": [...],
    "actionPlan": [...],
    "preventiveTips": [...],
    "followUpDays": 5,
    "category": "Nährstoffmangel"
  }
}
```

**Errors:**
- `429` — Rate Limit überschritten
- `403` — IP blacklisted
- `400` — Keine gültigen Bilder

---

### POST /api/validate

Prüft ob ein Bild eine Cannabis-Pflanze zeigt.

**Request Body:**
```json
{
  "image": "data:image/jpeg;base64,..."
}
```

**Response (200):**
```json
{
  "isPlant": true
}
```

---

### GET /api/quota

Gibt verbleibende Tages-Scans zurück.

**Query Parameters:**
- `session_token` (optional) — Premium-Session-Token

**Response (200):**
```json
{
  "remaining": 1,
  "limit": 1,
  "isPremium": false,
  "premiumExpires": null
}
```

---

### POST /api/redeem-code

Löst einen Promo-Code ein.

**Request Body:**
```json
{
  "code": "LEAFSCAN2026",
  "device_id": "unique-device-id"
}
```

**Response (200):**
```json
{
  "success": true,
  "session_token": "...",
  "expires_at": "2026-04-23T..."
}
```

**Errors:**
- `400` — Code ungültig, abgelaufen oder bereits eingelöst
- `429` — Rate Limit

---

### GET /api/verify-session

Prüft ob ein Session-Token gültig ist.

**Query Parameters:**
- `token` — Session-Token

**Response (200):**
```json
{
  "valid": true,
  "plan": "premium",
  "expires_at": "2026-04-23T..."
}
```

---

### POST /api/feedback

Sendet Nutzer-Feedback zur Diagnose.

**Request Body:**
```json
{
  "rating": "positive",
  "diagnosis": "Kalziummangel",
  "severity": "mittel",
  "confidence": 82,
  "substrate": "Kokos",
  "fertilizer": "Canna Coco A+B",
  "fullDiagnosis": {...},
  "questionnaire": {...},
  "images": ["data:image/jpeg;base64,..."]
}
```

**Response (200):**
```json
{
  "success": true
}
```

---

### GET /api/announcement

Gibt die aktuelle aktive Ankündigung zurück.

**Response (200):**
```json
{
  "message": "Neue Version verfügbar!",
  "type": "info"
}
```

---

### POST /api/event

Trackt Funnel-Events für Analytics.

**Request Body:**
```json
{
  "event": "paywall_view",
  "meta": "{\"source\": \"home\"}"
}
```

**Response (200):**
```json
{
  "ok": true
}
```

**Events:** `paywall_view`, `paywall_close`, `purchase_start`, `purchase_complete`, `promo_view`, `promo_redeem`

---

### GET /api/health

Health Check.

**Response (200):**
```json
{
  "status": "ok"
}
```

---

## Stripe Endpoints

### GET /api/stripe/products

Gibt verfügbare Abo-Pläne zurück.

### POST /api/stripe/checkout

Erstellt eine Stripe Checkout-Session.

**Request Body:**
```json
{
  "priceId": "price_...",
  "sessionToken": "optional-existing-token"
}
```

### POST /api/stripe/portal

Erstellt einen Link zum Stripe Kundenportal.

**Request Body:**
```json
{
  "sessionToken": "..."
}
```

### POST /api/stripe/webhook

Stripe Webhook Handler. Verarbeitet:
- `checkout.session.completed` — Premium-Session erstellen
- `customer.subscription.updated` — Plan-Update
- `customer.subscription.deleted` — Premium deaktivieren

---

## Admin Endpoints

Alle Admin-Endpoints erfordern Header: `x-leafscan-key: <ADMIN_KEY>`

### GET /api/admin/dashboard
Übersicht: Scans, User, Feedback, Token-Usage, Kosten

### GET /api/admin/stats/scans
Scan-Trends über 30-90 Tage

### GET /api/admin/stats/diagnoses
Top-Diagnosen mit Confidence und Feedback

### GET /api/admin/stats/substrates
Substrat-Verteilung

### GET /api/admin/stats/platforms
Plattform-Verteilung (Web/App/APK)

### GET /api/admin/stats/hours
Scan-Verteilung nach Stunden

### GET /api/admin/stats/tokens
Token-Usage (Input/Output)

### GET /api/admin/stats/livefeed
Echtzeit-Scan-Aktivität

### GET /api/admin/stats/funnel
Conversion-Funnel

### GET /api/admin/stats/retention
Wiederkehrende Nutzer

### GET /api/admin/stats/diagnosis-trends
Diagnose-Trends über 30 Tage

### GET /api/admin/stats/confidence
Confidence-Verteilung

### GET /api/admin/stats/revenue
Umsatz-Stats (MRR, Churn, Conversion)

### GET /api/admin/stats/disk
Speicherplatz-Nutzung

### GET /api/admin/stats/ratelimits
Rate-Limit-Zähler per IP

### GET /api/admin/board
Server-Status (Uptime, Errors, Cache)

### Promo-Management
- `GET /api/admin/promos` — Alle Codes
- `POST /api/admin/promos` — Code erstellen
- `POST /api/admin/promos/toggle` — Code aktivieren/deaktivieren

### Premium-Management
- `GET /api/admin/premium` — Aktive Sessions
- `POST /api/admin/premium/grant` — Premium manuell gewähren

### Blacklist
- `GET /api/admin/blacklist` — Liste
- `POST /api/admin/blacklist` — IP sperren
- `DELETE /api/admin/blacklist` — IP entsperren

### Feedback
- `GET /api/admin/feedback` — Zusammenfassung
- `GET /api/admin/feedback-detailed` — Vollständig mit Bildern

### Announcements
- `GET /api/admin/announcements` — Alle
- `POST /api/admin/announcements` — Erstellen
- `POST /api/admin/announcements/toggle` — Aktivieren/Deaktivieren
- `DELETE /api/admin/announcements` — Löschen

### Re-Check
- `POST /api/admin/recheck` — Diagnose erneut ausführen
