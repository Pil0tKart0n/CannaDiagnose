# Frontend Rules — LeafScan

## Components
- Functional components only (React Native)
- Props: always typed (interface/type), destructured in signature
- Edge states: always handle loading, error, empty, and success states
- Accessibility: semantic elements, ARIA where needed

## Styling
- Colors aus `constants/colors.ts` — nie hardcoded
- Responsive: Mobile-first (React Native), Web via react-native-web
- StyleSheet.create für alle Styles (performance)
- Touch targets: 44x44px minimum

## State & Data
- DiagnosisContext für globalen State (Bilder, Fragebogen, Ergebnis)
- AsyncStorage für Persistenz (Pflanzen, Verlauf)
- API-Calls über services/ — nie direkt in Komponenten
- Bilder: max 1568px vor Upload optimieren

## Platform-Handling
- Platform.OS === 'web' für Web-spezifische Logik
- Expo APIs mit Platform-Checks (Camera, FileSystem, etc.)
- PWA: Service Worker, Manifest, Install-Banner

## Performance
- Images: optimized format, lazy loading, explicit dimensions
- Heavy components: dynamic import where possible
- Base64 Cache für Bilder (max 3 gecached)

## i18n
- Alle UI-Texte via `services/i18n.ts`
- Sprache: DE (default) + EN
- Keys: `t('key')` — nie hardcoded Strings in Komponenten

## Testing
- Unit: test behavior, not implementation
- Test IDs: `testID="descriptive-name"` für E2E
- Vitest für Unit Tests
