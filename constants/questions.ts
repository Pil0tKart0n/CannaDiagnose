import { Question } from '../types';
import { getFertilizerNames } from './fertilizers';

export const questions: Question[] = [
  {
    id: 'growPhase',
    section: 'Pflanze',
    question: 'In welcher Phase ist die Pflanze?',
    type: 'select',
    options: ['Vegetativ', 'Blüte', 'Mutterpflanze'],
  },
  // Age: Vegetativ
  {
    id: 'plantAgeWeeks',
    section: 'Pflanze',
    question: 'Wie alt ist die Pflanze?',
    type: 'select',
    options: ['0–2 Wochen', '3–4 Wochen', '5–6 Wochen'],
    conditional: { field: 'growPhase', values: ['Vegetativ'] },
  },
  // Age: Blüte — individual weeks for precision
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
  // Age: Mutterpflanze
  {
    id: 'plantAgeWeeks',
    section: 'Pflanze',
    question: 'Wie alt ist die Mutterpflanze?',
    type: 'select',
    options: ['5–8 Wochen', '9–12 Wochen', '13–16 Wochen', 'Älter als 16 Wochen'],
    conditional: { field: 'growPhase', values: ['Mutterpflanze'] },
  },
  {
    id: 'substrateType',
    section: 'Setup',
    question: 'In welchem Substrat wird angebaut?',
    type: 'select',
    options: ['Erde', 'Kokos', 'DWC / Hydro', 'Aeroponik', 'Sonstige'],
  },
  {
    id: 'fertilizerType',
    section: 'Setup',
    question: 'Welchen Dünger verwendest du?',
    type: 'searchable-select',
    options: ['Kein Dünger / Nur Wasser', ...getFertilizerNames()],
    hint: 'Hilft bei der Einschätzung von EC-Werten',
  },
  {
    id: 'lightType',
    section: 'Setup',
    question: 'Indoor oder Outdoor?',
    type: 'select',
    options: ['Indoor', 'Outdoor'],
  },
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

export const sections = ['Pflanze', 'Setup', 'Kontext'];
