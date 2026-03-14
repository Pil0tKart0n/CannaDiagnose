import { Question } from '../types';

export const questions: Question[] = [
  // === Pflanze ===
  {
    id: 'plantAgeWeeks',
    section: 'Pflanze',
    question: 'Wie alt ist die Pflanze?',
    type: 'select',
    options: ['0–2 Wochen', '3–4 Wochen', '5–8 Wochen', '9–12 Wochen', '3–4 Monate', '5+ Monate'],
  },

  // === Substrat & Wasser ===
  {
    id: 'substrateType',
    section: 'Substrat & Wasser',
    question: 'In welchem Substrat wird angebaut?',
    type: 'select',
    options: ['Erde', 'Kokos', 'Perlite-Mix', 'DWC / Hydro', 'Aeroponik', 'Sonstige'],
  },
  {
    id: 'waterTempCelsius',
    section: 'Substrat & Wasser',
    question: 'Wie warm ist das Wasser im System?',
    type: 'select',
    options: ['Unter 16°C', '16–19°C', '19–22°C', '22–25°C', 'Über 25°C', 'Weiß nicht'],
    hint: 'Wichtig für Sauerstoffgehalt und Wurzelgesundheit',
    conditional: { field: 'substrateType', values: ['DWC / Hydro', 'Aeroponik'] },
  },
  {
    id: 'substrateTempCelsius',
    section: 'Substrat & Wasser',
    question: 'Ist das Substrat auffällig kalt oder warm?',
    type: 'select',
    options: ['Kalt (unter 18°C)', 'Normal', 'Warm (über 26°C)', 'Weiß nicht'],
    hint: 'Kaltes Substrat blockiert die Nährstoffaufnahme',
    conditional: { field: 'substrateType', values: ['Erde', 'Kokos', 'Perlite-Mix', 'Sonstige'] },
  },
  {
    id: 'phFeed',
    section: 'Substrat & Wasser',
    question: 'pH-Wert der Nährlösung?',
    type: 'select',
    options: ['Unter 5.5', '5.5–6.0', '6.0–6.5', '6.5–7.0', 'Über 7.0', 'Nicht gemessen'],
  },
  {
    id: 'ecPpm',
    section: 'Substrat & Wasser',
    question: 'EC/PPM der Nährlösung?',
    type: 'select',
    options: ['Unter 400', '400–800', '800–1200', '1200–1800', 'Über 1800', 'Nicht gemessen'],
    hint: 'Falls du einen EC-Meter hast',
  },

  // === Umgebung ===
  {
    id: 'lightType',
    section: 'Umgebung',
    question: 'Indoor oder Outdoor?',
    type: 'select',
    options: ['Indoor', 'Outdoor'],
  },
  {
    id: 'lightDistanceCm',
    section: 'Umgebung',
    question: 'Abstand der Lampe zur Pflanze?',
    type: 'select',
    options: ['Unter 20cm', '20–30cm', '30–45cm', '45–60cm', 'Über 60cm', 'Weiß nicht'],
    conditional: { field: 'lightType', values: ['Indoor'] },
  },
  {
    id: 'roomTempCelsius',
    section: 'Umgebung',
    question: 'Temperatur in der Umgebung?',
    type: 'select',
    options: ['Unter 18°C', '18–22°C', '22–26°C', '26–30°C', 'Über 30°C'],
  },
  {
    id: 'humidityPercent',
    section: 'Umgebung',
    question: 'Geschätzte Luftfeuchtigkeit?',
    type: 'select',
    options: ['Sehr trocken (unter 30%)', 'Trocken (30–45%)', 'Normal (45–60%)', 'Feucht (60–75%)', 'Sehr feucht (über 75%)', 'Weiß nicht'],
  },

  // === Kontext ===
  {
    id: 'symptomDurationDays',
    section: 'Kontext',
    question: 'Seit wann zeigen sich die Symptome?',
    type: 'select',
    options: ['Heute entdeckt', '1–2 Tage', '3–5 Tage', '1–2 Wochen', 'Länger als 2 Wochen'],
  },
  {
    id: 'recentChanges',
    section: 'Kontext',
    question: 'Gab es kürzlich Änderungen?',
    type: 'multi-select',
    options: ['Neuer Dünger', 'Dosis geändert', 'Umgetopft', 'Lampe gewechselt', 'Standort geändert', 'Nichts geändert'],
    hint: 'In den letzten 1–2 Wochen',
  },
];

export const sections = ['Pflanze', 'Substrat & Wasser', 'Umgebung', 'Kontext'];
