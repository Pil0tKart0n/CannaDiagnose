import { QuestionnaireData } from '../types';

export const SYSTEM_PROMPT = `Du bist ein Experte für Cannabis-Pflanzengesundheit und -Pathologie. Du analysierst Fotos von Cannabispflanzen zusammen mit detaillierten Umgebungs- und Anbaudaten, um eine holistische Diagnose zu erstellen.

WICHTIG: Du MUSST visuelle Symptome immer mit den Umgebungsfaktoren kreuz-referenzieren. Zum Beispiel:
- Ein scheinbarer Magnesium-Mangel kann durch zu kaltes Substrat verursacht werden, das die Nährstoffaufnahme blockiert
- Gelbe Blätter können sowohl Stickstoffmangel als auch Überwässerung oder Lichtbrand bedeuten
- pH-Werte außerhalb des optimalen Bereichs können Nährstoff-Lockout verursachen, selbst wenn genug Nährstoffe vorhanden sind

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
  const parts: string[] = ['Hier sind die Anbaubedingungen meiner Cannabispflanze:\n'];

  // Pflanze
  parts.push('## Pflanze');
  if (data.growthPhase) parts.push(`- Wachstumsphase: ${data.growthPhase}`);
  if (data.plantAgeWeeks) parts.push(`- Alter: ${data.plantAgeWeeks} Wochen`);
  if (data.affectedAreas.length > 0) parts.push(`- Betroffene Bereiche: ${data.affectedAreas.join(', ')}`);

  // Substrat & Wasser
  parts.push('\n## Substrat & Wasser');
  if (data.substrateType) parts.push(`- Substrat: ${data.substrateType}`);
  if (data.substrateTempCelsius) parts.push(`- Substrat-Temperatur: ${data.substrateTempCelsius}°C`);
  if (data.phFeed) parts.push(`- pH Feed: ${data.phFeed}`);
  if (data.phRunoff) parts.push(`- pH Runoff: ${data.phRunoff}`);
  if (data.ecPpm) parts.push(`- EC/PPM: ${data.ecPpm}`);

  // Umgebung
  parts.push('\n## Umgebung');
  if (data.roomTempCelsius) parts.push(`- Raumtemperatur: ${data.roomTempCelsius}°C`);
  if (data.humidityPercent) parts.push(`- Luftfeuchtigkeit: ${data.humidityPercent}%`);
  if (data.lightType) parts.push(`- Beleuchtung: ${data.lightType}`);
  if (data.lightDistanceCm) parts.push(`- Lichtabstand: ${data.lightDistanceCm}cm`);

  // Kontext
  parts.push('\n## Kontext');
  if (data.wateringFrequency) parts.push(`- Gießfrequenz: ${data.wateringFrequency}`);
  if (data.fertilizerDetails) parts.push(`- Dünger: ${data.fertilizerDetails}`);
  if (data.symptomDurationDays) parts.push(`- Symptomdauer: ${data.symptomDurationDays} Tage`);
  if (data.recentChanges) parts.push(`- Kürzliche Änderungen: ${data.recentChanges}`);

  parts.push('\nBitte analysiere das beigefügte Foto zusammen mit diesen Daten und erstelle eine holistische Diagnose.');

  return parts.join('\n');
}
