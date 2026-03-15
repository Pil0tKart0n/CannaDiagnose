export interface FertilizerProfile {
  name: string;
  brand: string;
  ecRanges: {
    seedling: string;   // 0-2 weeks
    earlyVeg: string;   // 3-4 weeks
    lateVeg: string;    // 5-8 weeks
    earlyFlower: string; // 9-12 weeks
    midFlower: string;  // 3-4 months
    lateFlower: string; // 5+ months / flush
  };
  notes: string;
}

export const FERTILIZER_PROFILES: Record<string, FertilizerProfile> = {
  'Athena Pro': {
    name: 'Athena Pro',
    brand: 'Athena',
    ecRanges: {
      seedling: '0.4–0.8',
      earlyVeg: '1.0–1.6',
      lateVeg: '1.6–2.2',
      earlyFlower: '2.0–2.6',
      midFlower: '2.2–2.8',
      lateFlower: '0.0–0.4',
    },
    notes: 'Hochkonzentriertes Mineralsalz-System. EC-Werte sind bewusst höher als bei organischen Düngern. CalMag in Kokos oft zusätzlich nötig (Athena CaMg). Nicht mit "normalen" EC-Richtwerten vergleichen!',
  },
  'Athena Blended': {
    name: 'Athena Blended',
    brand: 'Athena',
    ecRanges: {
      seedling: '0.4–0.8',
      earlyVeg: '1.2–1.8',
      lateVeg: '1.8–2.4',
      earlyFlower: '2.2–2.8',
      midFlower: '2.4–3.0',
      lateFlower: '0.0–0.4',
    },
    notes: 'Pulverform von Athena. Noch höhere EC als Pro-Line möglich. Separate CalMag-Gabe in Kokos Pflicht.',
  },
  'Canna Coco A+B': {
    name: 'Canna Coco A+B',
    brand: 'Canna',
    ecRanges: {
      seedling: '0.4–0.8',
      earlyVeg: '0.8–1.2',
      lateVeg: '1.2–1.6',
      earlyFlower: '1.4–1.8',
      midFlower: '1.6–2.0',
      lateFlower: '0.8–1.0',
    },
    notes: 'Speziell für Kokos entwickelt. Enthält bereits etwas Mg, aber in Kokos trotzdem oft CalMag zusätzlich nötig. Canna empfiehlt pH 5.8–6.2.',
  },
  'Canna Terra': {
    name: 'Canna Terra',
    brand: 'Canna',
    ecRanges: {
      seedling: '0.4–0.6',
      earlyVeg: '0.6–1.0',
      lateVeg: '1.0–1.4',
      earlyFlower: '1.2–1.6',
      midFlower: '1.4–1.8',
      lateFlower: '0.6–0.8',
    },
    notes: 'Für Erde. Niedrigere EC als Kokos-Variante. Erde puffert mehr, daher geringerer EC nötig.',
  },
  'BioBizz': {
    name: 'BioBizz',
    brand: 'BioBizz',
    ecRanges: {
      seedling: '0.4–0.6',
      earlyVeg: '0.6–1.0',
      lateVeg: '1.0–1.4',
      earlyFlower: '1.2–1.6',
      midFlower: '1.4–1.8',
      lateFlower: '0.4–0.6',
    },
    notes: 'Organischer Dünger. EC-Messungen weniger aussagekräftig als bei Mineraldüngern, da organische Bestandteile den EC-Wert verfälschen können. pH stellt sich in Erde meist selbst ein.',
  },
  'Advanced Nutrients pH Perfect': {
    name: 'Advanced Nutrients pH Perfect',
    brand: 'Advanced Nutrients',
    ecRanges: {
      seedling: '0.4–0.8',
      earlyVeg: '0.8–1.2',
      lateVeg: '1.2–1.8',
      earlyFlower: '1.4–2.0',
      midFlower: '1.6–2.2',
      lateFlower: '0.6–0.8',
    },
    notes: 'pH-buffered System – korrigiert pH automatisch. EC im mittleren Bereich. Wenn pH Perfect genutzt wird, ist manuelle pH-Korrektur meist nicht nötig.',
  },
  'General Hydroponics Flora': {
    name: 'General Hydroponics Flora',
    brand: 'GHE / Terra Aquatica',
    ecRanges: {
      seedling: '0.4–0.6',
      earlyVeg: '0.8–1.2',
      lateVeg: '1.2–1.6',
      earlyFlower: '1.4–1.8',
      midFlower: '1.6–2.0',
      lateFlower: '0.4–0.8',
    },
    notes: '3-Komponenten-System (Micro/Grow/Bloom). Flexibel mischbar. CalMag in Kokos/Hydro zusätzlich empfohlen. In Europa als Terra Aquatica verkauft.',
  },
  'Hesi': {
    name: 'Hesi',
    brand: 'Hesi',
    ecRanges: {
      seedling: '0.4–0.6',
      earlyVeg: '0.8–1.2',
      lateVeg: '1.0–1.4',
      earlyFlower: '1.2–1.6',
      midFlower: '1.4–1.8',
      lateFlower: '0.4–0.6',
    },
    notes: 'Niederländischer Dünger, gut für Anfänger. Moderate EC-Werte. Gibt es für Erde, Kokos und Hydro – je nach Variante leicht unterschiedlich.',
  },
  'Plagron': {
    name: 'Plagron',
    brand: 'Plagron',
    ecRanges: {
      seedling: '0.4–0.6',
      earlyVeg: '0.8–1.2',
      lateVeg: '1.0–1.6',
      earlyFlower: '1.4–1.8',
      midFlower: '1.6–2.0',
      lateFlower: '0.6–0.8',
    },
    notes: 'Niederländischer Premium-Dünger. Verschiedene Linien (Terra, Hydro, Coco). EC-Werte im Standardbereich.',
  },
  'Mills Nutrients': {
    name: 'Mills Nutrients',
    brand: 'Mills',
    ecRanges: {
      seedling: '0.4–0.6',
      earlyVeg: '0.8–1.4',
      lateVeg: '1.4–1.8',
      earlyFlower: '1.6–2.2',
      midFlower: '1.8–2.4',
      lateFlower: '0.4–0.8',
    },
    notes: 'Hochkonzentriert, niederländische Herkunft. EC etwas höher als Durchschnitt. CalMag in Kokos zusätzlich empfohlen.',
  },
  'Green House Feeding': {
    name: 'Green House Feeding',
    brand: 'Green House',
    ecRanges: {
      seedling: '0.4–0.6',
      earlyVeg: '0.8–1.2',
      lateVeg: '1.2–1.6',
      earlyFlower: '1.4–1.8',
      midFlower: '1.6–2.0',
      lateFlower: '0.4–0.6',
    },
    notes: 'Pulverdünger, preiswert und ergiebig. Löst sich in Wasser. EC nach dem Mischen messen und ggf. anpassen.',
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

  // Map plant age to EC range
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

  let context = '\nDÜNGER-KONTEXT (WICHTIG für EC-Bewertung):';
  context += '\n- Dünger: ' + profile.name + ' (' + profile.brand + ')';
  if (ecRange && phase) {
    context += '\n- Empfohlener EC laut Hersteller für ' + phase + ': ' + ecRange;
    context += '\n- WICHTIG: Bewerte den EC-Wert des Users im Kontext DIESES Düngers! Ein EC von 2.3 ist bei ' + profile.name + ' möglicherweise völlig normal, während es bei einem organischen Dünger zu hoch wäre.';
  }
  context += '\n- Hinweis: ' + profile.notes;
  context += '\n- REGEL: Empfehle KEINE EC-Senkung, wenn der gemessene EC im Bereich des Hersteller-Feed-Charts liegt! Stattdessen nach anderen Ursachen suchen (pH, CalMag, Kationenaustausch).';

  return context;
}
