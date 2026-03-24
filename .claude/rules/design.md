# Design Rules — LeafScan

## Color System
- Alle Farben definiert in `constants/colors.ts`
- Primary: `#5CE892` (LeafScan Grün)
- Secondary: `#D4A853` (Gold — Warning, Premium, Severity Medium)
- Landing Page Tokens: `textHero`, `accentMoss`, `accentForest`
- Dark Theme als Standard (Hintergrund: #080C0A / #0E1512)
- Nie hardcoded Color Values in Komponenten

## Typography
- Web: Playfair Display (Headlines/Branding) + DM Sans (Body/UI) via Google Fonts
- Mobile: System fonts (React Native default)
- Konsistente Größen: 12/14/16/18/20/24/28/32px
- Line-height: 1.4-1.6 für Body Text
- Titel max 48px (nicht größer)

## Animation
- Only animate `transform` and `opacity`
- Duration: entry ≤ 300ms, exit ≤ 200ms, hover ≤ 150ms
- `prefers-reduced-motion`: always respect on web
- Weiche Effekte bevorzugen: radial-gradient Glows, sanfte Fades
- Keine harten Balken, Pipe-Shapes oder offensichtliche UI-Overlays
- Shimmer/Glow-Effekte dezent und selten (≥5s Zyklen)

## Component State Matrix
Jede interaktive Komponente MUSS definieren:
- Default, Hover (Web), Active/Pressed, Focus-Visible, Disabled, Loading, Error

## Responsive
- Mobile-first (React Native)
- Web: Test at 320px, 768px, 1024px, 1440px
- Touch targets: 44x44px minimum, 8px gap

## Icons (HARD RULE)
- KEINE Emojis als UI-Icons — wirken billig
- Ionicons aus `@expo/vector-icons` verwenden (camera-outline, leaf-outline, etc.)
- Konsistente Größen

## Brand Identity
- Grün (#5CE892) als Hauptfarbe
- Dunkler Hintergrund (#080C0A / #0E1512)
- Moderne, cleane Ästhetik
- Cannabis-Blatt als Logo-Element
- Keine KI-Erwähnung in der UI (nur in AGB/Datenschutz)
- Tagline: "Scan it. Fix it."

## User-Preferences (aus Feedback)
- Mittlere Komplexität: nicht zu minimal, nicht zu überladen
- Hero-Bereich: Logo + Tagline + CTA — kein erklärender Text darüber
- Keine Trust-Chips oder Flow-Diagramme auf der Startseite
- Buttons als Nav bevorzugt, aber ohne Icons
- Hintergrund: Grain + Vignette ja, keine busy Patterns oder Partikel
- "Ergebnis in Sekunden" nie verwenden (dauert 30-45s real)
- Bilder mit schwarzem Hintergrund: radiale Vignette + Gradient-Fade integrieren
- Natürliche Farben: Grün muss dunkel/natürlich sein, nie Neon
- Kleine dezente Glow-Dots OK, große Lichtpunkte nicht
- Pfeile und offensichtliche UI-Elemente wirken "billig" — subtil einladen
