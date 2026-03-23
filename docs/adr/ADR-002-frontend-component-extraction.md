# ADR-002: Frontend Component-Extraktion

## Status
In Arbeit

## Kontext
- `app/results.tsx` = 1111 Zeilen (Diagnose-Anzeige + Verfeinerung + Feedback)
- `app/index.tsx` = 903 Zeilen (Home Screen + Web CSS + PWA Logic)
- `services/claude.ts` = 941 Zeilen (API-Client + Bildoptimierung)

Diese God-Files mischen Business Logic, UI Rendering und State Management.

## Entscheidung
Konstanten, Hooks und UI-Blöcke in eigene Dateien extrahieren:

### Aus index.tsx extrahieren:
- `constants/webStyles.ts` — 136 Zeilen Web-CSS
- `components/HeroSection.tsx` — Logo + Tagline + Quota Badge
- `components/InstallBanner.tsx` — PWA/APK Install-Banner
- `components/PremiumUpgrade.tsx` — Premium-Button mit Shimmer
- `components/LegalFooter.tsx` — Privacy/Terms/Impressum Links

### Aus results.tsx extrahieren:
- `constants/colorCorrections.ts` — KNOWN_COLORS Array + applyColorCorrection()
- `components/RefineCard.tsx` — Collapsible Verfeinerungspanel
- `components/FeedbackButtons.tsx` — Positive/Negative Rating UI

### Aus claude.ts extrahieren:
- `services/imageOptimization.ts` — Bild-Resize und Caching Logic

## Konsequenzen
- **Positiv:** Testbarkeit, Wiederverwendbarkeit, Übersichtlichkeit
- **Negativ:** Mehr Dateien, Import-Ketten
