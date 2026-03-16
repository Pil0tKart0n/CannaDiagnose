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
  calmagProduct: string;  // brand's own CalMag or 'included' or 'not available'
  calmagNote: string;     // specifics about CalMag usage in this system
  notes: string;
}

export const FERTILIZER_PROFILES: Record<string, FertilizerProfile> = {
  // ── MODERN TOP-HERSTELLER (2020–2026) ──────────────────────────────
  'Athena Pro': {
    name: 'Athena Pro', brand: 'Athena', type: 'mineral',
    ecRanges: { seedling: '0.4–0.8', earlyVeg: '1.0–1.6', lateVeg: '1.6–2.2', earlyFlower: '2.0–2.6', midFlower: '2.2–2.8', lateFlower: '0.0–0.4' },
    calmagProduct: 'Athena CaMg',
    calmagNote: 'Athena CaMg ist Teil des Pro-Line Feed Charts. In Kokos IMMER mitführen laut Athena-Schema. Dosierung laut Athena Feed Chart (meist 1-3 ml/L je nach Phase). KEIN fremdes CalMag verwenden.',
    notes: 'Hochkonzentriertes Mineralsalz-System (Core + Bloom). EC bewusst höher. Nur Athena-eigene Produkte empfehlen!',
  },
  'Athena Blended': {
    name: 'Athena Blended', brand: 'Athena', type: 'mineral',
    ecRanges: { seedling: '0.4–0.8', earlyVeg: '1.2–1.8', lateVeg: '1.8–2.4', earlyFlower: '2.2–2.8', midFlower: '2.4–3.0', lateFlower: '0.0–0.4' },
    calmagProduct: 'Athena CaMg',
    calmagNote: 'Athena Blended Feed Chart enthält CaMg-Dosierung. In Kokos ist Athena CaMg Pflicht. Dosierung: siehe Athena Blended Feed Chart. KEIN fremdes CalMag verwenden – Athena-System ist aufeinander abgestimmt.',
    notes: 'Pulverform (Grow + Bloom). Höhere EC als Pro-Line. Nur Athena-eigene Zusätze empfehlen (CaMg, Stack, Fade)!',
  },
  'Front Row Ag': {
    name: 'Front Row Ag', brand: 'Front Row', type: 'mineral',
    ecRanges: { seedling: '0.4–0.8', earlyVeg: '1.0–1.6', lateVeg: '1.6–2.2', earlyFlower: '2.0–2.6', midFlower: '2.2–2.8', lateFlower: '0.0–0.4' },
    calmagProduct: 'Im System enthalten (CALMAG+ als Zusatz)',
    calmagNote: 'Front Row hat ein eigenes CalMag-Produkt (CALMAG+). In Kokos empfohlen. Kein fremdes CalMag nötig.',
    notes: 'Kommerzieller Standard in US-Grows. Ähnliches Niveau wie Athena. Nur Front Row Produkte empfehlen.',
  },
  'Jacks Nutrients': {
    name: 'Jacks Nutrients (JR Peters)', brand: 'Jacks', type: 'mineral',
    ecRanges: { seedling: '0.4–0.6', earlyVeg: '0.8–1.4', lateVeg: '1.4–1.8', earlyFlower: '1.6–2.2', midFlower: '1.8–2.4', lateFlower: '0.4–0.8' },
    calmagProduct: 'Calcium Nitrate (Part B der 321-Formel)',
    calmagNote: 'Jacks 321 besteht aus Part A (5-12-26) + Part B (Calcium Nitrate) + Epsom Salt. CalMag ist über Part B + Epsom bereits im System. Kein zusätzliches CalMag nötig wenn 321 korrekt gemischt.',
    notes: 'Pulverform, 3-Komponenten (321). CalMag ist eingebaut. Extrem preiswert.',
  },
  'Veg+Bloom': {
    name: 'Veg+Bloom', brand: 'Hydroponic Research', type: 'mineral',
    ecRanges: { seedling: '0.4–0.8', earlyVeg: '1.0–1.4', lateVeg: '1.4–2.0', earlyFlower: '1.8–2.4', midFlower: '2.0–2.6', lateFlower: '0.4–0.8' },
    calmagProduct: 'Im Basisdünger enthalten',
    calmagNote: 'Veg+Bloom enthält bereits Ca und Mg. In hartem Wasser kein Extra-CalMag nötig. Bei weichem Wasser/RO ggf. +CaMg von Hydroponic Research.',
    notes: 'Ein-Komponenten-System. Starke Konzentration. Eigene Zusätze (Shine, Stackswell) empfehlen.',
  },
  'Rx Green Technologies': {
    name: 'Rx Green Technologies', brand: 'Rx Green', type: 'mineral',
    ecRanges: { seedling: '0.4–0.6', earlyVeg: '0.8–1.2', lateVeg: '1.2–1.6', earlyFlower: '1.4–1.8', midFlower: '1.6–2.0', lateFlower: '0.4–0.6' },
    calmagProduct: 'Kein eigenes CalMag', calmagNote: 'Kein herstellereigenes CalMag. Bei Bedarf generisches CalMag verwenden.',
    notes: 'US-Hersteller, wissenschaftlich orientiert. Moderate EC-Werte.',
  },
  'Emerald Harvest': {
    name: 'Emerald Harvest', brand: 'Emerald Harvest', type: 'mineral',
    ecRanges: { seedling: '0.4–0.6', earlyVeg: '0.8–1.4', lateVeg: '1.2–1.8', earlyFlower: '1.4–2.0', midFlower: '1.6–2.2', lateFlower: '0.4–0.8' },
    calmagProduct: 'Emerald Harvest Cal-Mag', calmagNote: 'Eigenes Cal-Mag Produkt verfügbar. In Kokos empfohlen.',
    notes: 'Professionelle US-Linie. 2- oder 3-Komponenten-System.',
  },
  'Cutting Edge Solutions': {
    name: 'Cutting Edge Solutions', brand: 'Cutting Edge', type: 'mineral',
    ecRanges: { seedling: '0.4–0.6', earlyVeg: '0.8–1.2', lateVeg: '1.2–1.6', earlyFlower: '1.4–1.8', midFlower: '1.6–2.0', lateFlower: '0.4–0.6' },
    calmagProduct: 'CES CaMg+', calmagNote: 'Eigenes CalMag-Produkt. Bei Kokos/RO-Wasser empfohlen.',
    notes: '3-Komponenten-System. Moderate EC-Werte.',
  },
  'Dyna-Gro': {
    name: 'Dyna-Gro', brand: 'Dyna-Gro', type: 'mineral',
    ecRanges: { seedling: '0.4–0.6', earlyVeg: '0.6–1.0', lateVeg: '1.0–1.4', earlyFlower: '1.2–1.6', midFlower: '1.4–1.8', lateFlower: '0.4–0.6' },
    calmagProduct: 'Dyna-Gro Mag-Pro', calmagNote: 'Mag-Pro für extra Mg. Foliage-Pro enthält bereits Ca/Mg. In Kokos Mag-Pro hinzufügen.',
    notes: 'Ein-Komponenten-System, einfache Anwendung.',
  },
  'Grow More': {
    name: 'Grow More', brand: 'Grow More', type: 'mineral',
    ecRanges: { seedling: '0.4–0.6', earlyVeg: '0.6–1.0', lateVeg: '1.0–1.4', earlyFlower: '1.2–1.6', midFlower: '1.4–1.8', lateFlower: '0.4–0.6' },
    calmagProduct: 'Kein eigenes CalMag', calmagNote: 'Kein herstellereigenes CalMag. Bei Bedarf generisches CalMag verwenden.',
    notes: 'US-Hersteller, solide Grunddüngung. Moderate EC-Werte.',
  },

  // ── KLASSIKER (Mineralisch) ────────────────────────────────────────
  'Canna Coco A+B': {
    name: 'Canna Coco A+B', brand: 'Canna', type: 'mineral',
    ecRanges: { seedling: '0.4–0.8', earlyVeg: '0.8–1.2', lateVeg: '1.2–1.6', earlyFlower: '1.4–1.8', midFlower: '1.6–2.0', lateFlower: '0.8–1.0' },
    calmagProduct: 'Canna CalMag Agent', calmagNote: 'Canna CalMag Agent für Kokos/weiches Wasser. CALMAG Agent ist speziell auf Canna abgestimmt. Kein fremdes CalMag verwenden.',
    notes: 'Speziell für Kokos. pH 5.8–6.2. Nur Canna-Produkte empfehlen.',
  },
  'Canna Terra': {
    name: 'Canna Terra', brand: 'Canna', type: 'mineral',
    ecRanges: { seedling: '0.4–0.6', earlyVeg: '0.6–1.0', lateVeg: '1.0–1.4', earlyFlower: '1.2–1.6', midFlower: '1.4–1.8', lateFlower: '0.6–0.8' },
    calmagProduct: 'Canna CalMag Agent', calmagNote: 'In Erde selten nötig. Falls doch: Canna CalMag Agent verwenden.',
    notes: 'Für Erde. Niedrigere EC. Nur Canna-Produkte empfehlen.',
  },
  'Canna Aqua': {
    name: 'Canna Aqua', brand: 'Canna', type: 'mineral',
    ecRanges: { seedling: '0.4–0.6', earlyVeg: '0.8–1.2', lateVeg: '1.2–1.6', earlyFlower: '1.4–1.8', midFlower: '1.6–2.0', lateFlower: '0.6–0.8' },
    calmagProduct: 'Canna CalMag Agent', calmagNote: 'In Hydro bei weichem Wasser/RO: Canna CalMag Agent.',
    notes: 'Für rezirkulierende Hydro-Systeme. Nur Canna-Produkte empfehlen.',
  },
  'Hesi': {
    name: 'Hesi', brand: 'Hesi', type: 'mineral',
    ecRanges: { seedling: '0.4–0.6', earlyVeg: '0.8–1.2', lateVeg: '1.0–1.4', earlyFlower: '1.2–1.6', midFlower: '1.4–1.8', lateFlower: '0.4–0.6' },
    calmagProduct: 'Kein eigenes CalMag', calmagNote: 'Hesi hat kein eigenes CalMag. Bei Bedarf generisches CalMag verwenden.',
    notes: 'Niederländisch, gut für Anfänger. Moderate EC-Werte.',
  },
  'Plagron': {
    name: 'Plagron', brand: 'Plagron', type: 'mineral',
    ecRanges: { seedling: '0.4–0.6', earlyVeg: '0.8–1.2', lateVeg: '1.0–1.6', earlyFlower: '1.4–1.8', midFlower: '1.6–2.0', lateFlower: '0.6–0.8' },
    calmagProduct: 'Plagron CalMag Pro', calmagNote: 'Plagron CalMag Pro für Kokos/weiches Wasser. Im Plagron-System bleiben.',
    notes: 'Niederländischer Premium-Dünger. Verschiedene Linien.',
  },
  'General Hydroponics Flora': {
    name: 'General Hydroponics / Terra Aquatica Flora', brand: 'GHE / Terra Aquatica', type: 'mineral',
    ecRanges: { seedling: '0.4–0.6', earlyVeg: '0.8–1.2', lateVeg: '1.2–1.6', earlyFlower: '1.4–1.8', midFlower: '1.6–2.0', lateFlower: '0.4–0.8' },
    calmagProduct: 'GHE CALiMAGic / Terra Aquatica CalMag', calmagNote: 'CALiMAGic (GHE) bzw. CalMag (Terra Aquatica). In Kokos/Hydro/RO-Wasser empfohlen.',
    notes: '3-Komponenten (Micro/Grow/Bloom). In Europa als Terra Aquatica.',
  },
  'Advanced Nutrients pH Perfect': {
    name: 'Advanced Nutrients pH Perfect', brand: 'Advanced Nutrients', type: 'mineral',
    ecRanges: { seedling: '0.4–0.8', earlyVeg: '0.8–1.2', lateVeg: '1.2–1.8', earlyFlower: '1.4–2.0', midFlower: '1.6–2.2', lateFlower: '0.6–0.8' },
    calmagProduct: 'Advanced Nutrients Sensi Cal-Mag Xtra', calmagNote: 'Sensi Cal-Mag Xtra für Kokos. pH Perfect System puffert pH automatisch.',
    notes: 'pH-buffered System. Nur AN-Produkte empfehlen.',
  },
  'Atami (ATA / B\'Cuzz)': {
    name: 'Atami (ATA / B\'Cuzz)', brand: 'Atami', type: 'mineral',
    ecRanges: { seedling: '0.4–0.6', earlyVeg: '0.8–1.2', lateVeg: '1.2–1.6', earlyFlower: '1.4–1.8', midFlower: '1.6–2.0', lateFlower: '0.4–0.6' },
    calmagProduct: 'Atami CalMag', calmagNote: 'Atami hat ein eigenes CalMag. Bei Kokos empfohlen.',
    notes: 'Niederländisch. ATA = Mineral, B\'Cuzz = Premium.',
  },
  'House & Garden': {
    name: 'House & Garden', brand: 'House & Garden', type: 'mineral',
    ecRanges: { seedling: '0.4–0.6', earlyVeg: '0.8–1.4', lateVeg: '1.4–1.8', earlyFlower: '1.6–2.2', midFlower: '1.8–2.4', lateFlower: '0.4–0.8' },
    calmagProduct: 'House & Garden CalMag', calmagNote: 'Eigenes CalMag-Produkt. In Kokos (Coco-Linie) oft nötig.',
    notes: 'Premium niederländisch. EC etwas höher. Nur H&G-Produkte empfehlen.',
  },
  'BioNova': {
    name: 'BioNova', brand: 'BioNova', type: 'mineral',
    ecRanges: { seedling: '0.4–0.6', earlyVeg: '0.8–1.2', lateVeg: '1.0–1.4', earlyFlower: '1.2–1.6', midFlower: '1.4–1.8', lateFlower: '0.4–0.6' },
    calmagProduct: 'BioNova CalMag', calmagNote: 'Eigenes CalMag verfügbar. Bei Kokos empfohlen.',
    notes: 'Niederländisch. Mineral- und BioMineral-Variante.',
  },
  'Metrop': {
    name: 'Metrop', brand: 'Metrop', type: 'mineral',
    ecRanges: { seedling: '0.4–0.8', earlyVeg: '1.0–1.6', lateVeg: '1.6–2.2', earlyFlower: '2.0–2.6', midFlower: '2.2–2.8', lateFlower: '0.4–0.8' },
    calmagProduct: 'Metrop CalGreen', calmagNote: 'CalGreen für Ca/Mg-Supplementierung. Bei Kokos empfohlen. Dosierung sehr gering da hochkonzentriert!',
    notes: 'Hochkonzentriert! Kleine Dosierung. EC-Werte bewusst hoch.',
  },
  'Hy-Pro': {
    name: 'Hy-Pro', brand: 'Hy-Pro', type: 'mineral',
    ecRanges: { seedling: '0.4–0.6', earlyVeg: '0.6–1.0', lateVeg: '1.0–1.4', earlyFlower: '1.2–1.6', midFlower: '1.4–1.8', lateFlower: '0.4–0.6' },
    calmagProduct: 'Kein eigenes CalMag', calmagNote: 'Kein herstellereigenes CalMag. Bei Bedarf generisches CalMag verwenden.',
    notes: 'Niederländischer Klassiker. Einfach, moderate EC-Werte.',
  },
  'Growth Technology': {
    name: 'Growth Technology', brand: 'Growth Technology', type: 'mineral',
    ecRanges: { seedling: '0.4–0.6', earlyVeg: '0.8–1.2', lateVeg: '1.0–1.6', earlyFlower: '1.4–1.8', midFlower: '1.6–2.0', lateFlower: '0.4–0.6' },
    calmagProduct: 'Growth Technology CalMag', calmagNote: 'Eigenes CalMag-Produkt verfügbar.',
    notes: 'Britischer Hersteller. Ionic-Linie bekannt.',
  },
  'Grotek': {
    name: 'Grotek', brand: 'Grotek', type: 'mineral',
    ecRanges: { seedling: '0.4–0.6', earlyVeg: '0.8–1.2', lateVeg: '1.0–1.6', earlyFlower: '1.4–1.8', midFlower: '1.6–2.0', lateFlower: '0.4–0.6' },
    calmagProduct: 'Grotek Cal-Max', calmagNote: 'Cal-Max für Ca/Mg-Supplementierung. Bei Kokos empfohlen.',
    notes: 'Kanadischer Hersteller. Solide Grunddüngung.',
  },
  'Mills Nutrients': {
    name: 'Mills Nutrients', brand: 'Mills', type: 'mineral',
    ecRanges: { seedling: '0.4–0.6', earlyVeg: '0.8–1.4', lateVeg: '1.4–1.8', earlyFlower: '1.6–2.2', midFlower: '1.8–2.4', lateFlower: '0.4–0.8' },
    calmagProduct: 'Mills CalMag', calmagNote: 'Eigenes CalMag-Produkt. In Kokos empfohlen. Im Mills-System bleiben.',
    notes: 'Hochkonzentriert, niederländisch. EC etwas höher.',
  },
  'Green House Feeding': {
    name: 'Green House Feeding', brand: 'Green House', type: 'mineral',
    ecRanges: { seedling: '0.4–0.6', earlyVeg: '0.8–1.2', lateVeg: '1.2–1.6', earlyFlower: '1.4–1.8', midFlower: '1.6–2.0', lateFlower: '0.4–0.6' },
    calmagProduct: 'Green House Calcium', calmagNote: 'Calcium-Pulver als Ca-Supplement. Für Mg: Bittersalz (Epsom). Bei Kokos empfohlen.',
    notes: 'Pulverdünger, preiswert und ergiebig.',
  },
  'Remo Nutrients': {
    name: 'Remo Nutrients', brand: 'Remo', type: 'mineral',
    ecRanges: { seedling: '0.4–0.6', earlyVeg: '0.8–1.2', lateVeg: '1.2–1.6', earlyFlower: '1.4–2.0', midFlower: '1.6–2.2', lateFlower: '0.4–0.8' },
    calmagProduct: 'Remo MagnifiCal', calmagNote: 'MagnifiCal ist Remos CalMag-Produkt. Bei Kokos empfohlen. Im Remo-System bleiben.',
    notes: 'Kanadisch. Mittleres bis höheres EC-Niveau.',
  },

  // ── BIOLOGISCH / ORGANISCH ─────────────────────────────────────────
  'BioBizz': {
    name: 'BioBizz', brand: 'BioBizz', type: 'organic',
    ecRanges: { seedling: '0.4–0.6', earlyVeg: '0.6–1.0', lateVeg: '1.0–1.4', earlyFlower: '1.2–1.6', midFlower: '1.4–1.8', lateFlower: '0.4–0.6' },
    calmagProduct: 'BioBizz CalMag',
    calmagNote: 'BioBizz CalMag ist organisch und auf das BioBizz-System abgestimmt. Bei Kokos empfohlen. Kein mineralisches CalMag verwenden im Bio-System.',
    notes: 'Organisch. EC-Messung weniger aussagekräftig (organische Bestandteile verfälschen). pH stellt sich in Erde meist selbst ein.',
  },
  'BioCanna': {
    name: 'BioCanna', brand: 'Canna', type: 'organic',
    ecRanges: { seedling: '0.4–0.6', earlyVeg: '0.6–1.0', lateVeg: '0.8–1.2', earlyFlower: '1.0–1.4', midFlower: '1.2–1.6', lateFlower: '0.4–0.6' },
    calmagProduct: 'Canna CalMag Agent',
    calmagNote: 'Canna CalMag Agent ist auch für BioCanna geeignet. Bei weichem Wasser empfohlen. Im Canna-System bleiben.',
    notes: 'Organische Linie von Canna. Nur für Erde geeignet. Niedrigere EC als Mineral-Varianten.',
  },
  'Plagron Alga / Bio': {
    name: 'Plagron Alga / Bio', brand: 'Plagron', type: 'organic',
    ecRanges: { seedling: '0.4–0.6', earlyVeg: '0.6–1.0', lateVeg: '0.8–1.2', earlyFlower: '1.0–1.4', midFlower: '1.2–1.6', lateFlower: '0.4–0.6' },
    calmagProduct: 'Plagron CalMag Pro',
    calmagNote: 'Plagron CalMag Pro auch für die Bio-Linie geeignet. Bei weichem Wasser/Kokos empfohlen.',
    notes: 'Organische Linie von Plagron. Algenbasiert. Für Erde. EC-Werte niedriger als Mineral.',
  },
  'Guanokalong': {
    name: 'Guanokalong', brand: 'Guanokalong', type: 'organic',
    ecRanges: { seedling: '0.2–0.4', earlyVeg: '0.4–0.8', lateVeg: '0.6–1.0', earlyFlower: '0.8–1.2', midFlower: '1.0–1.4', lateFlower: '0.2–0.4' },
    calmagProduct: 'Kein eigenes CalMag',
    calmagNote: 'Guanokalong hat kein eigenes CalMag. In Bio-Grows: Dolomit-Kalk oder organisches CalMag eines kompatiblen Herstellers.',
    notes: 'Fledermaus-Guano basiert. Sehr organisch, niedrige EC-Werte. Langsame Freisetzung.',
  },
  'BioTabs': {
    name: 'BioTabs', brand: 'BioTabs', type: 'organic',
    ecRanges: { seedling: '0.2–0.4', earlyVeg: '0.4–0.8', lateVeg: '0.6–1.0', earlyFlower: '0.8–1.2', midFlower: '1.0–1.4', lateFlower: '0.2–0.4' },
    calmagProduct: 'Im System enthalten (Startrex enthält Calcium)',
    calmagNote: 'BioTabs Startrex enthält Calcium. Zusätzliches CalMag selten nötig bei Water-Only. Bei Bedarf: Dolomit-Kalk.',
    notes: 'Tabletten-/Granulat-System für "Water Only"-Grows. EC-Messung kaum aussagekräftig da organisch + Slow-Release.',
  },
  'Green Buzz Liquids': {
    name: 'Green Buzz Liquids', brand: 'Green Buzz', type: 'organic',
    ecRanges: { seedling: '0.4–0.6', earlyVeg: '0.6–1.0', lateVeg: '0.8–1.4', earlyFlower: '1.0–1.6', midFlower: '1.2–1.6', lateFlower: '0.4–0.6' },
    calmagProduct: 'Green Buzz CalMag',
    calmagNote: 'Green Buzz hat ein eigenes organisches CalMag. Im Green Buzz System bleiben.',
    notes: 'Deutsche Marke, organisch. Living Soil Konzept. Moderate EC-Werte für Bio.',
  },
  'Organics Nutrients': {
    name: 'Organics Nutrients', brand: 'Organics Nutrients', type: 'organic',
    ecRanges: { seedling: '0.2–0.4', earlyVeg: '0.4–0.8', lateVeg: '0.6–1.0', earlyFlower: '0.8–1.2', midFlower: '1.0–1.4', lateFlower: '0.2–0.4' },
    calmagProduct: 'Kein eigenes CalMag',
    calmagNote: 'Kein herstellereigenes CalMag. Bei Bedarf organisches CalMag oder Dolomit-Kalk verwenden.',
    notes: 'Rein organisch. Niedrige EC-Werte. Für Erde/Living Soil.',
  },
  'Top Crop': {
    name: 'Top Crop', brand: 'Top Crop', type: 'hybrid',
    ecRanges: { seedling: '0.4–0.6', earlyVeg: '0.6–1.0', lateVeg: '1.0–1.4', earlyFlower: '1.2–1.6', midFlower: '1.4–1.8', lateFlower: '0.4–0.6' },
    calmagProduct: 'Kein eigenes CalMag',
    calmagNote: 'Top Crop hat kein eigenes CalMag. Bei Bedarf generisches CalMag verwenden.',
    notes: 'Spanischer Hersteller. Hybrid-Linie (organisch + mineralisch). Moderate EC-Werte.',
  },
  'Aptus': {
    name: 'Aptus', brand: 'Aptus', type: 'hybrid',
    ecRanges: { seedling: '0.4–0.6', earlyVeg: '0.8–1.2', lateVeg: '1.2–1.6', earlyFlower: '1.4–1.8', midFlower: '1.6–2.0', lateFlower: '0.4–0.6' },
    calmagProduct: 'Aptus CaMg-BOOST',
    calmagNote: 'Aptus CaMg-BOOST ist hochkonzentriert (geringe Dosierung!). Bei Kokos empfohlen. Im Aptus-System bleiben.',
    notes: 'Niederländisch. All-In-One Liquid als Einzelkomponente oder Multi-System. Moderate bis höhere EC.',
  },
  'Terra Aquatica Organic': {
    name: 'Terra Aquatica Organic', brand: 'Terra Aquatica', type: 'organic',
    ecRanges: { seedling: '0.4–0.6', earlyVeg: '0.6–1.0', lateVeg: '0.8–1.2', earlyFlower: '1.0–1.4', midFlower: '1.2–1.6', lateFlower: '0.4–0.6' },
    calmagProduct: 'Terra Aquatica CalMag',
    calmagNote: 'Terra Aquatica CalMag (ehemals GHE CALiMAGic) auch für die organische Linie nutzbar. Bei Kokos/RO empfohlen.',
    notes: 'Organische Linie von GHE/Terra Aquatica. Für Erde. Niedrigere EC als Flora-Serie.',
  },
  'BAC': {
    name: 'BAC', brand: 'BAC', type: 'hybrid',
    ecRanges: { seedling: '0.4–0.6', earlyVeg: '0.8–1.2', lateVeg: '1.0–1.4', earlyFlower: '1.2–1.6', midFlower: '1.4–1.8', lateFlower: '0.4–0.6' },
    calmagProduct: 'BAC CalMag',
    calmagNote: 'BAC hat ein eigenes CalMag-Produkt. Im BAC-System bleiben.',
    notes: 'Niederländisch. BioMineral-Konzept (organisch + mineralisch). Moderate EC-Werte.',
  },
  'Atami ATA NRG': {
    name: 'Atami ATA NRG', brand: 'Atami', type: 'hybrid',
    ecRanges: { seedling: '0.4–0.6', earlyVeg: '0.6–1.0', lateVeg: '1.0–1.4', earlyFlower: '1.2–1.6', midFlower: '1.4–1.8', lateFlower: '0.4–0.6' },
    calmagProduct: 'Atami CalMag',
    calmagNote: 'Atami CalMag auch für die NRG-Linie. Im Atami-System bleiben.',
    notes: 'Hybrid-Linie von Atami (organisch + mineralisch). Moderate EC-Werte.',
  },
  'House & Garden Bio': {
    name: 'House & Garden Bio', brand: 'House & Garden', type: 'organic',
    ecRanges: { seedling: '0.4–0.6', earlyVeg: '0.6–1.0', lateVeg: '0.8–1.2', earlyFlower: '1.0–1.4', midFlower: '1.2–1.6', lateFlower: '0.4–0.6' },
    calmagProduct: 'House & Garden CalMag',
    calmagNote: 'House & Garden CalMag auch für die Bio-Linie. Im H&G-System bleiben.',
    notes: 'Organische Bio 1-Component Linie. Einfach: ein Produkt für alles. Niedrigere EC als Mineral-Linie.',
  },
};

/** Get all fertilizer names for the dropdown */
export function getFertilizerNames(): string[] {
  return [...Object.keys(FERTILIZER_PROFILES), 'Anderer Dünger', 'Kein Dünger / nur Wasser'];
}

/** Get profile info as context string for Claude */
export function getFertilizerContext(fertilizerName: string | null, plantAge: string | null, growPhase?: string | null): string {
  if (!fertilizerName || fertilizerName === 'Anderer Dünger' || fertilizerName === 'Kein Dünger / nur Wasser') {
    return '';
  }

  const profile = FERTILIZER_PROFILES[fertilizerName];
  if (!profile) return '';

  let ecRange = '';
  let phase = '';
  if (plantAge && growPhase) {
    const isFlower = growPhase === 'Blüte';
    if (plantAge.includes('0–2') && !isFlower) { ecRange = profile.ecRanges.seedling; phase = 'Sämling'; }
    else if (plantAge.includes('3–4') && !isFlower) { ecRange = profile.ecRanges.earlyVeg; phase = 'frühe Veg'; }
    else if (plantAge.includes('5–8') && !isFlower) { ecRange = profile.ecRanges.lateVeg; phase = 'späte Veg'; }
    else if (plantAge.includes('0–2') && isFlower) { ecRange = profile.ecRanges.earlyFlower; phase = 'frühe Blüte'; }
    else if (plantAge.includes('3–4') && isFlower) { ecRange = profile.ecRanges.earlyFlower; phase = 'frühe Blüte'; }
    else if (plantAge.includes('5–8') && isFlower) { ecRange = profile.ecRanges.midFlower; phase = 'mittlere Blüte'; }
    else if (plantAge.includes('9–12') && isFlower) { ecRange = profile.ecRanges.lateFlower; phase = 'späte Blüte/Flush'; }
    else if (plantAge.includes('9–12') && !isFlower) { ecRange = profile.ecRanges.lateVeg; phase = 'späte Veg'; }
    else if (growPhase === 'Mutterpflanze') { ecRange = profile.ecRanges.lateVeg; phase = 'Mutterpflanze (Veg-Werte)'; }
  } else if (plantAge) {
    if (plantAge.includes('0–2')) { ecRange = profile.ecRanges.seedling; phase = 'Sämling'; }
    else if (plantAge.includes('3–4')) { ecRange = profile.ecRanges.earlyVeg; phase = 'frühe Veg'; }
    else if (plantAge.includes('5–8')) { ecRange = profile.ecRanges.lateVeg; phase = 'späte Veg'; }
    else if (plantAge.includes('9–12')) { ecRange = profile.ecRanges.earlyFlower; phase = 'frühe Blüte'; }
  }

  const typeLabel = profile.type === 'organic' ? 'organisch' : profile.type === 'hybrid' ? 'hybrid (bio+mineral)' : 'mineralisch';

  let context = '\nDÜNGER-KONTEXT (WICHTIG für EC-Bewertung und Produktempfehlungen):';
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

  // CalMag & Brand Loyalty
  context += '\n\nCALMAG & MARKENTREUE (ABSOLUT WICHTIG):';
  context += '\n- CalMag-Produkt: ' + profile.calmagProduct;
  context += '\n- CalMag-Info: ' + profile.calmagNote;
  context += '\n- ABSOLUTE REGEL: Empfehle NUR Produkte von ' + profile.brand + '! NIEMALS CalMag oder Zusätze von anderen Herstellern empfehlen!';
  context += '\n- Wenn der User ' + profile.name + ' nutzt, bleibe IMMER im ' + profile.brand + '-Ökosystem.';
  context += '\n- Wenn kein herstellereigenes CalMag existiert, sage das explizit und empfehle ein generisches/kompatibles CalMag – NIEMALS ein Produkt einer konkurrierenden Marke namentlich nennen.';

  return context;
}
