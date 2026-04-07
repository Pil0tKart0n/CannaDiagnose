# CLAUDE.md — Project Context

> Auto-loaded by Claude Code at session start. Keep this file updated.

## Project

- **Name:** LeafScan (CannaDiagnose)
- **Description:** KI-gestützte Cannabis-Pflanzendiagnose-App. Nutzer fotografieren ihre Pflanze, beantworten einen Fragebogen und erhalten eine detaillierte Diagnose mit Behandlungsplan. Unterstützt Nährstoffmangel, Schädlinge, Krankheiten und Umweltprobleme. 100+ Referenzeinträge in der Bibliothek.
- **Status:** Live (Production auf leafscan.de)
- **Version:** 1.4.0
- **Domain:** https://leafscan.de

## Tech Stack

- **Frontend:** Expo 54 + React Native 0.81 + React 19, TypeScript (strict), Expo Router 6
- **Backend:** Express.js (Node.js 20), JavaScript
- **Database:** SQLite 3 (better-sqlite3, WAL mode)
- **AI:** OpenAI GPT-4.1 (Diagnose), Validation immer true (Stub)
- **Payments:** Stripe (Web) + RevenueCat (Mobile)
- **Deployment:** Docker + Nginx (VPS), Let's Encrypt SSL
- **Platforms:** Web (PWA), Android (Google Play), iOS (geplant)
- **Testing:** Vitest (Unit/Integration), Playwright (E2E Web)

## Key Files

| Bereich | Dateien |
|---------|---------|
| **Server** | `server/index.js` (Express App + Public Routes), `server/db.js` (SQLite), `server/routes/admin.js`, `server/routes/stripe.js`, `server/prompts.js` (KI-Prompts + Korrektur-Matrix), `server/fertilizers.js` (Dünger-DB) |
| **App Screens** | `app/index.tsx` (Landing Page / Home), `app/camera.tsx`, `app/questionnaire.tsx`, `app/analyzing.tsx`, `app/results.tsx` |
| **Services** | `services/i18n.ts` (DE/EN), `services/imageOptimization.ts`, `services/referenceImages.ts`, `services/storage.ts`, `services/quota.ts`, `services/purchases.ts` |
| **Components** | `components/DiagnosisCard.tsx`, `components/QuestionCard.tsx`, `components/RecommendationCard.tsx`, `components/RefineCard.tsx`, `components/LegalFooter.tsx`, `components/InstallBanner.tsx` |
| **Constants** | `constants/colors.ts`, `constants/fertilizers.ts`, `constants/library.ts` (100+ Einträge), `constants/questions.ts`, `constants/webStyles.ts`, `constants/translations/de.json`, `constants/translations/en.json` |
| **Types** | `types/index.ts` (DiagnosisResult, DiagnosisEntry, Plant, QuestionnaireData) |
| **Knowledge** | `knowledge/*.txt` (Nährstoffmangel, Schädlinge, Umwelt) |
| **Config** | `Dockerfile`, `docker-compose.yml`, `nginx.conf`, `app.json`, `eas.json`, `inject-seo.sh` (Post-Build SEO), `public/sw.js` (Service Worker) |

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
- **Sprache:** Code auf Englisch, UI-Texte in DE + EN (via i18n)

## Deployment

- **Target:** Self-hosted Docker (VPS)
- **Domain:** leafscan.de
- **SSL:** Let's Encrypt (auto-renew)
- **Build:** `npx expo export --platform web` → `inject-seo.sh` (SEO-Tags) → Nginx serves static + Express API
- **Ports:** 80/443 (Nginx) → 4000 (Express, intern)

## Commands

```bash
npm run start       # Expo Dev Server
npm run web         # Web Development
npm run test        # Vitest Server Tests
npm run android     # Android Dev
npm run ios         # iOS Dev
```
