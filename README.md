# LeafScan — KI-Pflanzendiagnose

> Fotografiere deine Cannabis-Pflanze, beantworte ein paar Fragen und erhalte eine detaillierte Diagnose mit Behandlungsplan — powered by GPT-4o.

## Features

- **KI-Diagnose:** Bis zu 3 Fotos + Fragebogen → detaillierte Analyse mit Schweregrad, Ursachen und Aktionsplan
- **100+ Referenzeinträge:** Nährstoffmangel, Schädlinge, Krankheiten und Umweltprobleme in der Bibliothek
- **Diagnose-Verfeinerung:** Ergebnis nachträglich mit pH, EC, Dünger und Farbbeobachtungen anpassen
- **40+ Dünger-Profile:** EC-Bereiche pro Wachstumsphase für Athena, Canna, BioBizz, GHE und viele mehr
- **Pflanzen-Management:** Pflanzen anlegen und Diagnose-Verlauf pro Pflanze verfolgen
- **PDF-Export:** Diagnosen als PDF teilen
- **Mehrsprachig:** Deutsch und Englisch
- **Multi-Platform:** Web (PWA), Android (Google Play), iOS (geplant)

## Quick Start

### Voraussetzungen

- Node.js 20+
- npm

### Installation

```bash
# Dependencies installieren
npm install

# Environment-Variablen einrichten
cp .env.example .env
cp .env.server.example .env.server
# → Echte API-Keys in .env und .env.server eintragen

# Development Server starten
npm run start
```

### Web Development

```bash
npm run web
```

### Server starten (Backend)

```bash
cd server
node index.js
```

## Deployment

### Docker (Production)

```bash
# Web-App bauen
npx expo export --platform web

# Docker starten
docker compose up -d --build
```

### Umgebung

| Service | Port | Beschreibung |
|---------|------|-------------|
| Nginx | 80/443 | Reverse Proxy + Static Files |
| Express API | 4000 | Backend (intern) |

### SSL

Let's Encrypt Zertifikate werden automatisch verwaltet. Zertifikat-Verzeichnis: `/etc/letsencrypt/`

## Tech Stack

| Bereich | Technologie |
|---------|-------------|
| Frontend | Expo 54, React Native 0.81, TypeScript |
| Backend | Express.js, Node.js 20 |
| Datenbank | SQLite 3 (WAL mode) |
| KI | OpenAI GPT-4o |
| Payments | Stripe (Web), RevenueCat (Mobile) |
| Deployment | Docker, Nginx, Let's Encrypt |

## Projektstruktur

```
├── app/                # Expo Router Screens (Home, Kamera, Fragebogen, Ergebnisse, ...)
├── components/         # Wiederverwendbare React Native Komponenten
├── services/           # Business Logic (API-Client, Storage, Payments, i18n)
├── constants/          # Statische Daten (Farben, Dünger-DB, Bibliothek, Fragen)
├── types/              # TypeScript Interfaces
├── knowledge/          # Wissensbasis (Nährstoffmangel, Schädlinge, Umwelt)
├── server/             # Express.js Backend
│   ├── index.js        # API-Server + Routes
│   ├── prompts.js      # KI-Prompts + Korrektur-Matrix
│   └── fertilizers.js  # Dünger-Datenbank
├── public/             # Statische Web-Assets
├── assets/             # App-Icons, Splash Screens
├── Dockerfile          # Multi-stage Build
├── docker-compose.yml  # Production Setup
└── nginx.conf          # Reverse Proxy Config
```

## API

Alle Endpoints unter `/api/`. Vollständige Dokumentation: `docs/api.md`

| Endpoint | Beschreibung |
|----------|-------------|
| `POST /api/scan` | Hauptdiagnose (Bilder + Fragebogen) |
| `POST /api/validate` | Bildvalidierung |
| `GET /api/quota` | Verbleibende Scans |
| `POST /api/redeem-code` | Promo-Code einlösen |
| `GET /api/health` | Health Check |

## Lizenz

Proprietary — All Rights Reserved
