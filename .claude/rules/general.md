# General Rules — LeafScan

## Git Workflow
- Conventional Commits: `feat(scope):`, `fix(scope):`, `docs:`, `test:`, `refactor:`, `perf:`, `chore:`
- Commit messages: imperative mood, max 72 chars, body for "why"
- Never commit secrets, .env files, node_modules, or build artifacts
- Jeder logische Schritt = 1 Commit + Push. Nie 3+ Features bündeln.

## Code Quality
- TypeScript strict mode — no `any`, no `as` casts (prefer type guards)
- No `console.log` in production code — use structured logging
- No commented-out code — delete it (Git has history)
- No magic numbers — use named constants
- Functions: single responsibility, max 30 lines preferred, always typed return

## Type-Reuse (HARD RULE)
- Existierende Types/Interfaces importieren, nie als Inline-Literal duplizieren
- Vor dem Erstellen eines neuen Types: prüfen ob bereits einer existiert
- Types leben in `types/index.ts`

## Replacement Discipline (HARD RULE)
- Wenn ein Modul durch ein neues ersetzt wird: Altes im SELBEN Commit löschen
- "Ich lösche das später" → nein, jetzt

## Shared-First (HARD RULE)
- Bevor du eine Utility-Funktion schreibst: suche ob sie bereits im Projekt existiert
- Niemals die gleiche Funktion in >1 Datei implementieren

## File Size (EMPFEHLUNG)
- Dateien > 300 Zeilen: beim nächsten logischen Anlass splitten
- God-Files (>500 Zeilen) sind ein Zeichen für fehlende Modularisierung

## Naming
- camelCase (variables/functions), PascalCase (components/types), kebab-case (files)
- Sprache: Code auf Englisch, UI-Texte via i18n

## Build-Verify (HARD RULE)
- After every newly created file → run `npx tsc --noEmit`
- Fix errors immediately before writing more files

## Environment Variables
- NIEMALS echte Keys/Secrets committen
- `.env.example` und `.env.server.example` als Referenz pflegen
- Server-side only: `process.env.SECRET` — never `EXPO_PUBLIC_` for secrets
