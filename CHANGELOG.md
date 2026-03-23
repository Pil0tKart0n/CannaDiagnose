# Changelog

All notable changes to LeafScan will be documented in this file.

Format: [Keep a Changelog](https://keepachangelog.com/)

## [Unreleased]

### Changed
- Prettier: alle .ts/.tsx Dateien auto-formatiert (endOfLine: auto)
- 18 unused import/variable Warnings in 12 Dateien behoben
- services/claude.ts aufgeteilt: imageOptimization.ts (110Z) + referenceImages.ts (247Z), claude.ts 941→649 Zeilen
- services/i18n.ts aufgeteilt: Translations in de.json + en.json, i18n.ts 595→76 Zeilen
- ESLint Config verfeinert (no-console erlaubt, no-explicit-any deaktiviert)

### Added
- docs/contracts/api-v1.yaml — OpenAPI 3.0 Spec für alle Public Endpoints
- @playwright/test + eslint-config-prettier als devDependencies

### Fixed
- React Rules of Hooks Verletzung in questionnaire.tsx (useCallback nach early return)
- TypeScript Error: borderBottomWidth in _layout.tsx durch headerShadowVisible ersetzt
- Import-Order Violations in results.tsx und claude.ts
- Array<T> Notation in i18n.ts zu T[] korrigiert
- .gitignore: .aab Build-Artifacts ausgeschlossen

## [1.3.0] — 2026-03-23

### Added
- Skill-Engineering-System (12 Core + 6 Optional Skills)
- CLAUDE.md Projekt-Kontext für Claude Code
- README.md mit Quickstart und Projektstruktur
- API-Dokumentation (docs/api.md) für alle 40+ Endpoints
- Deployment Runbook (docs/deployment.md)
- GitHub Actions CI Pipeline (TypeScript, Tests, Security Audit)
- .env.example, .env.server.example, credentials.example.json Templates
- .claude/rules/ mit 6 Rule-Files (general, backend, frontend, security, testing, design)
- Architecture Diagrams (System Context, Container, ER, Diagnose-Flow, Deployment)
- 2 ADRs (Server-Modularisierung, Frontend-Extraktion)
- Performance Budgets (docs/performance/budgets.md)
- E2E Test-Setup mit Playwright Config
- 92 neue Unit Tests (Gesamt: 125)
- GitHub Issues Tracking (13 Issues, 2 Milestones, 30 Labels)
- Retrospektive mit 16 Findings und Verbesserungen

### Changed
- Server modularisiert: db.js, routes/admin.js, routes/stripe.js (index.js -61%)
- Frontend-Komponenten extrahiert: RefineCard, LegalFooter, InstallBanner, webStyles, colorCorrections
- Test-Coverage von 33 auf 125 Tests (+279%)
- ESLint + Prettier Konfiguration + Packages installiert
- package.json Version 1.3.0, neue Scripts (typecheck, lint, format)

### Fixed
- Doppelter BioNova-Eintrag in constants/fertilizers.ts (TypeScript-Fehler)
- Obsoleter TODO-Kommentar in purchases.ts entfernt

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
