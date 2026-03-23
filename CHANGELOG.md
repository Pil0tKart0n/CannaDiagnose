# Changelog

All notable changes to LeafScan will be documented in this file.

Format: [Keep a Changelog](https://keepachangelog.com/)

## [Unreleased]

### Added
- Skill-Engineering-System (12 Core + 6 Optional Skills)
- CLAUDE.md Projekt-Kontext für Claude Code
- README.md mit Quickstart und Projektstruktur
- API-Dokumentation (docs/api.md) für alle 40+ Endpoints
- Deployment Runbook (docs/deployment.md)
- GitHub Actions CI Pipeline (TypeScript, Tests, Security Audit)
- .env.example, .env.server.example, credentials.example.json Templates
- .claude/rules/ mit 6 Rule-Files (general, backend, frontend, security, testing, design)
- Architecture Diagrams (System Context, Container, ER, Diagnose-Flow)
- 2 ADRs (Server-Modularisierung, Frontend-Extraktion)
- Performance Budgets (docs/performance/budgets.md)
- E2E Test-Setup mit Playwright Config
- Retrospektive mit 16 Findings und Verbesserungen

### Changed
- Server modularisiert: db.js, routes/admin.js, routes/stripe.js (index.js -61%)
- Frontend-Komponenten extrahiert: RefineCard, LegalFooter, InstallBanner, webStyles, colorCorrections
- Test-Coverage von 33 auf 125 Tests (+279%)
- ESLint + Prettier Konfiguration + Packages installiert
- package.json Version 1.2.0, neue Scripts (typecheck, lint, format)
- BioNova Duplikat in Dünger-Datenbank bereinigt

### Fixed
- Doppelter BioNova-Eintrag in constants/fertilizers.ts (TypeScript-Fehler)

## [1.2.0] — 2026-03-23

### Added
- DSGVO-konforme automatische Datenbereinigung (7d IPs, 90d Daten)
- Server-seitige Scan-Bild-Speicherung
- Admin Livefeed Dashboard
- Postanschrift im Impressum (§5 TMG)

### Changed
- Privacy Policy vollständig überarbeitet (alle Server-seitigen Daten offengelegt)

### Fixed
- Feedback-Matching: Prefix-Vergleich + Datums-Parsing korrigiert

## [1.1.0] — 2026-03-15

### Added
- Multi-Image Support (bis zu 3 Fotos pro Diagnose)
- Diagnose-Verfeinerung (pH/EC/Dünger/Farb-Anpassung)
- Lokale Korrektur-Matrix (30+ Regeln für EC/pH-basierte Verfeinerung)
- Pflanzen-Management mit Diagnose-Verlauf
- 40+ Dünger-Profile mit EC-Bereichen pro Wachstumsphase
- Living Soil und organische Dünger-Unterstützung
- PDF-Export für Diagnosen

### Changed
- Bildoptimierung: Client-seitiges Resize auf max 1568px (80-90% schneller)
- Verbesserte Fragebogen-Logik mit konditionalen Fragen

## [1.0.0] — 2026-02-15

### Added
- KI-Diagnose mit GPT-4o (Bilder + Fragebogen)
- 100+ Referenzeinträge in der Bibliothek
- Stripe Payment Integration (Web)
- RevenueCat Integration (Mobile)
- Promo-Code System
- Rate Limiting (1 Free Scan/Tag)
- Admin Dashboard mit Stats
- Mehrsprachigkeit (DE/EN)
- PWA Support mit Service Worker
- Docker Deployment mit Nginx + SSL
