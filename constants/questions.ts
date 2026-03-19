import { Question } from '../types';
import { getFertilizerNames } from './fertilizers';

export const questions: Question[] = [
  // 1. Indoor/Outdoor first
  {
    id: 'lightType',
    section: 'Setup',
    question: 'Indoor oder Outdoor?',
    type: 'select',
    options: ['Indoor', 'Outdoor'],
  },
  // 2. Grow phase
  {
    id: 'growPhase',
    section: 'Pflanze',
    question: 'In welcher Phase ist die Pflanze?',
    type: 'select',
    options: ['Vegetativ', 'Blüte', 'Mutterpflanze'],
  },
  // 3a. Age: Indoor + Veg (max 8 weeks)
  {
    id: 'plantAgeWeeks',
    section: 'Pflanze',
    question: 'Wie alt ist die Pflanze?',
    type: 'select',
    options: ['0–2 Wochen', '3–4 Wochen', '5–6 Wochen', '7–8 Wochen'],
    conditional: { field: 'growPhase', values: ['Vegetativ'], and: { field: 'lightType', values: ['Indoor'] } },
  },
  // 3b. Age: Outdoor + Veg (max 14 weeks)
  {
    id: 'plantAgeWeeks',
    section: 'Pflanze',
    question: 'Wie alt ist die Pflanze?',
    type: 'select',
    options: ['0–2 Wochen', '3–4 Wochen', '5–6 Wochen', '7–8 Wochen', '9–10 Wochen', '11–12 Wochen', '13–14 Wochen'],
    conditional: { field: 'growPhase', values: ['Vegetativ'], and: { field: 'lightType', values: ['Outdoor'] } },
  },
  // 3c. Age: Blüte — individual weeks (same for indoor/outdoor)
  {
    id: 'plantAgeWeeks',
    section: 'Pflanze',
    question: 'In welcher Blütewoche?',
    type: 'select',
    options: [
      'Woche 1', 'Woche 2', 'Woche 3', 'Woche 4',
      'Woche 5', 'Woche 6', 'Woche 7', 'Woche 8',
      'Woche 9', 'Woche 10', 'Woche 11', 'Woche 12+',
    ],
    conditional: { field: 'growPhase', values: ['Blüte'] },
  },
  // 3d. Age: Mutterpflanze
  {
    id: 'plantAgeWeeks',
    section: 'Pflanze',
    question: 'Wie alt ist die Mutterpflanze?',
    type: 'select',
    options: ['5–8 Wochen', '9–12 Wochen', '13–16 Wochen', 'Älter als 16 Wochen'],
    conditional: { field: 'growPhase', values: ['Mutterpflanze'] },
  },
  // 4. Substrate
  {
    id: 'substrateType',
    section: 'Setup',
    question: 'In welchem Substrat wird angebaut?',
    type: 'select',
    options: ['Erde', 'Kokos', 'DWC / Hydro', 'Aeroponik', 'Sonstige'],
  },
  // 5. Fertilizer
  {
    id: 'fertilizerType',
    section: 'Setup',
    question: 'Welchen Dünger verwendest du?',
    type: 'searchable-select',
    options: ['Kein Dünger / Nur Wasser', ...getFertilizerNames()],
    hint: 'Hilft bei der Einschätzung von EC-Werten',
  },
  // 6. Symptom duration
  {
    id: 'symptomDurationDays',
    section: 'Kontext',
    question: 'Seit wann zeigen sich die Symptome?',
    type: 'select',
    options: ['Heute entdeckt', '1–2 Tage', '3–5 Tage', '1–2 Wochen', 'Länger als 2 Wochen'],
  },
  // 7. Recent changes
  {
    id: 'recentChanges',
    section: 'Kontext',
    question: 'Gab es kürzlich Änderungen?',
    type: 'multi-select',
    options: ['Neuer Dünger', 'Dosis geändert', 'Umgetopft', 'Lampe gewechselt', 'Standort geändert', 'Nichts geändert'],
    hint: 'In den letzten 1–2 Wochen',
  },
];

export const sections = ['Setup', 'Pflanze', 'Kontext'];
