// English translations for the questionnaire
// Maps German text -> English text for questions, options, hints, and sections

export const questionTextsEn: Record<string, string> = {
  'Indoor oder Outdoor?': 'Indoor or Outdoor?',
  'In welcher Phase ist die Pflanze?': 'What phase is the plant in?',
  'Wie alt ist die Pflanze?': 'How old is the plant?',
  'In welcher Blütewoche?': 'What flowering week?',
  'Wie alt ist die Mutterpflanze?': 'How old is the mother plant?',
  'In welchem Substrat wird angebaut?': 'What substrate is being used?',
  'Welchen Dünger verwendest du?': 'What fertilizer are you using?',
  'Wie wendest du den Dünger an?': 'How do you apply the fertilizer?',
  'Verwendest du Komposttee oder Pflanzenjauche?': 'Do you use compost tea or plant ferment?',
  'Verwendest du Mykorrhiza?': 'Do you use mycorrhiza?',
  'Wie groß ist der Topf?': 'What is the pot size?',
  'Welches Wasser verwendest du?': 'What water are you using?',
  'Welche Amendments verwendest du?': 'What amendments are you using?',
  'Verwendest du Mulch als Abdeckung?': 'Do you use mulch as cover?',
  'Seit wann zeigen sich die Symptome?': 'How long have the symptoms been showing?',
  'Gab es kürzlich Änderungen?': 'Have there been any recent changes?',
};

export const optionTextsEn: Record<string, string> = {
  // Indoor/Outdoor
  'Indoor': 'Indoor',
  'Outdoor': 'Outdoor',

  // Grow phase
  'Vegetativ': 'Vegetative',
  'Blüte': 'Flowering',
  'Mutterpflanze': 'Mother Plant',

  // Plant age — vegetative weeks
  '0–2 Wochen': '0–2 Weeks',
  '3–4 Wochen': '3–4 Weeks',
  '5–6 Wochen': '5–6 Weeks',
  '7–8 Wochen': '7–8 Weeks',
  '9–10 Wochen': '9–10 Weeks',
  '11–12 Wochen': '11–12 Weeks',
  '13–14 Wochen': '13–14 Weeks',

  // Flowering weeks
  'Woche 1': 'Week 1',
  'Woche 2': 'Week 2',
  'Woche 3': 'Week 3',
  'Woche 4': 'Week 4',
  'Woche 5': 'Week 5',
  'Woche 6': 'Week 6',
  'Woche 7': 'Week 7',
  'Woche 8': 'Week 8',
  'Woche 9': 'Week 9',
  'Woche 10': 'Week 10',
  'Woche 11': 'Week 11',
  'Woche 12+': 'Week 12+',

  // Mother plant age
  '5–8 Wochen': '5–8 Weeks',
  '9–12 Wochen': '9–12 Weeks',
  '13–16 Wochen': '13–16 Weeks',
  'Älter als 16 Wochen': 'Older than 16 Weeks',

  // Substrate
  'Erde': 'Soil',
  'Kokos': 'Coco',
  'DWC / Hydro': 'DWC / Hydro',
  'Aeroponik': 'Aeroponics',
  'Living Soil': 'Living Soil',
  'Sonstige': 'Other',

  // Fertilizer
  'Kein Dünger / Nur Wasser': 'No Fertilizer / Water Only',

  // Organic application method
  'Flüssig ins Gießwasser': 'Liquid in water',
  'Top-Dress (auf die Erde)': 'Top-Dress (on the soil)',
  'Beides': 'Both',
  'Water Only (vorab eingemischt)': 'Water Only (pre-mixed)',

  // Compost tea
  'Ja, regelmäßig': 'Yes, regularly',
  'Ja, gelegentlich': 'Yes, occasionally',
  'Nein': 'No',

  // Mycorrhiza
  'Ja': 'Yes',
  'Weiß nicht': "Don't know",

  // Pot size
  '1–5L': '1–5L',
  '5–10L': '5–10L',
  '10–20L': '10–20L',
  '20–30L': '20–30L',
  '30–50L': '30–50L',
  '50L+': '50L+',

  // Water type
  'Leitungswasser': 'Tap water',
  'Regenwasser': 'Rainwater',
  'Osmosewasser (RO)': 'Reverse Osmosis (RO)',
  'Gefiltert': 'Filtered',

  // Living Soil amendments
  'Wurmhumus': 'Worm castings',
  'Kompost': 'Compost',
  'Guano (Fledermaus/Seevogel)': 'Guano (Bat/Seabird)',
  'Blutmehl / Knochenmehl': 'Blood meal / Bone meal',
  'Fischmehl': 'Fish meal',
  'Algenmehl / Kelp': 'Kelp meal / Kelp',
  'Gesteinsmehl /Ite-Mehl': 'Rock dust /ite meal',
  'Dolomit-Kalk': 'Dolomite lime',
  'Austernschalenmehl': 'Oyster shell meal',
  'Mykorrhiza': 'Mycorrhiza',
  'Neem-Kuchen': 'Neem cake',
  'Bio-Fertigmix (z.B. Buildasoil, KIS)': 'Organic premix (e.g. Buildasoil, KIS)',
  'Weiß nicht / Sonstige': "Don't know / Other",

  // Mulch
  'Ja (Stroh/Heu)': 'Yes (Straw/Hay)',
  'Ja (Blätter/Grasschnitt)': 'Yes (Leaves/Grass clippings)',
  'Ja (Cover Crop)': 'Yes (Cover Crop)',

  // Symptom duration
  'Heute entdeckt': 'Discovered today',
  '1–2 Tage': '1–2 Days',
  '3–5 Tage': '3–5 Days',
  '1–2 Wochen': '1–2 Weeks',
  'Länger als 2 Wochen': 'Longer than 2 Weeks',

  // Recent changes
  'Neuer Dünger': 'New fertilizer',
  'Dosis geändert': 'Dose changed',
  'Umgetopft': 'Repotted',
  'Lampe gewechselt': 'Light changed',
  'Standort geändert': 'Location changed',
  'Nichts geändert': 'Nothing changed',
};

export const hintTextsEn: Record<string, string> = {
  'Hilft bei der Einschätzung von EC-Werten': 'Helps estimate EC values',
  'Beeinflusst die Nährstoff-Verfügbarkeit': 'Affects nutrient availability',
  'Mykorrhiza verbessert die Nährstoffaufnahme erheblich': 'Mycorrhiza significantly improves nutrient uptake',
  'Kleinere Töpfe = schnellere Nährstoff-Erschöpfung': 'Smaller pots = faster nutrient depletion',
  'RO-Wasser enthält kein Ca/Mg — wichtig für Bio': 'RO water contains no Ca/Mg — important for organic',
  'Was wurde dem Boden hinzugefügt?': 'What was added to the soil?',
  'In den letzten 1–2 Wochen': 'In the last 1–2 weeks',
};

export const sectionTextsEn: Record<string, string> = {
  'Setup': 'Setup',
  'Pflanze': 'Plant',
  'Umgebung': 'Environment',
  'Kontext': 'Context',
};
