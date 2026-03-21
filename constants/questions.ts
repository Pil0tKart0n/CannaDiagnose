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
    options: ['Erde', 'Kokos', 'DWC / Hydro', 'Aeroponik', 'Living Soil', 'Sonstige'],
  },
  // 5. Fertilizer (hidden for Living Soil)
  {
    id: 'fertilizerType',
    section: 'Setup',
    question: 'Welchen Dünger verwendest du?',
    type: 'searchable-select',
    options: ['Kein Dünger / Nur Wasser', ...getFertilizerNames()],
    hint: 'Hilft bei der Einschätzung von EC-Werten',
    conditional: { field: 'substrateType', values: ['Erde', 'Kokos', 'DWC / Hydro', 'Aeroponik', 'Sonstige'] },
  },
  // 5a-org. Organic: Application method
  {
    id: 'organicMethod',
    section: 'Setup',
    question: 'Wie wendest du den Dünger an?',
    type: 'select',
    options: ['Flüssig ins Gießwasser', 'Top-Dress (auf die Erde)', 'Beides', 'Water Only (vorab eingemischt)'],
    hint: 'Beeinflusst die Nährstoff-Verfügbarkeit',
    conditional: { field: 'fertilizerCategory', values: ['organic', 'hybrid'] },
  },
  // 5b-org. Organic: Compost tea
  {
    id: 'organicTea',
    section: 'Setup',
    question: 'Verwendest du Komposttee oder Pflanzenjauche?',
    type: 'select',
    options: ['Ja, regelmäßig', 'Ja, gelegentlich', 'Nein'],
    conditional: { field: 'fertilizerCategory', values: ['organic', 'hybrid'] },
  },
  // 5c-org. Organic: Mycorrhiza
  {
    id: 'organicMycorrhiza',
    section: 'Setup',
    question: 'Verwendest du Mykorrhiza?',
    type: 'select',
    options: ['Ja', 'Nein', 'Weiß nicht'],
    hint: 'Mykorrhiza verbessert die Nährstoffaufnahme erheblich',
    conditional: { field: 'fertilizerCategory', values: ['organic', 'hybrid'] },
  },
  // 5d-org. Organic: Pot size
  {
    id: 'organicPotSize',
    section: 'Setup',
    question: 'Wie groß ist der Topf?',
    type: 'select',
    options: ['1–5L', '5–10L', '10–20L', '20–30L', '30–50L', '50L+', 'Weiß nicht'],
    hint: 'Kleinere Töpfe = schnellere Nährstoff-Erschöpfung',
    conditional: { field: 'fertilizerCategory', values: ['organic', 'hybrid'] },
  },
  // 5e-org. Organic: Water type
  {
    id: 'organicWaterType',
    section: 'Setup',
    question: 'Welches Wasser verwendest du?',
    type: 'select',
    options: ['Leitungswasser', 'Regenwasser', 'Osmosewasser (RO)', 'Gefiltert', 'Weiß nicht'],
    hint: 'RO-Wasser enthält kein Ca/Mg — wichtig für Bio',
    conditional: { field: 'fertilizerCategory', values: ['organic', 'hybrid'] },
  },
  // 5b. Living Soil: Amendments
  {
    id: 'livingsoilAmendments',
    section: 'Setup',
    question: 'Welche Amendments verwendest du?',
    type: 'multi-select',
    options: [
      'Wurmhumus',
      'Kompost',
      'Guano (Fledermaus/Seevogel)',
      'Blutmehl / Knochenmehl',
      'Fischmehl',
      'Algenmehl / Kelp',
      'Gesteinsmehl /Ite-Mehl',
      'Dolomit-Kalk',
      'Austernschalenmehl',
      'Mykorrhiza',
      'Neem-Kuchen',
      'Bio-Fertigmix (z.B. Buildasoil, KIS)',
      'Weiß nicht / Sonstige',
    ],
    hint: 'Was wurde dem Boden hinzugefügt?',
    conditional: { field: 'substrateType', values: ['Living Soil'] },
  },
  // 5c. Living Soil: Compost Tea
  {
    id: 'livingsoilTea',
    section: 'Setup',
    question: 'Verwendest du Komposttee oder Pflanzenjauche?',
    type: 'select',
    options: ['Ja, regelmäßig', 'Ja, gelegentlich', 'Nein', 'Weiß nicht'],
    conditional: { field: 'substrateType', values: ['Living Soil'] },
  },
  // 5d. Living Soil: Mulch
  {
    id: 'livingsoilMulch',
    section: 'Setup',
    question: 'Verwendest du Mulch als Abdeckung?',
    type: 'select',
    options: ['Ja (Stroh/Heu)', 'Ja (Blätter/Grasschnitt)', 'Ja (Cover Crop)', 'Nein', 'Weiß nicht'],
    conditional: { field: 'substrateType', values: ['Living Soil'] },
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
