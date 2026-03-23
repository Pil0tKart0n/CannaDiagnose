# Design Rules — LeafScan

## Color System
- Alle Farben definiert in `constants/colors.ts`
- Primary: `#5CE892` (LeafScan Grün)
- Dark Theme als Standard
- Nie hardcoded Color Values in Komponenten

## Typography
- System fonts (React Native default)
- Konsistente Größen: 12/14/16/18/20/24/28/32px
- Line-height: 1.4-1.6 für Body Text

## Animation
- Only animate `transform` and `opacity`
- Duration: entry ≤ 300ms, exit ≤ 200ms, hover ≤ 150ms
- `prefers-reduced-motion`: always respect on web

## Component State Matrix
Jede interaktive Komponente MUSS definieren:
- Default, Hover (Web), Active/Pressed, Focus-Visible, Disabled, Loading, Error

## Responsive
- Mobile-first (React Native)
- Web: Test at 320px, 768px, 1024px, 1440px
- Touch targets: 44x44px minimum, 8px gap

## Icons
- Emoji-basiert im aktuellen Design
- Konsistente Größen

## Brand Identity
- Grün (#5CE892) als Hauptfarbe
- Dunkler Hintergrund (#0a0a0a / #121212)
- Moderne, cleane Ästhetik
- Cannabis-Blatt als Logo-Element
