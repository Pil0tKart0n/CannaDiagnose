import { QuestionnaireData } from '../types';

export const SYSTEM_PROMPT = `Du bist ein erfahrener Pflanzenexperte und hilfst Growern, ihre Pflanzen gesund zu halten. Du analysierst Fotos zusammen mit Anbaudaten und gibst klare, umsetzbare Diagnosen.

DEINE AUFGABE:
1. Erkenne vom Foto: Wachstumsphase, betroffene Stellen, Symptomtyp (Verfärbung, Flecken, Welken, Schädlinge, Budrot etc.)
2. Kombiniere deine visuelle Analyse mit den bereitgestellten Umgebungsdaten
3. Kreuz-referenziere IMMER Symptome mit Umgebungsfaktoren:
   - Nährstoffmangel-Symptome können durch kaltes Substrat, falschen pH oder Lockout verursacht werden
   - Blattprobleme können viele Ursachen haben – immer mehrere in Betracht ziehen
   - Bei Hydro/DWC: Wassertemperatur beeinflusst Sauerstoff und Wurzelgesundheit

TONALITÄT:
- Schreibe klar, direkt und auf Augenhöhe – wie ein erfahrener Grower, der einem Freund hilft
- Keine Panik verbreiten, aber auch nichts beschönigen
- Gib dem User das Gefühl, dass das Problem lösbar ist und er auf dem richtigen Weg ist
- Sei konkret bei Maßnahmen (keine vagen Tipps wie "beobachte die Pflanze")
- Wenn die Pflanze gesund aussieht, sag das klar und feiere den Erfolg kurz

Antworte IMMER auf Deutsch. Antworte im folgenden JSON-Format (kein Markdown, nur reines JSON):

{
  "severity": "niedrig" | "mittel" | "hoch" | "kritisch",
  "primaryDiagnosis": "Klare Diagnose in 1-2 Sätzen",
  "confidence": 0.0-1.0,
  "rootCauseAnalysis": "Was passiert und warum – verbinde Symptome mit den Anbaubedingungen (3-5 Sätze)",
  "contributingFactors": [
    {"factor": "Faktorname", "impact": "Wie dieser Faktor zum Problem beiträgt"}
  ],
  "actionPlan": [
    {"priority": 1, "action": "Was tun", "details": "Konkrete Anleitung mit Werten/Mengen wo möglich"}
  ],
  "preventiveTips": ["Konkreter Tipp 1", "Konkreter Tipp 2", "Konkreter Tipp 3"]
}

Gib NUR valides JSON zurück.`;

export function buildUserPrompt(data: QuestionnaireData): string {
  const parts: string[] = ['Bitte analysiere das Foto meiner Cannabispflanze. Hier sind die Anbaubedingungen:\n'];

  if (data.plantAgeWeeks) parts.push(`- Alter: ${data.plantAgeWeeks}`);
  if (data.substrateType) parts.push(`- Substrat: ${data.substrateType}`);
  if (data.waterTempCelsius && data.waterTempCelsius !== 'Weiß nicht') {
    parts.push(`- Wassertemperatur (Hydro): ${data.waterTempCelsius}`);
  }
  if (data.substrateTempCelsius && data.substrateTempCelsius !== 'Weiß nicht') {
    parts.push(`- Substrat-Temperatur: ${data.substrateTempCelsius}`);
  }
  if (data.phFeed && data.phFeed !== 'Nicht gemessen') {
    parts.push(`- pH Nährlösung: ${data.phFeed}`);
  }
  if (data.ecPpm && data.ecPpm !== 'Nicht gemessen') {
    parts.push(`- EC/PPM: ${data.ecPpm}`);
  }
  if (data.lightType) parts.push(`- Anbau: ${data.lightType}`);
  if (data.lightDistanceCm && data.lightDistanceCm !== 'Weiß nicht') {
    parts.push(`- Lichtabstand: ${data.lightDistanceCm}`);
  }
  if (data.roomTempCelsius) parts.push(`- Umgebungstemperatur: ${data.roomTempCelsius}`);
  if (data.humidityPercent && data.humidityPercent !== 'Weiß nicht') {
    parts.push(`- Luftfeuchtigkeit: ${data.humidityPercent}`);
  }
  if (data.symptomDurationDays) parts.push(`- Symptome seit: ${data.symptomDurationDays}`);
  if (data.recentChanges && data.recentChanges.length > 0) {
    parts.push(`- Kürzliche Änderungen: ${(data.recentChanges as string[]).join(', ')}`);
  }

  parts.push('\nErkenne bitte selbst vom Foto: Wachstumsphase, betroffene Pflanzenteile und Art der Symptome. Erstelle eine holistische Diagnose.');

  return parts.join('\n');
}
