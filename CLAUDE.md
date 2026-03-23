# CLAUDE.md — Project Context

> Auto-loaded by Claude Code at session start. Keep this file updated.

## Project

- **Name:** LeafScan (CannaDiagnose)
- **Description:** KI-gestützte Cannabis-Pflanzendiagnose-App. Nutzer fotografieren ihre Pflanze, beantworten einen Fragebogen und erhalten eine detaillierte Diagnose mit Behandlungsplan. Unterstützt Nährstoffmangel, Schädlinge, Krankheiten und Umweltprobleme. 100+ Referenzeinträge in der Bibliothek.
- **Status:** Live (Production auf leafscan.de)
- **Version:** 1.2.0
- **Domain:** https://leafscan.de

## Tech Stack

- **Frontend:** Expo 54 + React Native 0.81 + React 19, TypeScript (strict), Expo Router 6
- **Backend:** Express.js (Node.js 20), JavaScript
- **Database:** SQLite 3 (better-sqlite3, WAL mode)
- **AI:** OpenAI GPT-4o (Diagnose), GPT-4o-mini (Validation)
- **Payments:** Stripe (Web) + RevenueCat (Mobile)
- **Deployment:** Docker + Nginx (VPS), Let's Encrypt SSL
- **Platforms:** Web (PWA), Android (Google Play), iOS (geplant)
- **Testing:** Vitest (Server-Tests)

## Git Workflow (PFLICHT)

**Nach JEDER abgeschlossenen Änderung:**
1. `git add` der geänderten Dateien (spezifisch, nicht `-A`)
2. `git commit` mit Conventional Commit Message
3. `git push` zum Remote

**Niemals** mehrere Features ohne Commit/Push bauen. Jeder logische Schritt = ein Commit + Push.

```bash
# Commit-Format (Conventional Commits)
git commit -m "feat(scope): kurze Beschreibung"
git commit -m "fix(scope): was wurde gefixt"
git commit -m "style(scope): visuelle Änderung"
git commit -m "docs: Dokumentation aktualisiert"
```

## Key Files

| Bereich | Dateien |
|---------|---------|
| **Server** | `server/index.js` (Haupt-API), `server/prompts.js` (KI-Prompts + Korrektur-Matrix), `server/fertilizers.js` (Dünger-DB) |
| **App Screens** | `app/index.tsx` (Home), `app/camera.tsx`, `app/questionnaire.tsx`, `app/analyzing.tsx`, `app/results.tsx` (Ergebnisse + Verfeinerung) |
| **Services** | `services/claude.ts` (API-Client + Bildoptimierung), `services/storage.ts` (AsyncStorage), `services/quota.ts` (Rate Limiting), `services/purchases.ts` (RevenueCat), `services/i18n.ts` (DE/EN) |
| **Components** | `components/DiagnosisCard.tsx`, `components/QuestionCard.tsx`, `components/RecommendationCard.tsx`, `components/Button.tsx` |
| **Constants** | `constants/colors.ts`, `constants/fertilizers.ts` (40+ Dünger), `constants/library.ts` (100+ Einträge), `constants/questions.ts` |
| **Types** | `types/index.ts` (DiagnosisResult, DiagnosisEntry, Plant, QuestionnaireData) |
| **Knowledge** | `knowledge/*.txt` (Nährstoffmangel, Schädlinge, Umwelt) |
| **Config** | `Dockerfile`, `docker-compose.yml`, `nginx.conf`, `app.json`, `eas.json` |

## API Endpoints

### Public
| Endpoint | Method | Beschreibung |
|----------|--------|-------------|
| `/api/scan` | POST | Hauptdiagnose (Bilder + Fragebogen → GPT-4o) |
| `/api/validate` | POST | Bildvalidierung (ist es Cannabis?) |
| `/api/quota` | GET | Verbleibende Tages-Scans |
| `/api/redeem-code` | POST | Promo-Code einlösen |
| `/api/verify-session` | GET | Premium-Session prüfen |
| `/api/feedback` | POST | Diagnose-Feedback senden |
| `/api/announcement` | GET | Aktuelle Ankündigung |
| `/api/health` | GET | Health Check |

### Stripe
| Endpoint | Method | Beschreibung |
|----------|--------|-------------|
| `/api/stripe/products` | GET | Abo-Pläne |
| `/api/stripe/checkout` | POST | Checkout-Session |
| `/api/stripe/portal` | POST | Kundenportal |
| `/api/stripe/webhook` | POST | Stripe Events |

### Admin (Key-geschützt)
35+ Endpoints unter `/api/admin/*` — Dashboard, Stats, Livefeed, Promos, Blacklist, Announcements, Revenue

## Architecture Decisions

1. **Server-Side Prompts:** KI-Prompts auf dem Server, nicht im Client (Paywall-Schutz)
2. **Image Optimization:** Client-seitig 1568px max Resize (80-90% weniger Upload-Zeit)
3. **Correction Matrix:** 30+ lokale Regeln für pH/EC-basierte Diagnose-Verfeinerung
4. **EC/pH Evaluation:** Dünger-aware Logik (Marke + Wachstumsphase)
5. **Dual Payment:** RevenueCat (Mobile) + Stripe (Web)
6. **Rate Limiting:** IP-basiert, 1 Free Scan/Tag, 30 req/min pro IP
7. **SQLite WAL:** Crash-sicher, kein separater DB-Server nötig

## Conventions

- **Commits:** Conventional Commits (`feat:`, `fix:`, `docs:`, `test:`, `refactor:`)
- **Code Style:** TypeScript strict, kein `any`
- **Naming:** camelCase (Variablen/Funktionen), PascalCase (Komponenten/Types), kebab-case (Dateien)
- **Tests:** Co-located oder in `server/` für Backend
- **Sprache:** Code auf Englisch, UI-Texte in DE + EN (via i18n.ts)

## Deployment

- **Target:** Self-hosted Docker (VPS)
- **Domain:** leafscan.de
- **SSL:** Let's Encrypt (auto-renew)
- **Build:** `npx expo export --platform web` → Nginx serves static + Express API
- **Ports:** 80/443 (Nginx) → 4000 (Express, intern)

## Commands

```bash
npm run start       # Expo Dev Server
npm run web         # Web Development
npm run test        # Vitest Server Tests
npm run android     # Android Dev
npm run ios         # iOS Dev
```

## Environment Variables

Siehe `.env.example` und `.env.server.example` für alle benötigten Variablen.
**NIEMALS** echte Keys committen.

## Database Tables

| Tabelle | Zweck |
|---------|-------|
| `scan_log` | Rate Limiting (IP + Timestamp) |
| `premium_sessions` | Stripe-Abos + Session-Tokens |
| `promo_codes` | Promo-Code-Verwaltung |
| `promo_redemptions` | Einlösungs-Tracking |
| `feedback` | Einfaches Feedback (Rating) |
| `feedback_detailed` | Vollständige Diagnose + Bilder |
| `api_usage` | OpenAI Token/Kosten-Tracking |
| `ip_blacklist` | Gebannte IPs |
| `events` | Funnel-Tracking |
| `announcements` | Server-Ankündigungen |
| `scan_results` | Alle Diagnose-Ergebnisse |

## Skills System

Dieses Projekt nutzt ein Skill-Engineering-System. Skills verfügbar via `/command`:

| Command | Skill | Nutzen für |
|---------|-------|-----------|
| `/pm` | Project Lead | Status, Prioritäten, Sprint-Planung |
| `/security` | Security Engineer | Threat Modeling, Auth, DSGVO |
| `/backend` | Backend Engineer | API, Server-Logik, Integrations |
| `/frontend` | Frontend Engineer | UI, Komponenten, State |
| `/design` | Frontend Designer | Design System, Tokens, Animation |
| `/qa` | QA Test Engineer | Teststrategie, Quality Reports |
| `/devops` | DevOps Engineer | CI/CD, Docker, Deployment |
| `/docs` | Documentation Writer | API-Docs, Guides, README |
| `/content` | Content Strategist | Voice/Tone, Microcopy, Terminology |
| `/challenge` | Devil's Advocate | Risiko-Analyse, Edge Cases |
| `/retro` | Retrospective Engineer | Prozess-Feedback, Improvements |
| `/perf` | Performance Engineer | Profiling, Caching, Optimization |
| `/a11y` | Accessibility Engineer | WCAG Audits, Keyboard-Nav |

## Phase Log

### v1.0.0 — Initial Release (2026-02)
- KI-Diagnose mit GPT-4o, Fragebogen, Bibliothek
- Stripe Payment, Promo-Codes, Rate Limiting

### v1.1.0 — Enhancements (2026-03)
- Multi-Image Support (bis zu 3 Fotos)
- Diagnose-Verfeinerung (pH/EC/Dünger-Anpassung)
- Korrektur-Matrix (30+ Regeln)
- Pflanzen-Management + Verlauf

### v1.2.0 — Quality & Compliance (2026-03-23)
- DSGVO-konforme Datenbereinigung (7d IPs, 90d Daten)
- Impressum mit Postanschrift
- Privacy Policy vollständig
- Server-seitige Scan-Bild-Speicherung
- Admin Livefeed Dashboard
- Skill-System Integration

### v1.3.0 — Infrastructure & Code Quality (2026-03-23)
- CLAUDE.md, README.md, CHANGELOG.md, API-Docs, Deployment Runbook
- GitHub Actions CI Pipeline, ESLint + Prettier
- 6 Rule-Files, 2 ADRs, 5 Architecture Diagrams (C4, ER, Sequence, Deployment)
- 13 GitHub Issues (3 Epics + 10 Stories), 2 Sprint-Milestones, 30 Labels
- Server modularisiert: db.js, routes/admin.js, routes/stripe.js (index.js -61%)
- Frontend extrahiert: RefineCard, LegalFooter, InstallBanner, webStyles, colorCorrections
- Test-Coverage: 33 → 125 Tests (+279%)
- Security Audit bestanden (0 Vulnerabilities)
- Performance Budgets definiert
- BioNova Duplikat + TODO bereinigt
- Sprint 1 + Sprint 2 abgeschlossen, alle Issues closed

## Tracking

Projekt-Tracking über GitHub Issues:
- **Milestone 1:** Sprint 1 — Code Quality & Infrastructure (8 Issues)
- **Milestone 2:** Sprint 2 — Testing & Security (5 Issues)

```bash
gh issue list --milestone "Sprint 1: Code Quality & Infrastructure" --state open
gh issue list --milestone "Sprint 2: Testing & Security" --state open
```
