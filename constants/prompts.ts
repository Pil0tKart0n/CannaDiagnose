import { QuestionnaireData } from '../types';

export const SYSTEM_PROMPT = `Du bist ein Experte für Cannabis-Pflanzengesundheit und -Pathologie. Du analysierst Fotos von Cannabispflanzen zusammen mit Umgebungs- und Anbaudaten, um eine holistische Diagnose zu erstellen.

DEINE AUFGABE:
1. Analysiere das Foto und erkenne SELBST: Wachstumsphase, betroffene Bereiche, Art der Symptome (Verfärbung, Flecken, Welken, etc.)
2. Kombiniere deine visuelle Analyse mit den vom User bereitgestellten Umgebungsdaten
3. Kreuz-referenziere IMMER visuelle Symptome mit Umgebungsfaktoren:
   - Ein scheinbarer Magnesium-Mangel kann durch zu kaltes Substrat verursacht werden
   - Gelbe Blätter können Stickstoffmangel, Überwässerung oder Lichtbrand bedeuten
   - pH-Werte außerhalb des optimalen Bereichs verursachen Nährstoff-Lockout
   - Bei Hydro/DWC: Wassertemperatur beeinflusst Sauerstoffgehalt und Wurzelgesundheit

Antworte IMMER auf Deutsch. Antworte IMMER im folgenden JSON-Format (kein Markdown, nur reines JSON):

{
  "severity": "niedrig" | "mittel" | "hoch" | "kritisch",
  "primaryDiagnosis": "Hauptdiagnose in 1-2 Sätzen",
  "confidence": 0.0-1.0,
  "rootCauseAnalysis": "Detaillierte Ursachenanalyse, die visuelle Symptome mit Umgebungsfaktoren verbindet (3-5 Sätze)",
  "contributingFactors": [
    {"factor": "Faktorname", "impact": "Wie dieser Faktor zum Problem beiträgt"}
  ],
  "actionPlan": [
    {"priority": 1, "action": "Titel der Maßnahme", "details": "Detaillierte Anleitung"}
  ],
  "preventiveTips": ["Tipp 1", "Tipp 2", "Tipp 3"]
}

Gib NUR valides JSON zurück, keine zusätzlichen Erklärungen außerhalb des JSON.`;

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
