export interface FertilizerProfile {
  name: string;
  brand: string;
  type: 'mineral' | 'organic' | 'hybrid';
  ecRanges: {
    seedling: string;
    earlyVeg: string;
    lateVeg: string;
    earlyFlower: string;
    midFlower: string;
    lateFlower: string;
  };
  notes: string;
}

export const FERTILIZER_PROFILES: Record<string, FertilizerProfile> = {
  // ── MODERN TOP-HERSTELLER (2020–2026) ──────────────────────────────
  'Athena Pro': {
    name: 'Athena Pro', brand: 'Athena', type: 'mineral',
    ecRanges: { seedling: '0.4–0.8', earlyVeg: '1.0–1.6', lateVeg: '1.6–2.2', earlyFlower: '2.0–2.6', midFlower: '2.2–2.8', lateFlower: '0.0–0.4' },
    notes: 'Hochkonzentriertes Mineralsalz-System. EC bewusst höher als bei organischen Düngern. CalMag in Kokos zusätzlich nötig (Athena CaMg).',
  },
  'Athena Blended': {
    name: 'Athena Blended', brand: 'Athena', type: 'mineral',
    ecRanges: { seedling: '0.4–0.8', earlyVeg: '1.2–1.8', lateVeg: '1.8–2.4', earlyFlower: '2.2–2.8', midFlower: '2.4–3.0', lateFlower: '0.0–0.4' },
    notes: 'Pulverform von Athena. Noch höhere EC als Pro-Line. Separate CalMag-Gabe in Kokos Pflicht.',
  },
  'Front Row Ag': {
    name: 'Front Row Ag', brand: 'Front Row', type: 'mineral',
    ecRanges: { seedling: '0.4–0.8', earlyVeg: '1.0–1.6', lateVeg: '1.6–2.2', earlyFlower: '2.0–2.6', midFlower: '2.2–2.8', lateFlower: '0.0–0.4' },
    notes: 'Kommerzieller Standard in vielen US-Grows. Ähnliches Konzentrationsniveau wie Athena. CalMag in Kokos nötig.',
  },
  'Jacks Nutrients': {
    name: 'Jacks Nutrients (JR Peters)', brand: 'Jacks', type: 'mineral',
    ecRanges: { seedling: '0.4–0.6', earlyVeg: '0.8–1.4', lateVeg: '1.4–1.8', earlyFlower: '1.6–2.2', midFlower: '1.8–2.4', lateFlower: '0.4–0.8' },
    notes: 'Sehr verbreitet in Hydro & Coco. Pulverform, extrem ergiebig und preiswert. Jacks 321 ist die beliebteste Formel. CalMag meist eingebaut.',
  },
  'Veg+Bloom': {
    name: 'Veg+Bloom', brand: 'Hydroponic Research', type: 'mineral',
    ecRanges: { seedling: '0.4–0.8', earlyVeg: '1.0–1.4', lateVeg: '1.4–2.0', earlyFlower: '1.8–2.4', midFlower: '2.0–2.6', lateFlower: '0.4–0.8' },
    notes: 'Ein-Komponenten-System, einfach in der Anwendung. Starke Konzentration, EC tendenziell höher.',
  },
  'Rx Green Technologies': {
    name: 'Rx Green Technologies', brand: 'Rx Green', type: 'mineral',
    ecRanges: { seedling: '0.4–0.6', earlyVeg: '0.8–1.2', lateVeg: '1.2–1.6', earlyFlower: '1.4–1.8', midFlower: '1.6–2.0', lateFlower: '0.4–0.6' },
    notes: 'US-Hersteller, wissenschaftlich orientiert. Moderate EC-Werte.',
  },
  'Emerald Harvest': {
    name: 'Emerald Harvest', brand: 'Emerald Harvest', type: 'mineral',
    ecRanges: { seedling: '0.4–0.6', earlyVeg: '0.8–1.4', lateVeg: '1.2–1.8', earlyFlower: '1.4–2.0', midFlower: '1.6–2.2', lateFlower: '0.4–0.8' },
    notes: 'Professionelle US-Linie. 2- oder 3-Komponenten-System. Mittleres bis hohes EC-Niveau.',
  },
  'Cutting Edge Solutions': {
    name: 'Cutting Edge Solutions', brand: 'Cutting Edge', type: 'mineral',
    ecRanges: { seedling: '0.4–0.6', earlyVeg: '0.8–1.2', lateVeg: '1.2–1.6', earlyFlower: '1.4–1.8', midFlower: '1.6–2.0', lateFlower: '0.4–0.6' },
    notes: '3-Komponenten-System. Moderate EC-Werte, gut für Einsteiger.',
  },
  'Dyna-Gro': {
    name: 'Dyna-Gro', brand: 'Dyna-Gro', type: 'mineral',
    ecRanges: { seedling: '0.4–0.6', earlyVeg: '0.6–1.0', lateVeg: '1.0–1.4', earlyFlower: '1.2–1.6', midFlower: '1.4–1.8', lateFlower: '0.4–0.6' },
    notes: 'Ein-Komponenten-System, einfache Anwendung. Niedrigere bis moderate EC-Werte.',
  },
  'Grow More': {
    name: 'Grow More', brand: 'Grow More', type: 'mineral',
    ecRanges: { seedling: '0.4–0.6', earlyVeg: '0.6–1.0', lateVeg: '1.0–1.4', earlyFlower: '1.2–1.6', midFlower: '1.4–1.8', lateFlower: '0.4–0.6' },
    notes: 'US-Hersteller, solide Grunddüngung. Moderate EC-Werte.',
  },

  // ── KLASSIKER (Mineralisch) ────────────────────────────────────────
  'Canna Coco A+B': {
    name: 'Canna Coco A+B', brand: 'Canna', type: 'mineral',
    ecRanges: { seedling: '0.4–0.8', earlyVeg: '0.8–1.2', lateVeg: '1.2–1.6', earlyFlower: '1.4–1.8', midFlower: '1.6–2.0', lateFlower: '0.8–1.0' },
    notes: 'Speziell für Kokos. Enthält etwas Mg, aber CalMag in Kokos trotzdem oft nötig. pH 5.8–6.2.',
  },
  'Canna Terra': {
    name: 'Canna Terra', brand: 'Canna', type: 'mineral',
    ecRanges: { seedling: '0.4–0.6', earlyVeg: '0.6–1.0', lateVeg: '1.0–1.4', earlyFlower: '1.2–1.6', midFlower: '1.4–1.8', lateFlower: '0.6–0.8' },
    notes: 'Für Erde. Niedrigere EC als Kokos-Variante. Erde puffert mehr.',
  },
  'Canna Aqua': {
    name: 'Canna Aqua', brand: 'Canna', type: 'mineral',
    ecRanges: { seedling: '0.4–0.6', earlyVeg: '0.8–1.2', lateVeg: '1.2–1.6', earlyFlower: '1.4–1.8', midFlower: '1.6–2.0', lateFlower: '0.6–0.8' },
    notes: 'Für rezirkulierende Hydro-Systeme (DWC, NFT). Stabile Nährstoffverfügbarkeit.',
  },
  'Hesi': {
    name: 'Hesi', brand: 'Hesi', type: 'mineral',
    ecRanges: { seedling: '0.4–0.6', earlyVeg: '0.8–1.2', lateVeg: '1.0–1.4', earlyFlower: '1.2–1.6', midFlower: '1.4–1.8', lateFlower: '0.4–0.6' },
    notes: 'Niederländisch, gut für Anfänger. Moderate EC-Werte. Gibt es für Erde, Kokos und Hydro.',
  },
  'Plagron': {
    name: 'Plagron', brand: 'Plagron', type: 'mineral',
    ecRanges: { seedling: '0.4–0.6', earlyVeg: '0.8–1.2', lateVeg: '1.0–1.6', earlyFlower: '1.4–1.8', midFlower: '1.6–2.0', lateFlower: '0.6–0.8' },
    notes: 'Niederländischer Premium-Dünger. Verschiedene Linien (Terra, Hydro, Coco).',
  },
  'General Hydroponics Flora': {
    name: 'General Hydroponics / Terra Aquatica Flora', brand: 'GHE / Terra Aquatica', type: 'mineral',
    ecRanges: { seedling: '0.4–0.6', earlyVeg: '0.8–1.2', lateVeg: '1.2–1.6', earlyFlower: '1.4–1.8', midFlower: '1.6–2.0', lateFlower: '0.4–0.8' },
    notes: '3-Komponenten (Micro/Grow/Bloom). In Europa als Terra Aquatica. CalMag in Kokos/Hydro nötig.',
  },
  'Advanced Nutrients pH Perfect': {
    name: 'Advanced Nutrients pH Perfect', brand: 'Advanced Nutrients', type: 'mineral',
    ecRanges: { seedling: '0.4–0.8', earlyVeg: '0.8–1.2', lateVeg: '1.2–1.8', earlyFlower: '1.4–2.0', midFlower: '1.6–2.2', lateFlower: '0.6–0.8' },
    notes: 'pH-buffered System – korrigiert pH automatisch. Manuelle pH-Korrektur meist nicht nötig.',
  },
  'Atami (ATA / B\'Cuzz)': {
    name: 'Atami (ATA / B\'Cuzz)', brand: 'Atami', type: 'mineral',
    ecRanges: { seedling: '0.4–0.6', earlyVeg: '0.8–1.2', lateVeg: '1.2–1.6', earlyFlower: '1.4–1.8', midFlower: '1.6–2.0', lateFlower: '0.4–0.6' },
    notes: 'Niederländisch. ATA ist die Mineral-Linie, B\'Cuzz die Premium-Linie. Moderate EC-Werte.',
  },
  'House & Garden': {
    name: 'House & Garden', brand: 'House & Garden', type: 'mineral',
    ecRanges: { seedling: '0.4–0.6', earlyVeg: '0.8–1.4', lateVeg: '1.4–1.8', earlyFlower: '1.6–2.2', midFlower: '1.8–2.4', lateFlower: '0.4–0.8' },
    notes: 'Premium niederländischer Hersteller. EC etwas höher als Durchschnitt. Aqua Flakes für Hydro, Coco für Kokos.',
  },
  'BioNova': {
    name: 'BioNova', brand: 'BioNova', type: 'mineral',
    ecRanges: { seedling: '0.4–0.6', earlyVeg: '0.8–1.2', lateVeg: '1.0–1.4', earlyFlower: '1.2–1.6', midFlower: '1.4–1.8', lateFlower: '0.4–0.6' },
    notes: 'Niederländisch. Gibt es als Mineral- und BioMineral-Variante. Moderate EC-Werte.',
  },
  'Metrop': {
    name: 'Metrop', brand: 'Metrop', type: 'mineral',
    ecRanges: { seedling: '0.4–0.8', earlyVeg: '1.0–1.6', lateVeg: '1.6–2.2', earlyFlower: '2.0–2.6', midFlower: '2.2–2.8', lateFlower: '0.4–0.8' },
    notes: 'Hochkonzentriert! Sehr kleine Dosierung nötig. EC-Werte können hoch ausfallen – das ist bei Metrop normal.',
  },
  'Hy-Pro': {
    name: 'Hy-Pro', brand: 'Hy-Pro', type: 'mineral',
    ecRanges: { seedling: '0.4–0.6', earlyVeg: '0.6–1.0', lateVeg: '1.0–1.4', earlyFlower: '1.2–1.6', midFlower: '1.4–1.8', lateFlower: '0.4–0.6' },
    notes: 'Niederländischer Klassiker. Einfach in der Anwendung. Moderate EC-Werte.',
  },
  'Growth Technology': {
    name: 'Growth Technology', brand: 'Growth Technology', type: 'mineral',
    ecRanges: { seedling: '0.4–0.6', earlyVeg: '0.8–1.2', lateVeg: '1.0–1.6', earlyFlower: '1.4–1.8', midFlower: '1.6–2.0', lateFlower: '0.4–0.6' },
    notes: 'Britischer Hersteller. Ionic-Linie bekannt. Moderate EC-Werte.',
  },
  'Grotek': {
    name: 'Grotek', brand: 'Grotek', type: 'mineral',
    ecRanges: { seedling: '0.4–0.6', earlyVeg: '0.8–1.2', lateVeg: '1.0–1.6', earlyFlower: '1.4–1.8', midFlower: '1.6–2.0', lateFlower: '0.4–0.6' },
    notes: 'Kanadischer Hersteller. Solide Grunddüngung, moderate EC-Werte.',
  },
  'Mills Nutrients': {
    name: 'Mills Nutrients', brand: 'Mills', type: 'mineral',
    ecRanges: { seedling: '0.4–0.6', earlyVeg: '0.8–1.4', lateVeg: '1.4–1.8', earlyFlower: '1.6–2.2', midFlower: '1.8–2.4', lateFlower: '0.4–0.8' },
    notes: 'Hochkonzentriert, niederländisch. EC etwas höher als Durchschnitt. CalMag in Kokos nötig.',
  },
  'Green House Feeding': {
    name: 'Green House Feeding', brand: 'Green House', type: 'mineral',
    ecRanges: { seedling: '0.4–0.6', earlyVeg: '0.8–1.2', lateVeg: '1.2–1.6', earlyFlower: '1.4–1.8', midFlower: '1.6–2.0', lateFlower: '0.4–0.6' },
    notes: 'Pulverdünger, preiswert und ergiebig. EC nach dem Mischen messen.',
  },
  'Remo Nutrients': {
    name: 'Remo Nutrients', brand: 'Remo', type: 'mineral',
    ecRanges: { seedling: '0.4–0.6', earlyVeg: '0.8–1.2', lateVeg: '1.2–1.6', earlyFlower: '1.4–2.0', midFlower: '1.6–2.2', lateFlower: '0.4–0.8' },
    notes: 'Kanadisch. Mittleres bis höheres EC-Niveau. Gibt es als Mineral und Organic.',
  },

  // ── BIOLOGISCH / ORGANISCH ─────────────────────────────────────────
  'BioBizz': {
    name: 'BioBizz', brand: 'BioBizz', type: 'organic',
    ecRanges: { seedling: '0.4–0.6', earlyVeg: '0.6–1.0', lateVeg: '1.0–1.4', earlyFlower: '1.2–1.6', midFlower: '1.4–1.8', lateFlower: '0.4–0.6' },
    notes: 'Organisch. EC-Messung weniger aussagekräftig (organische Bestandteile verfälschen). pH stellt sich in Erde meist selbst ein.',
  },
  'BioCanna': {
    name: 'BioCanna', brand: 'Canna', type: 'organic',
    ecRanges: { seedling: '0.4–0.6', earlyVeg: '0.6–1.0', lateVeg: '0.8–1.2', earlyFlower: '1.0–1.4', midFlower: '1.2–1.6', lateFlower: '0.4–0.6' },
    notes: 'Organische Linie von Canna. Nur für Erde geeignet. Niedrigere EC als Mineral-Varianten.',
  },
  'Plagron Alga / Bio': {
    name: 'Plagron Alga / Bio', brand: 'Plagron', type: 'organic',
    ecRanges: { seedling: '0.4–0.6', earlyVeg: '0.6–1.0', lateVeg: '0.8–1.2', earlyFlower: '1.0–1.4', midFlower: '1.2–1.6', lateFlower: '0.4–0.6' },
    notes: 'Organische Linie von Plagron. Algenbasiert. Für Erde. EC-Werte niedriger als Mineral.',
  },
  'Guanokalong': {
    name: 'Guanokalong', brand: 'Guanokalong', type: 'organic',
    ecRanges: { seedling: '0.2–0.4', earlyVeg: '0.4–0.8', lateVeg: '0.6–1.0', earlyFlower: '0.8–1.2', midFlower: '1.0–1.4', lateFlower: '0.2–0.4' },
    notes: 'Fledermaus-Guano basiert. Sehr organisch, niedrige EC-Werte. Langsame Freisetzung.',
  },
  'BioTabs': {
    name: 'BioTabs', brand: 'BioTabs', type: 'organic',
    ecRanges: { seedling: '0.2–0.4', earlyVeg: '0.4–0.8', lateVeg: '0.6–1.0', earlyFlower: '0.8–1.2', midFlower: '1.0–1.4', lateFlower: '0.2–0.4' },
    notes: 'Tabletten-/Granulat-System für "Water Only"-Grows. EC-Messung kaum aussagekräftig da organisch + Slow-Release.',
  },
  'Green Buzz Liquids': {
    name: 'Green Buzz Liquids', brand: 'Green Buzz', type: 'organic',
    ecRanges: { seedling: '0.4–0.6', earlyVeg: '0.6–1.0', lateVeg: '0.8–1.4', earlyFlower: '1.0–1.6', midFlower: '1.2–1.6', lateFlower: '0.4–0.6' },
    notes: 'Deutsche Marke, organisch. Living Soil Konzept. Moderate EC-Werte für Bio.',
  },
  'Organics Nutrients': {
    name: 'Organics Nutrients', brand: 'Organics Nutrients', type: 'organic',
    ecRanges: { seedling: '0.2–0.4', earlyVeg: '0.4–0.8', lateVeg: '0.6–1.0', earlyFlower: '0.8–1.2', midFlower: '1.0–1.4', lateFlower: '0.2–0.4' },
    notes: 'Rein organisch. Niedrige EC-Werte. Für Erde/Living Soil.',
  },
  'Top Crop': {
    name: 'Top Crop', brand: 'Top Crop', type: 'hybrid',
    ecRanges: { seedling: '0.4–0.6', earlyVeg: '0.6–1.0', lateVeg: '1.0–1.4', earlyFlower: '1.2–1.6', midFlower: '1.4–1.8', lateFlower: '0.4–0.6' },
    notes: 'Spanischer Hersteller. Hybrid-Linie (organisch + mineralisch). Moderate EC-Werte.',
  },
  'Aptus': {
    name: 'Aptus', brand: 'Aptus', type: 'hybrid',
    ecRanges: { seedling: '0.4–0.6', earlyVeg: '0.8–1.2', lateVeg: '1.2–1.6', earlyFlower: '1.4–1.8', midFlower: '1.6–2.0', lateFlower: '0.4–0.6' },
    notes: 'Niederländisch. All-In-One Liquid als Einzelkomponente oder Multi-System. Moderate bis höhere EC.',
  },
  'Terra Aquatica Organic': {
    name: 'Terra Aquatica Organic', brand: 'Terra Aquatica', type: 'organic',
    ecRanges: { seedling: '0.4–0.6', earlyVeg: '0.6–1.0', lateVeg: '0.8–1.2', earlyFlower: '1.0–1.4', midFlower: '1.2–1.6', lateFlower: '0.4–0.6' },
    notes: 'Organische Linie von GHE/Terra Aquatica. Für Erde. Niedrigere EC als Flora-Serie.',
  },
  'BAC': {
    name: 'BAC', brand: 'BAC', type: 'hybrid',
    ecRanges: { seedling: '0.4–0.6', earlyVeg: '0.8–1.2', lateVeg: '1.0–1.4', earlyFlower: '1.2–1.6', midFlower: '1.4–1.8', lateFlower: '0.4–0.6' },
    notes: 'Niederländisch. BioMineral-Konzept (organisch + mineralisch). Moderate EC-Werte.',
  },
  'Atami ATA NRG': {
    name: 'Atami ATA NRG', brand: 'Atami', type: 'hybrid',
    ecRanges: { seedling: '0.4–0.6', earlyVeg: '0.6–1.0', lateVeg: '1.0–1.4', earlyFlower: '1.2–1.6', midFlower: '1.4–1.8', lateFlower: '0.4–0.6' },
    notes: 'Hybrid-Linie von Atami (organisch + mineralisch). Moderate EC-Werte.',
  },
  'House & Garden Bio': {
    name: 'House & Garden Bio', brand: 'House & Garden', type: 'organic',
    ecRanges: { seedling: '0.4–0.6', earlyVeg: '0.6–1.0', lateVeg: '0.8–1.2', earlyFlower: '1.0–1.4', midFlower: '1.2–1.6', lateFlower: '0.4–0.6' },
    notes: 'Organische Bio 1-Component Linie. Einfach: ein Produkt für alles. Niedrigere EC als Mineral-Linie.',
  },
};

/** Get all fertilizer names for the dropdown */
export function getFertilizerNames(): string[] {
  return [...Object.keys(FERTILIZER_PROFILES), 'Anderer Dünger', 'Kein Dünger / nur Wasser'];
}

/** Get profile info as context string for Claude */
export function getFertilizerContext(fertilizerName: string | null, plantAge: string | null): string {
  if (!fertilizerName || fertilizerName === 'Anderer Dünger' || fertilizerName === 'Kein Dünger / nur Wasser') {
    return '';
  }

  const profile = FERTILIZER_PROFILES[fertilizerName];
  if (!profile) return '';

  let ecRange = '';
  let phase = '';
  if (plantAge) {
    if (plantAge.includes('0–2')) { ecRange = profile.ecRanges.seedling; phase = 'Sämling'; }
    else if (plantAge.includes('3–4 Wochen')) { ecRange = profile.ecRanges.earlyVeg; phase = 'frühe Veg'; }
    else if (plantAge.includes('5–8')) { ecRange = profile.ecRanges.lateVeg; phase = 'späte Veg'; }
    else if (plantAge.includes('9–12')) { ecRange = profile.ecRanges.earlyFlower; phase = 'frühe Blüte'; }
    else if (plantAge.includes('3–4 Monate')) { ecRange = profile.ecRanges.midFlower; phase = 'mittlere Blüte'; }
    else if (plantAge.includes('5+')) { ecRange = profile.ecRanges.lateFlower; phase = 'späte Blüte/Flush'; }
  }

  const typeLabel = profile.type === 'organic' ? 'organisch' : profile.type === 'hybrid' ? 'hybrid (bio+mineral)' : 'mineralisch';

  let context = '\nDÜNGER-KONTEXT (WICHTIG für EC-Bewertung):';
  context += '\n- Dünger: ' + profile.name + ' (' + profile.brand + ', ' + typeLabel + ')';
  if (ecRange && phase) {
    context += '\n- Empfohlener EC laut Hersteller für ' + phase + ': ' + ecRange;
    context += '\n- WICHTIG: Bewerte den EC-Wert im Kontext DIESES Düngers! Ein EC von 2.3 bei ' + profile.name + ' kann völlig normal sein.';
  }
  if (profile.type === 'organic') {
    context += '\n- ACHTUNG: Organischer Dünger – EC-Messungen sind weniger aussagekräftig, da organische Bestandteile den EC verfälschen.';
  }
  context += '\n- Hinweis: ' + profile.notes;
  context += '\n- REGEL: Empfehle KEINE EC-Senkung wenn der EC im Hersteller-Feed-Chart liegt! Suche stattdessen andere Ursachen (pH, CalMag, Kationenaustausch).';

  return context;
}
