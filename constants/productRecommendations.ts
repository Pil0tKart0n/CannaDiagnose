/**
 * Product recommendations mapped to diagnosis keywords.
 * Affiliate links can be added to the `url` field when partnerships are established.
 * These appear as helpful tips in diagnosis results, not as advertisements.
 */

export interface ProductRecommendation {
  keyword: string;        // Matches against primaryDiagnosis (lowercase)
  product: string;        // Product name/type
  description: string;    // Why this helps (educational)
  brand?: string;         // Optional brand suggestion
  url?: string;           // Affiliate link (null = no link yet)
  category: 'nutrient' | 'pest' | 'tool' | 'substrate';
}

export const productRecommendations: ProductRecommendation[] = [
  // ── Nutrient deficiencies ──
  {
    keyword: 'kalzium',
    product: 'CalMag-Präparat',
    description: 'Gleicht Kalzium- und Magnesiummangel aus, besonders wichtig bei Kokos-Substrat und weichem Wasser.',
    category: 'nutrient',
  },
  {
    keyword: 'calcium',
    product: 'CalMag Supplement',
    description: 'Gleicht Kalzium- und Magnesiummangel aus, besonders wichtig bei Kokos-Substrat und weichem Wasser.',
    category: 'nutrient',
  },
  {
    keyword: 'magnesium',
    product: 'CalMag oder Bittersalz',
    description: 'Magnesiummangel zeigt sich oft an älteren Blättern. CalMag oder Epsom-Salz (Bittersalz) als Blattspray wirkt schnell.',
    category: 'nutrient',
  },
  {
    keyword: 'stickstoff',
    product: 'Stickstoff-Booster (Grow-Dünger)',
    description: 'In der Wachstumsphase braucht die Pflanze viel Stickstoff. Ein stickstoffreicher Grow-Dünger hilft.',
    category: 'nutrient',
  },
  {
    keyword: 'nitrogen',
    product: 'Nitrogen Booster (Grow Fertilizer)',
    description: 'In der Wachstumsphase braucht die Pflanze viel Stickstoff. Ein stickstoffreicher Grow-Dünger hilft.',
    category: 'nutrient',
  },
  {
    keyword: 'phosphor',
    product: 'PK-Booster (Blüte-Dünger)',
    description: 'Phosphor ist besonders in der Blüte wichtig. Ein PK-Booster fördert die Blütenbildung.',
    category: 'nutrient',
  },
  {
    keyword: 'kalium',
    product: 'Kalium-Supplement',
    description: 'Kaliummangel schwächt die Pflanze. Ein kaliumreicher Blüte-Dünger oder Kaliumsilikat hilft.',
    category: 'nutrient',
  },
  {
    keyword: 'eisen',
    product: 'Eisen-Chelat (Fe-EDDHA)',
    description: 'Eisenmangel zeigt sich an jungen Blättern. Eisen-Chelat ist die beste Ergänzung, besonders bei hohem pH.',
    category: 'nutrient',
  },
  {
    keyword: 'iron',
    product: 'Iron Chelate (Fe-EDDHA)',
    description: 'Eisenmangel zeigt sich an jungen Blättern. Eisen-Chelat ist die beste Ergänzung, besonders bei hohem pH.',
    category: 'nutrient',
  },
  {
    keyword: 'zink',
    product: 'Mikronährstoff-Mix',
    description: 'Zinkmangel tritt selten allein auf. Ein Mikronährstoff-Supplement deckt Zink, Mangan und andere Spurenelemente ab.',
    category: 'nutrient',
  },
  {
    keyword: 'ph',
    product: 'pH-Messgerät + pH-Down/Up',
    description: 'Der pH-Wert ist der häufigste Grund für Nährstoffprobleme. Ein digitales pH-Messgerät ist die wichtigste Investition.',
    category: 'tool',
  },
  {
    keyword: 'überwässerung',
    product: 'Stofftöpfe (Fabric Pots)',
    description: 'Stofftöpfe verbessern die Drainage und Belüftung der Wurzeln drastisch. Reduziert Überwässerung.',
    category: 'substrate',
  },
  {
    keyword: 'overwater',
    product: 'Fabric Pots',
    description: 'Fabric pots improve drainage and root aeration. Reduces overwatering risk.',
    category: 'substrate',
  },

  // ── Pests ──
  {
    keyword: 'spinnmilben',
    product: 'Neemöl / Raubmilben',
    description: 'Neemöl als Blattspray bei leichtem Befall. Bei starkem Befall: Raubmilben (biologische Bekämpfung) sind effektiver.',
    category: 'pest',
  },
  {
    keyword: 'spider mite',
    product: 'Neem Oil / Predatory Mites',
    description: 'Neem oil spray for light infestations. For heavy infestations, predatory mites are more effective.',
    category: 'pest',
  },
  {
    keyword: 'thrips',
    product: 'Gelbtafeln + Nützlinge',
    description: 'Gelbtafeln zum Monitoring, Raubmilben oder Florfliegenlarven zur biologischen Bekämpfung.',
    category: 'pest',
  },
  {
    keyword: 'trauermücke',
    product: 'Nematoden (Steinernema) + Gelbtafeln',
    description: 'Nematoden ins Gießwasser gegen die Larven im Boden. Gelbtafeln fangen die adulten Fliegen.',
    category: 'pest',
  },
  {
    keyword: 'fungus gnat',
    product: 'Nematodes + Yellow Sticky Traps',
    description: 'Add nematodes to water for larvae in soil. Yellow sticky traps catch adult flies.',
    category: 'pest',
  },
  {
    keyword: 'blattläuse',
    product: 'Kaliseife / Marienkäferlarven',
    description: 'Kaliseife als Kontaktspray. Bei Outdoor-Grows: Marienkäferlarven sind natürliche Blattlaus-Räuber.',
    category: 'pest',
  },

  // ── Diseases ──
  {
    keyword: 'schimmel',
    product: 'Entfeuchter + Ventilator',
    description: 'Schimmel entsteht bei hoher Luftfeuchtigkeit. Ein Entfeuchter und gute Luftzirkulation sind essentiell.',
    category: 'tool',
  },
  {
    keyword: 'mold',
    product: 'Dehumidifier + Fan',
    description: 'Mold thrives in high humidity. A dehumidifier and proper air circulation are essential.',
    category: 'tool',
  },
  {
    keyword: 'mehltau',
    product: 'Kaliumbicarbonat-Spray',
    description: 'Kaliumbicarbonat (Backpulver-Alternative) als Blattspray. Vorbeugend: Luftzirkulation verbessern.',
    category: 'pest',
  },
  {
    keyword: 'wurzelfäule',
    product: 'Mykorrhiza + Trichoderma',
    description: 'Nützliche Pilze (Mykorrhiza, Trichoderma) stärken das Wurzelsystem und bekämpfen Fäulniserreger.',
    category: 'substrate',
  },
];

/**
 * Find matching product recommendations for a diagnosis.
 * Returns max 2 recommendations.
 */
export function getRecommendations(primaryDiagnosis: string): ProductRecommendation[] {
  if (!primaryDiagnosis) return [];
  const lower = primaryDiagnosis.toLowerCase();
  const matches = productRecommendations.filter(r => lower.includes(r.keyword));
  return matches.slice(0, 2);
}
