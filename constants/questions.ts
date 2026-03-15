import { Question } from '../types';
import { getFertilizerNames } from './fertilizers';

export const questions: Question[] = [
  {
    id: 'plantAgeWeeks',
    section: 'Pflanze',
    question: 'Wie alt ist die Pflanze?',
    type: 'select',
    options: ['0–2 Wochen', '3–4 Wochen', '5–8 Wochen', '9–12 Wochen', '3–4 Monate', '5+ Monate'],
  },
  {
    id: 'substrateType',
    section: 'Setup',
    question: 'In welchem Substrat wird angebaut?',
    type: 'select',
    options: ['Erde', 'Kokos', 'Perlite-Mix', 'DWC / Hydro', 'Aeroponik', 'Sonstige'],
  },
  {
    id: 'fertilizerType',
    section: 'Setup',
    question: 'Welchen Dünger verwendest du?',
    type: 'searchable-select',
    options: getFertilizerNames(),
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
