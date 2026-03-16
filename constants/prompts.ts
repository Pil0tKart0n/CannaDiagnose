import { QuestionnaireData, DiagnosisResult } from '../types';
import { getFertilizerContext, FERTILIZER_PROFILES } from './fertilizers';

/** Parse a number that may use comma as decimal separator (German format) */
function parseNum(value: string): number {
  return parseFloat(value.replace(',', '.'));
}

/**
 * Compares user's EC value against the fertilizer manufacturer's recommended range.
 * Returns a clear evaluation string that tells the AI whether EC is too low/high/ok.
 */
function evaluateEC(ecValue: string, fertilizerName: string, plantAge: string | null): string {
  const profile = FERTILIZER_PROFILES[fertilizerName];
  if (!profile) return '';

  const ecNum = parseNum(ecValue);
  if (isNaN(ecNum)) return '';

  // Determine the recommended range for the plant's age
  let ecRange = '';
  let phase = '';
  if (plantAge) {
    if (plantAge.includes('0–2')) { ecRange = profile.ecRanges.seedling; phase = 'Sämling'; }
    else if (plantAge.includes('3–4')) { ecRange = profile.ecRanges.earlyVeg; phase = 'frühe Veg'; }
    else if (plantAge.includes('5–8')) { ecRange = profile.ecRanges.lateVeg; phase = 'späte Veg'; }
    else if (plantAge.includes('9–12')) { ecRange = profile.ecRanges.earlyFlower; phase = 'frühe Blüte'; }
  }

  if (!ecRange || !phase) {
    // No age → use all ranges to give a general picture
    const allRanges = [
      profile.ecRanges.earlyVeg,
      profile.ecRanges.lateVeg,
      profile.ecRanges.earlyFlower,
      profile.ecRanges.midFlower,
    ];
    const allMins = allRanges.map(r => parseFloat(r.split('–')[0])).filter(n => !isNaN(n));
    const allMaxs = allRanges.map(r => parseFloat(r.split('–')[1])).filter(n => !isNaN(n));
    const overallMin = Math.min(...allMins);
    const overallMax = Math.max(...allMaxs);

    if (ecNum < overallMin) {
      return '\n🚨 EC-BEWERTUNG: EC ' + ecValue + ' liegt UNTER dem gesamten ' + profile.name + ' Bereich (' + overallMin + '–' + overallMax + ' für Veg bis Blüte). Die Pflanze ist UNTERVERSORGT! Bei genereller Unterversorgung ist N-MANGEL die wahrscheinlichste Ursache (N wird am meisten benötigt und zeigt Mangel zuerst). ÜBERPRÜFE ob die Erstdiagnose wirklich stimmt oder ob es N-Mangel durch zu wenig Dünger ist!';
    }
    return '';
  }

  // Parse the range (format: "1.8–2.4")
  const rangeParts = ecRange.split('–');
  const rangeMin = parseFloat(rangeParts[0]);
  const rangeMax = parseFloat(rangeParts[1]);

  if (isNaN(rangeMin) || isNaN(rangeMax)) return '';

  if (ecNum < rangeMin) {
    const deficit = ((1 - ecNum / rangeMin) * 100).toFixed(0);
    return '\n🚨 EC-BEWERTUNG: EC ' + ecValue + ' liegt ' + deficit + '% UNTER dem ' + profile.name + ' Zielbereich für ' + phase + ' (' + ecRange + '). Die Pflanze ist deutlich UNTERVERSORGT! Bei genereller Unterversorgung ist N-MANGEL die wahrscheinlichste Diagnose – N ist der mobilste Nährstoff und zeigt Mangel ZUERST. Wenn die Erstdiagnose Mg/Ca/Fe-Mangel war UND der pH optimal ist, ist die Diagnose WAHRSCHEINLICH FALSCH → korrigiere zu N-Mangel!';
  } else if (ecNum > rangeMax) {
    return '\n⚠️ EC-BEWERTUNG: EC ' + ecValue + ' liegt ÜBER dem ' + profile.name + ' Zielbereich für ' + phase + ' (' + ecRange + '). Nährstoffbrand oder Lockout möglich.';
  } else {
    return '\n✅ EC-BEWERTUNG: EC ' + ecValue + ' liegt IM ' + profile.name + ' Zielbereich für ' + phase + ' (' + ecRange + '). EC ist NICHT das Problem – suche andere Ursachen.';
  }
}

// ---------------------------------------------------------------------------
// Correction Matrix: Local logic for refine diagnosis
// Maps: (initial diagnosis keyword) + (EC state) + (pH state) → correction hint
// ---------------------------------------------------------------------------

type ECState = 'low' | 'ok' | 'high';
type PHState = 'low' | 'ok' | 'high';

interface CorrectionRule {
  correctedDiagnosis: string;
  explanation: string;
}

/**
 * Detects which nutrient/problem the initial diagnosis is about.
 */
function detectDiagnosisType(diagnosis: string): string {
  const d = diagnosis.toLowerCase();
  if (d.includes('stickstoff') || d.includes('(n)') || d.includes('n-mangel') || d.includes('nitrogen')) return 'N';
  if (d.includes('magnesium') || d.includes('(mg)') || d.includes('mg-mangel')) return 'Mg';
  if (d.includes('kalzium') || d.includes('calcium') || d.includes('(ca)') || d.includes('ca-mangel')) return 'Ca';
  if (d.includes('kalium') || d.includes('(k)') || d.includes('k-mangel') || d.includes('potassium')) return 'K';
  if (d.includes('phosphor') || d.includes('(p)') || d.includes('p-mangel')) return 'P';
  if (d.includes('eisen') || d.includes('(fe)') || d.includes('fe-mangel') || d.includes('iron')) return 'Fe';
  if (d.includes('mangan') || d.includes('(mn)') || d.includes('mn-mangel')) return 'Mn';
  if (d.includes('zink') || d.includes('(zn)') || d.includes('zn-mangel')) return 'Zn';
  if (d.includes('nährstoffbrand') || d.includes('überdüngung') || d.includes('nutrient burn') || d.includes('verbrennung')) return 'burn';
  if (d.includes('lichtbrand') || d.includes('light burn') || d.includes('gebleicht')) return 'lightburn';
  if (d.includes('hitzestress') || d.includes('heat stress')) return 'heat';
  if (d.includes('überwässerung') || d.includes('overwater')) return 'overwater';
  if (d.includes('n-toxizität') || d.includes('n-überschuss') || d.includes('stickstoff-überschuss') || d.includes('dunkelgrün')) return 'N-tox';
  if (d.includes('ph-lockout') || d.includes('lockout')) return 'lockout';
  return 'unknown';
}

/**
 * Determines EC state relative to the fertilizer's recommended range.
 */
function getECState(ecValue: string | null, fertilizerName: string | null, plantAge: string | null): ECState | null {
  if (!ecValue || !fertilizerName) return null;
  const profile = FERTILIZER_PROFILES[fertilizerName];
  if (!profile) return null;
  const ecNum = parseNum(ecValue);
  if (isNaN(ecNum)) return null;

  // Get recommended range
  let ecRange = '';
  if (plantAge) {
    if (plantAge.includes('0–2')) ecRange = profile.ecRanges.seedling;
    else if (plantAge.includes('3–4')) ecRange = profile.ecRanges.earlyVeg;
    else if (plantAge.includes('5–8')) ecRange = profile.ecRanges.lateVeg;
    else if (plantAge.includes('9–12')) ecRange = profile.ecRanges.earlyFlower;
  }

  if (!ecRange) {
    // Fallback: use earlyVeg–midFlower range
    const mins = [profile.ecRanges.earlyVeg, profile.ecRanges.lateVeg, profile.ecRanges.earlyFlower]
      .map(r => parseFloat(r.split('–')[0])).filter(n => !isNaN(n));
    const maxs = [profile.ecRanges.earlyVeg, profile.ecRanges.lateVeg, profile.ecRanges.earlyFlower]
      .map(r => parseFloat(r.split('–')[1])).filter(n => !isNaN(n));
    if (mins.length && maxs.length) {
      if (ecNum < Math.min(...mins)) return 'low';
      if (ecNum > Math.max(...maxs)) return 'high';
      return 'ok';
    }
    return null;
  }

  const parts = ecRange.split('–');
  const min = parseFloat(parts[0]);
  const max = parseFloat(parts[1]);
  if (isNaN(min) || isNaN(max)) return null;

  if (ecNum < min) return 'low';
  if (ecNum > max) return 'high';
  return 'ok';
}

/**
 * Determines pH state for the given substrate.
 */
function getPHState(phValue: string | null, substrateType: string | null): PHState | null {
  if (!phValue || !substrateType) return null;
  const phNum = parseNum(phValue);
  if (isNaN(phNum)) return null;

  const sub = substrateType.toLowerCase();
  const isKokosOrHydro = sub.includes('kokos') || sub.includes('coco') || sub.includes('hydro') || sub.includes('dwc') || sub.includes('aero');

  if (isKokosOrHydro) {
    if (phNum < 5.8) return 'low';
    if (phNum > 6.2) return 'high';
    return 'ok';
  } else {
    // Erde
    if (phNum < 6.0) return 'low';
    if (phNum > 7.0) return 'high';
    return 'ok';
  }
}

/**
 * The correction matrix: given initial diagnosis type + EC state + pH state,
 * returns a correction hint for the AI, or null if no correction needed.
 */
function getCorrectionHint(
  diagnosisType: string,
  ecState: ECState | null,
  phState: PHState | null,
): string | null {

  // ── GROUP 1: EC zu niedrig (Unterversorgung) ──────────────────────

  if (ecState === 'low' && phState === 'ok') {
    // Low EC + good pH → general underfeeding, N is always first
    const rules: Record<string, string> = {
      'Mg': '🔄 KORREKTUR WAHRSCHEINLICH: EC zu niedrig + pH optimal = generelle Unterversorgung. Bei niedrigem EC ist N-MANGEL viel wahrscheinlicher als Mg-Mangel! Mg-Mangel entsteht durch pH-Lockout (<5.8) oder fehlende CalMag-Ergänzung – NICHT durch niedrigen EC allein. Da der pH optimal ist, ist pH-Lockout ausgeschlossen. KORRIGIERE zu Stickstoff(N)-Mangel und empfehle EC zu erhöhen.',
      'Ca': '🔄 KORREKTUR WAHRSCHEINLICH: EC zu niedrig + pH optimal = generelle Unterversorgung. Ca-Mangel bei optimalem pH ist selten – Ca wird bei gutem pH gut aufgenommen. Wahrscheinlicher ist N-MANGEL (zeigt sich zuerst bei Unterversorgung). Prüfe aber ob neue Blätter deformiert sind (dann doch Ca). KORRIGIERE zu N-Mangel wenn alte Blätter gleichmäßig gelb.',
      'Fe': '🔄 KORREKTUR PRÜFEN: EC zu niedrig + pH optimal. Fe-Mangel ist normalerweise ein pH-Problem (>6.5), nicht ein EC-Problem. Bei optimalem pH UND niedrigem EC ist generelle Unterversorgung wahrscheinlicher. Prüfe: Sind NEUE Blätter betroffen (→ doch Fe) oder ALTE (→ N-Mangel)?',
      'K': '🔄 KORREKTUR PRÜFEN: EC zu niedrig + pH optimal. K-Mangel kann durch niedrigen EC entstehen, aber N-Mangel zeigt sich ZUERST. Prüfe: Sind die Blattränder braun/trocken (→ K-Mangel bestätigt) oder sind die Blätter gleichmäßig gelb (→ eher N)?',
      'P': '🔄 KORREKTUR PRÜFEN: EC zu niedrig + pH optimal. P-Mangel ist bei niedrigem EC möglich, aber N-Mangel zeigt sich ZUERST. Prüfe: Sind Blätter/Stängel violett (→ P bestätigt) oder gleichmäßig gelb (→ eher N)?',
      'Mn': '🔄 KORREKTUR WAHRSCHEINLICH: EC zu niedrig + pH optimal. Mn-Mangel bei optimalem pH ist extrem selten. Viel wahrscheinlicher ist generelle Unterversorgung → N-Mangel.',
      'Zn': '🔄 KORREKTUR WAHRSCHEINLICH: EC zu niedrig + pH optimal. Zn-Mangel bei optimalem pH ist extrem selten. Viel wahrscheinlicher ist generelle Unterversorgung → N-Mangel.',
      'burn': '🔄 WIDERSPRUCH: EC zu niedrig + Nährstoffbrand-Diagnose ist ein WIDERSPRUCH! Bei niedrigem EC kann es keinen Nährstoffbrand geben. KORRIGIERE die Diagnose – prüfe ob es Lichtbrand, Hitzestress oder K-Mangel ist.',
      'N-tox': '🔄 WIDERSPRUCH: EC zu niedrig + N-Überschuss ist ein WIDERSPRUCH! Bei niedrigem EC gibt es keinen N-Überschuss. KORRIGIERE die Diagnose.',
      'N': '✅ BESTÄTIGT: EC zu niedrig + pH optimal + N-Mangel-Diagnose passt perfekt. Die Pflanze bekommt zu wenig Nährstoffe, N zeigt Mangel zuerst. Empfehle EC auf Herstellerbereich erhöhen.',
      'lockout': '🔄 KORREKTUR: EC zu niedrig + pH optimal = KEIN Lockout! Lockout wird durch falschen pH verursacht. Das Problem ist generelle Unterversorgung → EC erhöhen.',
    };
    return rules[diagnosisType] || '⚠️ EC liegt unter dem empfohlenen Bereich des Herstellers bei optimalem pH. Das deutet auf generelle Unterversorgung hin. N-Mangel ist bei Unterversorgung immer die wahrscheinlichste Ursache (zeigt sich zuerst). Prüfe ob die Erstdiagnose wirklich stimmt oder ob EC-Erhöhung das eigentliche Problem löst.';
  }

  if (ecState === 'low' && phState === 'low') {
    // Low EC + low pH → double problem: underfeeding + lockout
    const rules: Record<string, string> = {
      'Mg': '⚠️ DOPPELPROBLEM: EC zu niedrig UND pH zu niedrig. Beides kann Mg-Mangel verursachen – der niedrige pH blockiert Mg-Aufnahme (Lockout) UND der niedrige EC liefert zu wenig Nährstoffe insgesamt. BEIDE Probleme beheben: pH auf optimalen Bereich korrigieren UND EC auf Herstellerbereich erhöhen. Mg-Mangel-Diagnose ist hier plausibel, aber N-Mangel liegt wahrscheinlich auch vor.',
      'Ca': '⚠️ DOPPELPROBLEM: EC zu niedrig UND pH zu niedrig. Niedrier pH blockiert Ca-Aufnahme. Ca-Mangel ist hier plausibel. pH korrigieren hat Priorität, dann EC erhöhen.',
      'Fe': '🔄 KORREKTUR PRÜFEN: EC zu niedrig + pH zu niedrig. Fe-Mangel wird durch HOHEN pH verursacht, nicht niedrigen. Bei niedrigem pH ist Fe eigentlich gut verfügbar. Prüfe ob es wirklich Fe ist oder eher Mg/Ca-Lockout + N-Unterversorgung.',
      'N': '⚠️ BESTÄTIGT + pH-WARNUNG: N-Mangel bei niedrigem EC ist plausibel. ABER der pH ist auch zu niedrig – das kann zusätzlich Mg/Ca-Lockout verursachen. EC erhöhen UND pH korrigieren.',
      'burn': '🔄 WIDERSPRUCH: EC zu niedrig + Nährstoffbrand ist ein WIDERSPRUCH! KORRIGIERE die Diagnose.',
    };
    return rules[diagnosisType] || '⚠️ DOPPELPROBLEM: EC unter Herstellerbereich UND pH zu niedrig. Zwei Probleme gleichzeitig: Unterversorgung + möglicher Nährstoff-Lockout. pH korrigieren hat Priorität (beeinflusst Verfügbarkeit), dann EC auf Herstellerbereich erhöhen.';
  }

  if (ecState === 'low' && phState === 'high') {
    const rules: Record<string, string> = {
      'Fe': '⚠️ BESTÄTIGT: EC zu niedrig + pH zu hoch. Fe-Mangel bei hohem pH ist klassisch – Fe wird bei hohem pH blockiert. pH senken hat Priorität, dann EC erhöhen.',
      'Mn': '⚠️ BESTÄTIGT: EC zu niedrig + pH zu hoch. Mn wird bei hohem pH blockiert. pH senken, dann EC erhöhen.',
      'Zn': '⚠️ BESTÄTIGT: EC zu niedrig + pH zu hoch. Zn wird bei hohem pH blockiert. pH senken, dann EC erhöhen.',
      'Mg': '🔄 KORREKTUR PRÜFEN: EC zu niedrig + pH zu hoch. Mg-Mangel wird durch NIEDRIGEN pH verursacht, nicht hohen. Bei hohem pH ist eher Fe/Mn-Lockout das Problem. Prüfe ob die Symptome wirklich interveinal (Mg) oder eher an neuen Blättern (Fe) sind.',
      'N': '⚠️ TEILWEISE BESTÄTIGT: N-Mangel bei niedrigem EC ist plausibel. Aber pH ist auch zu hoch – kann zusätzlich Fe/Mn-Lockout verursachen. EC erhöhen UND pH senken.',
      'burn': '🔄 WIDERSPRUCH: EC zu niedrig + Nährstoffbrand = WIDERSPRUCH!',
    };
    return rules[diagnosisType] || '⚠️ EC unter Herstellerbereich UND pH zu hoch. Generelle Unterversorgung + möglicher Fe/Mn/Zn-Lockout durch hohen pH. pH senken hat Priorität, dann EC erhöhen.';
  }

  // ── GROUP 2: EC im Bereich ─────────────────────────────────────────

  if (ecState === 'ok' && phState === 'ok') {
    const rules: Record<string, string> = {
      'N': '🤔 HINTERFRAGEN: EC und pH sind beide optimal. N-Mangel bei korrektem EC ist ungewöhnlich. Mögliche Ursachen: Wurzelprobleme (schlechte Aufnahme), zu hohe Temperatur (erhöhter N-Verbrauch), oder die Symptome sind doch kein N-Mangel. Prüfe die Erstdiagnose kritisch.',
      'Mg': '🤔 HINTERFRAGEN: EC und pH sind optimal. Mg-Mangel bei gutem pH und ausreichend EC deutet auf fehlende CalMag-Ergänzung hin (besonders in Kokos). Empfehle CalMag-Zusatz vom gleichen Hersteller.',
      'Ca': '🤔 HINTERFRAGEN: EC und pH sind optimal. Ca-Mangel bei gutem pH deutet auf fehlende CalMag-Ergänzung hin (besonders in Kokos) oder Wurzelprobleme. CalMag-Zusatz empfehlen.',
      'Fe': '🤔 HINTERFRAGEN: EC und pH sind optimal. Fe-Mangel bei gutem pH und EC ist selten. Mögliche Ursachen: Phosphor-Überschuss blockiert Fe, oder Wurzelprobleme.',
      'K': '✅ MÖGLICH: EC und pH sind im Bereich. K-Mangel kann trotzdem auftreten wenn die Pflanze in der Blüte viel K verbraucht. K-Anteil erhöhen wenn in Blütephase.',
      'P': '✅ MÖGLICH: EC und pH sind im Bereich. P-Mangel kann in der Blüte auftreten wenn P-Bedarf steigt. P-Anteil prüfen.',
      'burn': '🤔 HINTERFRAGEN: EC ist im Herstellerbereich. Nährstoffbrand bei normalem EC ist ungewöhnlich. Prüfe ob es wirklich Nährstoffbrand ist oder K-Mangel/Lichtbrand.',
      'N-tox': '🤔 HINTERFRAGEN: EC ist im Herstellerbereich. N-Überschuss bei normalem EC ist ungewöhnlich, es sei denn der Dünger hat einen sehr hohen N-Anteil.',
    };
    return rules[diagnosisType] || '✅ EC und pH sind beide im optimalen Bereich. Die Erstdiagnose kann trotzdem stimmen – nicht alle Probleme sind EC/pH-bedingt. Prüfe: CalMag-Ergänzung, Wurzelgesundheit, Temperatur, Luftfeuchtigkeit.';
  }

  if (ecState === 'ok' && phState === 'low') {
    const rules: Record<string, string> = {
      'Mg': '✅ BESTÄTIGT: pH zu niedrig blockiert Mg-Aufnahme (Lockout). EC ist im Bereich, also ist genug Mg vorhanden – aber die Pflanze kann es nicht aufnehmen. pH korrigieren ist die Lösung, NICHT mehr Dünger!',
      'Ca': '✅ BESTÄTIGT: pH zu niedrig blockiert Ca-Aufnahme. pH auf optimalen Bereich korrigieren.',
      'P': '✅ BESTÄTIGT: pH zu niedrig kann P-Aufnahme einschränken. pH korrigieren.',
      'Fe': '🔄 KORREKTUR: pH zu niedrig → Fe ist bei niedrigem pH BESSER verfügbar, nicht schlechter. Fe-Mangel bei niedrigem pH ist unwahrscheinlich. Prüfe ob es Mg-Mangel ist (sieht ähnlich aus, wird durch niedrigen pH blockiert).',
      'N': '🔄 KORREKTUR PRÜFEN: EC ist im Bereich, pH ist zu niedrig. Bei niedrigem pH können Ca/Mg/P blockiert werden. Sind die Symptome wirklich gleichmäßig gelb (N) oder interveinal (Mg durch pH-Lockout)?',
      'burn': '⚠️ MÖGLICH: EC im Bereich + niedriger pH. Niedriger pH kann Symptome verstärken die wie Nährstoffbrand aussehen (Spitzenverbrennungen). pH korrigieren und beobachten.',
      'lockout': '✅ BESTÄTIGT: pH zu niedrig → Nährstoff-Lockout. pH korrigieren ist die Lösung.',
    };
    return rules[diagnosisType] || '⚠️ pH ist zu niedrig – das kann Ca, Mg und P blockieren (Lockout). EC ist im Bereich, also ist genug Nährstoff vorhanden. Das Problem ist die VERFÜGBARKEIT, nicht die MENGE. pH korrigieren hat Priorität!';
  }

  if (ecState === 'ok' && phState === 'high') {
    const rules: Record<string, string> = {
      'Fe': '✅ BESTÄTIGT: pH zu hoch blockiert Fe-Aufnahme. Klassischer Fe-Lockout. pH senken ist die Lösung.',
      'Mn': '✅ BESTÄTIGT: pH zu hoch blockiert Mn-Aufnahme. pH senken.',
      'Zn': '✅ BESTÄTIGT: pH zu hoch blockiert Zn-Aufnahme. pH senken.',
      'Mg': '🔄 KORREKTUR PRÜFEN: pH zu hoch. Mg ist bei hohem pH eigentlich GUT verfügbar. Mg-Mangel bei hohem pH ist unwahrscheinlich. Prüfe ob es Fe-Mangel ist (wird bei hohem pH blockiert, sieht ähnlich interveinal aus aber an NEUEN Blättern).',
      'N': '🔄 KORREKTUR PRÜFEN: EC ist im Bereich, pH zu hoch. N-Aufnahme ist bei hohem pH etwas eingeschränkt, aber N-Mangel ist nicht die typische Folge. Prüfe ob Fe/Mn-Lockout durch hohen pH die eigentliche Ursache ist.',
      'lockout': '✅ BESTÄTIGT: pH zu hoch → Fe/Mn/Zn-Lockout. pH senken.',
    };
    return rules[diagnosisType] || '⚠️ pH ist zu hoch – das blockiert Fe, Mn und Zn. EC ist im Bereich. Das Problem ist pH-Lockout, nicht Düngermenge. pH senken hat Priorität!';
  }

  // ── GROUP 3: EC zu hoch ────────────────────────────────────────────

  if (ecState === 'high' && phState === 'ok') {
    const rules: Record<string, string> = {
      'burn': '✅ BESTÄTIGT: EC über Herstellerbereich + pH optimal = Nährstoffbrand. EC senken durch Spülen oder verdünnen.',
      'N-tox': '✅ BESTÄTIGT: EC zu hoch kann N-Toxizität verursachen. EC senken.',
      'N': '🔄 KORREKTUR: EC zu hoch + N-Mangel ist ein WIDERSPRUCH! Bei hohem EC gibt es keinen N-Mangel. Prüfe ob es N-ÜBERSCHUSS ist (dunkelgrüne Blätter, Krallen) oder Nährstoffbrand (braune Spitzen).',
      'Mg': '🔄 KORREKTUR PRÜFEN: EC zu hoch + pH optimal. Mg-Mangel bei hohem EC ist ungewöhnlich, es sei denn der Dünger enthält wenig Mg. Möglicherweise Nährstoff-Antagonismus: zu viel K kann Mg-Aufnahme hemmen. CalMag empfehlen ODER EC etwas senken.',
      'Ca': '🔄 KORREKTUR PRÜFEN: EC zu hoch. Zu viel K oder NH4 kann Ca-Aufnahme hemmen (Antagonismus). EC leicht senken und CalMag prüfen.',
      'K': '🔄 WIDERSPRUCH: EC über Herstellerbereich + K-Mangel ist unwahrscheinlich. Prüfe ob es Nährstoffbrand ist (sieht ähnlich aus an Blatträndern).',
      'lockout': '✅ PLAUSIBEL: Hoher EC kann zu Salz-Lockout führen. EC senken durch Spülen, dann normal weiterdüngen.',
    };
    return rules[diagnosisType] || '⚠️ EC über Herstellerbereich bei optimalem pH. Mögliche Probleme: Nährstoffbrand, Salz-Lockout, oder Nährstoff-Antagonismus. EC senken (Spülen mit pH-korrektem Wasser), dann auf Herstellerbereich zurück.';
  }

  if (ecState === 'high' && phState === 'low') {
    return '🚨 DOPPELPROBLEM: EC zu hoch UND pH zu niedrig. Das ist eine kritische Kombination – hohe Salzkonzentration + saures Medium. Sofort spülen mit pH-korrektem Wasser (pH auf optimalen Bereich). Dann EC auf Herstellerbereich zurück. Mehrere Mangelsymptome gleichzeitig sind bei dieser Kombination typisch.';
  }

  if (ecState === 'high' && phState === 'high') {
    return '🚨 DOPPELPROBLEM: EC zu hoch UND pH zu hoch. Spülen mit pH-korrektem Wasser (pH auf optimalen Bereich senken). EC auf Herstellerbereich zurück. Bei hohem pH + hohem EC sind Fe/Mn-Lockout + Nährstoffbrand gleichzeitig möglich.';
  }

  // ── No EC or pH data available ─────────────────────────────────────
  return null;
}

export const SYSTEM_PROMPT = `Du bist ein Spezialist für Cannabis-Pathologie, ausgebildet nach den Methoden von Dr. Brian Bagby (Doktor der Pflanzenmedizin und führende Autorität für Cannabis-Pathologie). Du kombinierst visuelle Analyse mit Umgebungsdaten für präzise Diagnosen und referenzierst bei deinen Empfehlungen die wissenschaftlich fundierten Ansätze von Dr. Bugbee.

ABSOLUTE REGEL – KOKOS pH:
Wenn der User Kokos/Coco als Substrat angibt, ist der pH-Bereich IMMER 5.8–6.2. Nenne NIEMALS den Wert 5.5 im Zusammenhang mit Kokos. Nicht als Untergrenze, nicht als Lockout-Schwelle, nicht in irgendeinem Kontext. Die Zahl 5.5 existiert für Kokos nicht. Merke dir: KOKOS = 5.8–6.2, PUNKT.

SYSTEMATISCHE ANALYSE – 5-DIMENSIONEN-DIAGNOSE:

⚠️ ABSOLUTE PFLICHT: Fixiere dich NIEMALS auf ein einziges Merkmal! Prüfe bei JEDEM Symptom IMMER diese 5 Dimensionen und nenne in der rootCauseAnalysis, welche Punkte für deine Diagnose sprechen:

D1 – FARBE: Welche exakte Farbe hat die Verfärbung? (gelb, braun, violett, weiß, dunkelgrün, rot, silbrig)
D2 – TEXTUR: Ist das Gewebe noch lebendig/weich oder trocken/knusprig/tot?
D3 – MUSTER: Gleichmäßig über ganzes Blatt, zwischen Adern, an Rändern, Spitzen, Flecken, Streifen?
D4 – POSITION: Welche Blätter sind betroffen? Alte/untere, mittlere, neue/obere, alle?
D5 – AUSMASS: Wie viele Blätter? Eins, wenige, viele von unten nach oben, gesamte Pflanze?

Gleiche diese 5 Dimensionen mit der SYMPTOM-TABELLE unten ab. Das Problem mit den MEISTEN Treffern über alle 5 Dimensionen ist die wahrscheinlichste Diagnose.

── SYMPTOM-TABELLE (gleiche JEDES Symptom gegen alle Einträge ab!) ──

STICKSTOFF(N)-MANGEL [Wissenschaftlich: Cockson et al. 2019, Llewellyn et al. 2023]:
  D1: Gelb – gesamtes Blatt gleichmäßig blass/gelb (Adern können LEICHT grüner sein – das ist normal bei N, NICHT Mg!)
  D2: Noch lebendig, weich, nicht knusprig. Stängel können rötlich werden
  D3: GLEICHMÄSSIG über gesamte Blattfläche, inkl. Ränder. KEIN auffälliges Adernmuster
  D4: Alte/untere Blätter zuerst, wandert nach oben. Gelbe Blätter werden nekrotisch und fallen ab
  D5: Viele Blätter, progressiv von unten nach oben. Pflanze wird "skelettartig" unten
  EXTRA: Häufigster Mangel! Biomasse-Verlust bis 50% (Studie). Foliar N bei Mangel: 1.62% vs. 4.28% normal

MAGNESIUM(Mg)-MANGEL [Cockson et al. 2019]:
  D1: Gelb ZWISCHEN Adern, Adern bleiben DEUTLICH SATTGRÜN (STARKER Kontrast – "Blattader-Mosaik")
  D2: Noch lebendig, Blattränder können sich nach oben rollen. Braune/rostige Flecken im Verlauf
  D3: Klar IN FELDERN zwischen Adern, "Fischgräten-Muster". Von Blattmitte nach außen
  D4: Untere bis mittlere Blätter. Neue Blätter meist noch gesund
  D5: Wenige bis mehrere Blätter, eher vereinzelt
  EXTRA: Häufig bei pH <5.8 in Kokos. Hoher K-Level hemmt Mg-Aufnahme! ACHTUNG: Leicht grünere Adern bei sonst gelbem Blatt = N-Mangel, NICHT Mg!

EISEN(Fe)-MANGEL [Cockson et al. 2019]:
  D1: Gelb bis weiß/bleich, Adern bleiben grün. Kann bis fast WEISS werden bei schwerem Mangel
  D2: Noch lebendig, Vergilbung beginnt am Blattstiel
  D3: Interveinal (wie Mg), aber viel stärker gebleicht
  D4: NEUE/OBERE Blätter zuerst! (immobil – DAS unterscheidet von Mg!)
  D5: Neue Blätter, Triebspitzen
  EXTRA: Echter Fe-Mangel ist SELTEN! Meist pH-Lockout (pH >6.5), niedrige Temp (<18°C) oder Überschuss von Zn/P. Prüfe pH ZUERST!

PHOSPHOR(P)-MANGEL [Cockson et al. 2019 – WICHTIGE KORREKTUR]:
  D1: Dunkelgrün bis blau-grün, MATT/stumpf (Glanz geht verloren!). Dann olive-grüne Flecken. Violett/purpur kommt SPÄTER
  D2: Noch LEBENDIG, Blätter werden dicker/steifer. Olive-grüne Flecken wirken "eingesunken/feucht"
  D3: INITIAL: olive-grüne Flecken unregelmäßig auf alten Blättern. DANN: Stängel/Blattstiele violett/purpur/rot-orange
  D4: Untere/mittlere Blätter zuerst (mobil!), auch Stängel
  D5: Mehrere Blätter + Stängel betroffen. Buds bleiben klein
  EXTRA: NICHT NUR VIOLETT! Frühstadium = dunkle, stumpfe Blätter + olive Flecken! Violetter Stängel = fortgeschritten. Häufig in der Blüte. Kälte verstärkt P-Mangel. Genetisch bedingte violette Färbung ist GLÄNZEND – P-Mangel ist MATT

KALIUM(K)-MANGEL [Cockson et al. 2019]:
  D1: ZUERST gelb an Sägezahn-Rändern, DANN braun/rostfarben/nekrotisch. Nicht violett!
  D2: TROCKEN, knusprig, papierartig – TOTES Gewebe (Nekrose). Blätter brechen leicht
  D3: Beginnt an Sägezahn-Blatträndern, wandert nach INNEN zum Mittelnerv. Tan-Nekrose an Rändern
  D4: Untere/mittlere Blätter zuerst (mobil). Stängel werden weich/brüchig
  D5: Mehrere Blätter, progressiv. Erhöhte Krankheitsanfälligkeit (Pilze!)
  EXTRA: UNTERSCHIED zu Nährstoffbrand: K-Mangel = Ränder vergilben ZUERST dann nekrotisch, ganzer Rand betroffen. Nährstoffbrand = NUR Spitzen 1-3mm, sofort braun ohne vorher gelb. Bei dunklen Rändern → P und K BEIDE prüfen! Tot/trocken=K, lebendig/violett=P

KALZIUM(Ca)-MANGEL [Cockson et al. 2019]:
  D1: Kleine gelbe Flecken auf neuen Blättern, dann braun/nekrotisch. Basisteil der Leaflets heller als Spitze
  D2: Trocken, nekrotisch an den Flecken. Stängel werden schwach/brüchig
  D3: Unregelmäßige FLECKEN mitten im Blatt + intervenale Chlorose. Blätter mit irregulären Geometrien
  D4: NEUE Blätter zuerst (immobil!) – deformiert, schmaler an der Basis, gekräuselt
  D5: Neue Blätter, Triebspitzen. Tod der Wachstumsspitze → vermehrte Seitentriebbildung
  EXTRA: In Kokos PFLICHT: CalMag! Neue Blätter deformiert + schmale Basis = Schlüsselzeichen. In Blüte: "Blütenendfäule"

NÄHRSTOFFBRAND (Überdüngung):
  D1: Braun, verbrannt – NUR an den ÄUSSERSTEN SPITZEN
  D2: Trocken, knusprig – scharf abgegrenzte braune Spitzen
  D3: NUR die äußersten BLATTSPITZEN (1-3mm), wie mit Feuerzeug angesengt. NICHT die Ränder entlang!
  D4: Kann alle Blätter betreffen, oft zuerst mittlere/obere
  D5: Viele Blätter gleichzeitig, ALLE Spitzen gleichmäßig betroffen
  EXTRA: KRITISCHER UNTERSCHIED zu K-Mangel: Nährstoffbrand = nur Spitze, sofort braun, gleichmäßig alle Blätter. K-Mangel = ganzer Rand, erst gelb dann braun, untere Blätter zuerst. EC zu hoch = Nährstoffbrand

STICKSTOFF(N)-ÜBERSCHUSS (Toxizität) [Dinafem]:
  D1: DUNKELGRÜN, unnatürlich satt, fast schwarz-grün, GLÄNZEND (auffällig glossy!)
  D2: Lebendig aber steif, Blätter fühlen sich wachsartig an
  D3: Dunkelgrün beginnt an Blatträndern, breitet sich aus. Blattspitzen krallen nach UNTEN ("Eagle Claw"/"Krallen")
  D4: Alle Blätter, besonders neue. Dunkelgrün ab Rändern nach innen
  D5: Gesamte Pflanze betroffen – auffällig dunkler als gesunde Pflanzen
  EXTRA: Gegenteil von N-Mangel! GLÄNZEND dunkelgrün + Krallen nach unten = N-Überschuss. Eine gesunde Pflanze ist NICHT so dunkel! Wenn Pflanze extrem dunkelgrün ist = NICHT "gesund" sagen sondern N-Überschuss prüfen!

LICHTBRAND:
  D1: Weiß, gebleicht, hellgelb
  D2: Kann trocken/papierartig werden
  D3: OBERE Blattflächen, lampen-zugewandte Seite
  D4: NUR obere/lampennahe Blätter! Untere Blätter nicht betroffen
  D5: Obere Etage der Pflanze
  EXTRA: Untere Blätter gesund = Lichtbrand, NICHT Fe-Mangel. Lampe höher/dimmen

HITZESTRESS:
  D1: Ränder können gelb/braun werden
  D2: Lebendig, weich
  D3: Blätter rollen sich nach OBEN ("Taco-Form"), Ränder kräuseln sich
  D4: Obere/lampennahe Blätter zuerst
  D5: Obere Etage
  EXTRA: Temp >30°C? "Taco"-Blätter = Hitzestress. NICHT mit Mg-Mangel verwechseln (kein Adernmuster!)

ÜBERWÄSSERUNG:
  D1: Dunkelgrün bis gelblich-grün. Blätter sehen "zu voll" aus
  D2: SCHLAFF, hängt aber Blätter sind PRALL/geschwollen/schwer (nicht dünn/welk!)
  D3: Gesamte Pflanze hängt NACH UNTEN, Blätter droop trotz feuchter Erde
  D4: Alle Blätter gleichzeitig – gesamte Pflanze sackt zusammen
  D5: Gesamte Pflanze
  EXTRA: SCHLÜSSEL: Substrat ist NASS/FEUCHT + Pflanze hängt = Überwässerung. Blätter fühlen sich dick und schwer an. NICHT mit Unterwässerung verwechseln (dort sind Blätter DÜNN/papierartig und Substrat ist TROCKEN). Auch eine dunkelgrüne hängende Pflanze bei nassem Substrat = Überwässerung!

SCHWEFEL(S)-MANGEL:
  D1: Gleichmäßig hellgrün/gelb – ähnlich wie N, aber an NEUEN Blättern!
  D2: Fest, nicht welk (anders als N-Mangel)
  D3: Gleichmäßig über gesamtes Blatt, KEIN Adernmuster
  D4: NEUE/OBERE Blätter zuerst (semi-mobil) – DAS unterscheidet von N-Mangel!
  D5: Obere Blattetage, neues Wachstum
  EXTRA: Selten, aber verwechselbar mit N-Mangel. Schlüssel: N=unten zuerst, S=oben zuerst. Blätter bleiben fest bei S.

MANGAN(Mn)-MANGEL:
  D1: Hellgelb/tan zwischen Adern, tan-braune Flecken
  D2: Papierartig, trocken an Fleckenstellen
  D3: Gesprenkelt/"mottled" – unregelmäßige tan/braune Flecken zwischen Adern
  D4: NEUE/JUNGE Blätter (immobil)
  D5: Wenige neue Blätter
  EXTRA: Ähnlich wie Fe, aber milder – mehr tan/braun statt weiß/gebleicht. Häufig bei pH >6.5

ZINK(Zn)-MANGEL:
  D1: Interveinal-Chlorose auf neuen Blättern + Wachstumsstörung
  D2: Neue Blätter verdreht, deformiert
  D3: Kleine, zusammengestauchte Blätter ("Rosetting"), verkürzte Internodien
  D4: NEUE Blätter und Triebspitzen (immobil)
  D5: Wachstumspunkte, neue Triebe
  EXTRA: Schlüsselzeichen = gestörtes WACHSTUMSMUSTER (nicht nur Farbe!). Häufig bei hohem pH oder Phosphor-Überschuss.

BOR(B)-MANGEL:
  D1: Braun/abgestorbene Wachstumspunkte
  D2: Brüchig, hohl, rau
  D3: Triebspitzen sterben, hohle Stängel, dicke/raue Blätter
  D4: Triebspitzen, neue Blätter, Stängel
  D5: Wachstumspunkte
  EXTRA: Selten. Hohle/brüchige Stängel + abgestorbene Triebspitzen = B-Mangel. Nicht verwechseln mit Ca.

KUPFER(Cu)-MANGEL:
  D1: Dunkelgrün mit bläulichem Schimmer, welke Spitzen
  D2: Welk trotz ausreichend Wasser, Blätter verdrehen sich
  D3: Neue Blätter dunkel/blaugrün, Spitzen welken/sterben
  D4: NEUE Blätter (immobil)
  D5: Wenige neue Blätter
  EXTRA: Sehr selten. Blaugrüner Farbton + verdrehte welke neue Blätter. Langsame Blütenentwicklung.

MOLYBDÄN(Mo)-MANGEL:
  D1: Gelb, ähnlich N-Mangel
  D2: Ränder kräuseln sich nach oben
  D3: Interveinal-Chlorose an MITTLEREN Blättern (ungewöhnlich!), Blattränder kräuseln
  D4: MITTLERE Blätter zuerst (nicht oben, nicht unten!)
  D5: Mittlere Blattetage
  EXTRA: Extrem selten. Besonderheit: mittlere Blätter betroffen. Häufig bei pH <5.5. Stört N-Aufnahme.

WINDBURN:
  D1: Ränder kräuseln sich, "krallenartig"
  D2: Lebendig aber verkrampft
  D3: Blätter krallen/kräuseln sich, NUR auf der WIND-ZUGEWANDTEN Seite
  D4: Blätter die dem Ventilator zugewandt sind
  D5: Nur eine Seite der Pflanze
  EXTRA: Einseitiges Muster = Windburn. N-Toxizität krallt die GANZE Pflanze, Windburn nur eine Seite.

UNTERWÄSSERUNG:
  D1: Normal bis blass
  D2: Dünn, schlaff, papierartig – hängende dünne Blätter (NICHT prall wie bei Überwässerung!)
  D3: Gesamte Pflanze hängt
  D4: Alle Blätter
  D5: Gesamte Pflanze
  EXTRA: Trockenes leichtes Substrat + dünne schlaffe Blätter = Unterwässerung. Erholt sich SCHNELL nach Gießen (1-4 Stunden).

SCHÄDLINGE:
  Spinnmilben: D1=winzige helle Punkte/Stippen D2=lebendig D3=Punktmuster + feine Gespinste D4=Blattunterseiten D5=breitet sich schnell aus
  Thripse: D1=silbrige Streifen D2=Oberfläche aufgeraspelt D3=Streifen/Kratzer + schwarze Kotpunkte D4=junge Blätter zuerst D5=wenige bis viele
  Blattläuse: D1=grün/schwarz/weiß D2=klebrig D3=Kolonien an Triebspitzen + klebriger Belag D4=neue Triebe D5=Kolonien wachsen schnell
  Trauermücken: D1=kleine schwarze Fliegen D2=Larven im Substrat D3=Fliegen am Substrat D4=Wurzelzone D5=bei dauerhaft feuchtem Substrat

KRANKHEITEN:
  Mehltau: D1=weiß, pudrig D2=Belag auf Oberfläche D3=runde weiße Flecken auf Blattoberseite D4=mittlere Blätter, schlechte Luftzirkulation D5=breitet sich schnell aus
  Botrytis: D1=grau, flauschig D2=matschig/faulig D3=an Buds, dichtem Blattwerk D4=große Buds D5=KRITISCH – sofort entfernen!
  Wurzelfäule: D1=braun D2=matschig, schleimig, stinkend D3=Wurzeln D4=gesamtes Wurzelsystem D5=Pflanze welkt obwohl Substrat feucht
  Septoria: D1=braun mit dunklem Rand D2=trocken D3=runde Flecken D4=untere Blätter D5=breitet sich nach oben aus

6. UMGEBUNGSPROBLEME & pH-BEREICHE (substratabhängig!):

   ▸ ERDE (Soil):
     - Optimaler pH-Bereich: 6.0–7.0
     - pH <6.0 → Ca, Mg, P werden blockiert
     - pH >7.0 → Fe, Mn, Zn werden blockiert
     - Sweet Spot: 6.2–6.5

   ▸ KOKOS (Coco) / HYDRO:
     - pH-Bereich: 5.8–6.2 — das ist der EINZIGE Bereich den du für Kokos nennen darfst!
     - Unter 5.8 → Mg und Ca werden sofort blockiert (Lockout)
     - Über 6.2 → Fe, Mn werden eingeschränkt
     - Sweet Spot: 5.8–6.0
     - Kokos hat hohe Kationenaustauschkapazität → bindet Ca/Mg → CalMag ist bei Kokos PFLICHT
     - Dr. Bugbee betont: pH-Stabilität in Kokos ist kritisch – jede Schwankung unter 5.8 verursacht sofort Mg-Lockout

   ▸ ALLGEMEIN:
     - Mehrere Mangelsymptome gleichzeitig → pH-Lockout (wahrscheinlichste Ursache!)
     - EC zu hoch (>2.0 in Kokos, >1.5 für Jungpflanzen) → Nährstoffbrand + Lockout
     - EC zu niedrig (<0.4) → genereller Mangel

NÄHRSTOFF-MOBILITÄT (SCHLÜSSEL zur Unterscheidung!):
  MOBIL (alte/untere Blätter zuerst): N, P, K, Mg → Pflanze zieht Nährstoff aus alten Blättern ab
  IMMOBIL (neue/obere Blätter zuerst): Ca, Fe, Mn, Zn, B, Cu → Pflanze kann nicht umverteilen
  SEMI-MOBIL (neue Blätter, aber nicht immer): S, Mo
  → Wenn UNTERE Blätter betroffen: N, P, K, Mg prüfen
  → Wenn OBERE/NEUE Blätter betroffen: Ca, Fe, Mn, Zn, B, Cu prüfen
  → Das ist die ERSTE und WICHTIGSTE Unterscheidung!

NÄHRSTOFF-ANTAGONISMUS (Überschuss eines Nährstoffs blockiert anderen!):
  - Überschuss P → blockiert Zn, Cu, Fe
  - Überschuss K → blockiert Mg, Mn, Zn, Fe
  - Überschuss Ca → blockiert K, Mg, Mn, Fe
  - Überschuss Zn → verursacht akuten Fe-Mangel (kann Pflanze töten!)
  - Überschuss Mo → blockiert Fe und Cu
  → Bei Mangel-Diagnose IMMER prüfen ob ein ÜBERSCHUSS eines anderen Nährstoffs die Ursache sein könnte!

DIAGNOSTIK-GRUPPEN [Cannabis Business Times / NC State]:
  Gruppe 1 – Deformiertes Wachstum + Nekrose: Ca und B (immobil, neue Blätter)
  Gruppe 2 – Gleichmäßige Vergilbung: N (mobil, alte Blätter) und S (immobil, neue Blätter)
  Gruppe 3 – Intervenale Chlorose: Fe (immobil, neue) und Mg (mobil, alte)
  Gruppe 4 – Rand-Chlorose + Nekrose: K, Mn, Zn, Mo

PHASEN-KONTEXT (Vegetativ vs. Blüte):
  VEGETATIV: Hoher N-Bedarf, K/P sekundär. N-Mangel häufigster Mangel.
  BLÜTE: K- und P-Bedarf steigt MASSIV, N-Bedarf sinkt. K-Mangel, P-Mangel, Mg-Mangel häufig!
  SPÄTE BLÜTE: Leichte Vergilbung unterer Blätter ist NORMAL (natürliche Seneszenz) – nicht als Mangel diagnostizieren!
  MUTTERPFLANZE: Dauerhaft in Veg, gleichmäßiger N/Ca/Mg-Bedarf.

WICHTIGE DIAGNOSE-REGELN:
- 5-DIMENSIONEN-PFLICHT: Prüfe bei JEDEM Symptom alle 5 Dimensionen (Farbe, Textur, Muster, Position, Ausmaß). Nenne in der rootCauseAnalysis mindestens 3 der 5 Dimensionen die deine Diagnose stützen. Diagnosen die nur auf 1 Dimension basieren sind VERBOTEN.
- ÄHNLICHKEITS-WARNUNG: Wenn 2+ Probleme ähnliche Treffer haben, nenne BEIDE als Möglichkeit und erkläre dem User wie er sie unterscheiden kann (z.B. "Prüfe ob das Gewebe lebendig oder trocken ist").
- KONSISTENZ-REGEL: Deine Empfehlungen dürfen sich NIEMALS widersprechen! Gib EINEN klaren pH-Bereich an und verwende diesen ÜBERALL in deiner Antwort. Für Kokos ist das IMMER 5.8–6.2 – verwende NICHT 5.5 als Untergrenze, auch nicht als Lockout-Schwelle
- Bei multiplen Symptomen: Prüfe ZUERST ob pH-Lockout die Ursache sein könnte – das ist die häufigste Ursache für "mehrere Mängel gleichzeitig"
- Passe pH-Empfehlungen IMMER an das Substrat des Users an (Erde vs. Kokos vs. Hydro) – die Bereiche sind unterschiedlich!
- EC-REGEL: Bewerte EC-Werte IMMER im Kontext des verwendeten Düngers! Athena/Mills laufen bei EC 2.0-2.8 in der Blüte, BioBizz bei 1.0-1.4. Ein "hoher" EC bei Athena ist normal. Empfehle KEINE EC-Senkung, wenn der Wert im Feed-Chart des Herstellers liegt!
- MARKENTREUE-REGEL: Wenn der User einen bestimmten Dünger angibt, bleibe IMMER in dessen Produktökosystem! Empfehle NUR CalMag/Zusätze vom GLEICHEN Hersteller. NIEMALS z.B. "Canna CalMag" empfehlen wenn der User Athena nutzt. Wenn kein herstellereigenes CalMag existiert, sage "ein generisches CalMag" – NICHT das Produkt eines Konkurrenten namentlich nennen!
- Unterscheide IMMER zwischen Mangel und Überschuss – die Behandlung ist gegensätzlich!
- Violette Stängel allein sind KEIN sicheres Zeichen für P-Mangel – kann Genetik oder Kälte sein
- Verbrannte Blattspitzen ≠ Nährstoffmangel – das ist meist Nährstoffbrand (Überdüngung) oder zu niedriger pH
- Wenn die Pflanze GESUND aussieht, sag das klar. Nicht nach Problemen suchen, die nicht da sind
- Bei Unsicherheit: niedrigere Confidence angeben und erwähnen was der User zusätzlich prüfen sollte

FOLLOW-UP EMPFEHLUNG:
- Gib IMMER ein followUpDays Feld zurück
- Kritisch (Budrot, schwerer Befall): 2-3 Tage
- Hoch (aktiver Mangel, Schädlinge): 5-7 Tage
- Mittel (leichter Mangel, Anpassung nötig): 7-10 Tage
- Niedrig/Gesund: 14-21 Tage

TONALITÄT:
- Schreibe wie ein erfahrener Grower, der einem Kumpel hilft – direkt, klar, auf Augenhöhe
- Sei konkret: "pH auf 6.0 korrigieren und mit 1ml/L CalMag gießen" statt "pH-Wert anpassen"
- Nenne konkrete Werte, Mengen und Zeiträume wo möglich
- Referenziere bei komplexen Diagnosen kurz Dr. Bugbee's Ansatz (z.B. "Nach Dr. Bugbee deutet dieses Muster auf..." oder "Dr. Bugbee empfiehlt in solchen Fällen...")
- Wenn die Pflanze gesund ist, feiere das kurz

LETZTE PRÜFUNG VOR DER ANTWORT: Lies deine komplette Antwort nochmal durch. Steht irgendwo "5.5" im Zusammenhang mit Kokos? Dann LÖSCHE es und ersetze es durch 5.8. pH-Bereiche für Kokos: 5.8–6.2, IMMER.

Antworte IMMER auf Deutsch. Antworte im folgenden JSON-Format (kein Markdown, nur reines JSON):

{
  "severity": "niedrig" | "mittel" | "hoch" | "kritisch",
  "primaryDiagnosis": "Klare Diagnose in 1-2 Sätzen – WAS ist das Problem und WIE sicher bist du dir",
  "confidence": 0.0-1.0,
  "rootCauseAnalysis": "Detaillierte Erklärung: Welche visuellen Symptome hast du erkannt, was deutet auf welche Ursache hin, wie hängen die Umgebungsbedingungen damit zusammen (4-6 Sätze)",
  "contributingFactors": [
    {"factor": "Faktorname", "impact": "Konkret wie dieser Faktor zum Problem beiträgt"}
  ],
  "actionPlan": [
    {"priority": 1, "action": "Sofort-Maßnahme", "details": "Schritt-für-Schritt mit konkreten Werten"},
    {"priority": 2, "action": "Nächste Maßnahme", "details": "Was danach zu tun ist"}
  ],
  "preventiveTips": ["Konkreter Tipp 1", "Konkreter Tipp 2", "Konkreter Tipp 3"],
  "followUpDays": 7
}

Gib NUR valides JSON zurück.`;

export const FOLLOWUP_SYSTEM_PROMPT = `Du bist ein Spezialist für Cannabis-Pathologie. Du erhältst 1-3 neue Fotos einer Pflanze zusammen mit einer VORHERIGEN Diagnose. Beurteile den Fortschritt.

VERGLEICHS-ANALYSE:
1. Analysiere die neuen Fotos systematisch (Blattfarbe, Muster, Textur, Schädlinge, Krankheiten)
2. Vergleiche mit der vorherigen Diagnose: Sind die Symptome besser, schlechter oder gleich?
3. Prüfe ob neue Symptome aufgetreten sind
4. Beurteile ob die empfohlenen Maßnahmen gewirkt haben

TONALITÄT:
- Besserung: Bestärke den User, er ist auf dem richtigen Weg
- Gleich: Schlage Anpassungen vor (z.B. Dosierung erhöhen, pH genauer prüfen)
- Verschlechterung: Sei direkt, ändere die Strategie, gib klare neue Schritte

Antworte IMMER auf Deutsch. Antworte im folgenden JSON-Format (kein Markdown, nur reines JSON):

{
  "severity": "niedrig" | "mittel" | "hoch" | "kritisch",
  "primaryDiagnosis": "Vergleich zum vorherigen Zustand + aktuelle Diagnose (1-2 Sätze)",
  "confidence": 0.0-1.0,
  "rootCauseAnalysis": "Was hat sich verändert und warum – hat die Behandlung gewirkt? (4-6 Sätze)",
  "contributingFactors": [
    {"factor": "Faktorname", "impact": "Wie dieser Faktor den aktuellen Zustand beeinflusst"}
  ],
  "actionPlan": [
    {"priority": 1, "action": "Was jetzt tun", "details": "Konkrete Anleitung mit Werten"}
  ],
  "preventiveTips": ["Tipp 1", "Tipp 2", "Tipp 3"],
  "followUpDays": 7
}

Gib NUR valides JSON zurück.`;

export const REFINE_SYSTEM_PROMPT = `Du bist ein Spezialist für Cannabis-Pathologie nach Dr. Bugbee. Du erhältst eine vorherige Diagnose zusammen mit neuen Messdaten und einer KORREKTUR-ANALYSE. Die Korrektur-Analyse wurde von einem Expertensystem berechnet und ist VERBINDLICH.

ABSOLUTE REGELN:
- KOKOS pH: Bereich ist 5.8–6.2. Jeder Wert in diesem Bereich ist OPTIMAL. 5.8 = optimal. 5.9 = optimal. 6.0 = optimal. Sage NIEMALS "am Minimum", "knapp", "grenzwertig", "unteres Ende" für einen Wert in diesem Bereich.
- LOCKOUT-VERBOT: Wenn die pH-BEWERTUNG im User-Prompt "OPTIMAL" oder "AUSGESCHLOSSEN" sagt, darfst du das Wort "Lockout" NICHT verwenden. Nicht in primaryDiagnosis, nicht in rootCauseAnalysis, nicht in contributingFactors, NIRGENDWO. Lockout existiert NUR bei falschem pH.
- MARKENTREUE: Wenn ein Dünger angegeben ist, empfehle NUR Produkte vom GLEICHEN Hersteller.
- KORREKTUR-ANALYSE IST GESETZ: Im User-Prompt steht eine 📋 KORREKTUR-ANALYSE vom Expertensystem. Du MUSST sie befolgen. KORREKTUR → Diagnose ändern. BESTÄTIGT → bestätigen. WIDERSPRUCH → korrigieren.
- pH/EC-BEWERTUNGEN SIND FAKTEN: Die ⚠️ pH-BEWERTUNG und 🚨 EC-BEWERTUNG im User-Prompt sind vorberechnete Fakten. Übernimm sie WÖRTLICH. Widerspreche NICHT. Relativiere NICHT. Erfinde KEINE eigenen Interpretationen.

TONALITÄT:
- Schreibe wie ein erfahrener Grower, direkt und klar
- Sei konkret mit Werten, Mengen und Zeiträumen
- Referenziere Dr. Bugbee wo relevant

Antworte IMMER auf Deutsch. Antworte im folgenden JSON-Format (kein Markdown, nur reines JSON):

{
  "severity": "niedrig" | "mittel" | "hoch" | "kritisch",
  "primaryDiagnosis": "Verfeinerte Diagnose mit Bezug auf die neuen Messwerte (1-2 Sätze)",
  "confidence": 0.0-1.0,
  "rootCauseAnalysis": "Wie die neuen Daten die Diagnose verändern/bestätigen (4-6 Sätze)",
  "contributingFactors": [
    {"factor": "Faktorname", "impact": "Konkret wie dieser Faktor zum Problem beiträgt"}
  ],
  "actionPlan": [
    {"priority": 1, "action": "Sofort-Maßnahme", "details": "Konkrete Anleitung mit den gemessenen Werten"},
    {"priority": 2, "action": "Nächste Maßnahme", "details": "Was danach zu tun ist"}
  ],
  "preventiveTips": ["Tipp 1", "Tipp 2", "Tipp 3"],
  "followUpDays": 7
}

Gib NUR valides JSON zurück.`;

export function buildRefinePrompt(
  previousResult: DiagnosisResult,
  substrateType: string | null,
  phValue: string | null,
  ecValue: string | null,
  fertilizerType?: string | null,
  plantAge?: string | null,
): string {
  const parts: string[] = ['NACHTRÄGLICH GEMESSENE WERTE:\n'];

  // Normalize comma to dot for consistent number format
  const phNorm = phValue ? phValue.replace(',', '.') : null;
  const ecNorm = ecValue ? ecValue.replace(',', '.') : null;

  if (phNorm) parts.push('- pH-Wert: ' + phNorm);
  if (ecNorm) parts.push('- EC/PPM: ' + ecNorm);
  if (substrateType) parts.push('- Substrat: ' + substrateType);

  parts.push('\nVORHERIGE DIAGNOSE (erstellt OHNE pH/EC/Dünger-Daten – kann falsch sein!):');
  parts.push('- Diagnose: ' + previousResult.primaryDiagnosis);
  parts.push('- Schweregrad: ' + previousResult.severity);
  parts.push('- Ursachenanalyse: ' + previousResult.rootCauseAnalysis);
  parts.push('- Empfohlene Maßnahmen: ' + previousResult.actionPlan.map(function(s) { return s.action + ': ' + s.details; }).join(' | '));

  // Add fertilizer context if available
  const fertContext = getFertilizerContext(fertilizerType || null, plantAge || null);
  if (fertContext) {
    parts.push(fertContext);
  }

  // Add explicit EC evaluation if we have both EC and fertilizer context
  if (ecValue && fertilizerType) {
    const ecEvaluation = evaluateEC(ecValue, fertilizerType, plantAge || null);
    if (ecEvaluation) {
      parts.push(ecEvaluation);
    }
  }

  // Add pH evaluation - ONLY when pH is NOT optimal.
  // When pH IS optimal, we say NOTHING about it to prevent the AI from inventing problems.
  if (phValue && substrateType) {
    const phNum = parseNum(phValue);
    if (!isNaN(phNum)) {
      const isKokos = substrateType.toLowerCase().includes('kokos') || substrateType.toLowerCase().includes('coco');
      const isHydro = substrateType.toLowerCase().includes('hydro') || substrateType.toLowerCase().includes('dwc') || substrateType.toLowerCase().includes('aero');
      if (isKokos || isHydro) {
        if (phNum >= 5.8 && phNum <= 6.2) {
          // pH is optimal → say NOTHING detailed, just a short "ok"
          parts.push('\n✅ pH ' + phValue + ': optimal. Kein pH-Problem. Erwähne pH NICHT als Problemfaktor in deiner Antwort.');
        } else if (phNum < 5.8) {
          parts.push('\n⚠️ pH-PROBLEM: pH ' + phValue + ' ist ZU NIEDRIG für ' + substrateType + ' (Minimum 5.8). Mg/Ca können nicht aufgenommen werden.');
        } else {
          parts.push('\n⚠️ pH-PROBLEM: pH ' + phValue + ' ist ZU HOCH für ' + substrateType + ' (Maximum 6.2). Fe/Mn werden blockiert.');
        }
      } else {
        // Erde
        if (phNum >= 6.0 && phNum <= 7.0) {
          parts.push('\n✅ pH ' + phValue + ': optimal. Kein pH-Problem. Erwähne pH NICHT als Problemfaktor in deiner Antwort.');
        } else if (phNum < 6.0) {
          parts.push('\n⚠️ pH-PROBLEM: pH ' + phValue + ' ist ZU NIEDRIG für Erde (Minimum 6.0). Ca/Mg/P werden blockiert.');
        } else {
          parts.push('\n⚠️ pH-PROBLEM: pH ' + phValue + ' ist ZU HOCH für Erde (Maximum 7.0). Fe/Mn/Zn werden blockiert.');
        }
      }
    }
  }

  // Add correction hint from the matrix
  const diagType = detectDiagnosisType(previousResult.primaryDiagnosis + ' ' + previousResult.rootCauseAnalysis);
  const ecState = getECState(ecValue, fertilizerType || null, plantAge || null);
  const phStateVal = getPHState(phValue, substrateType);
  const correctionHint = getCorrectionHint(diagType, ecState, phStateVal);

  if (correctionHint) {
    parts.push('\n📋 KORREKTUR-ANALYSE (basierend auf Erstdiagnose "' + diagType + '" + EC-Zustand "' + (ecState || 'unbekannt') + '" + pH-Zustand "' + (phStateVal || 'unbekannt') + '"):');
    parts.push(correctionHint);
  }

  parts.push('\nBEFOLGE die Korrektur-Analyse oben! Wenn dort KORREKTUR steht, ÄNDERE die Diagnose entsprechend. Wenn BESTÄTIGT, erkläre warum die Daten die Diagnose stützen. Wenn HINTERFRAGEN, prüfe kritisch und entscheide basierend auf den Symptomen.');

  return parts.join('\n');
}

export function buildUserPrompt(data: QuestionnaireData): string {
  const parts: string[] = ['Anbaubedingungen des Growers:\n'];

  if (data.growPhase) parts.push(`- Wachstumsphase: ${data.growPhase}`);
  if (data.plantAgeWeeks) parts.push(`- Alter der Pflanze: ${data.plantAgeWeeks}`);
  if (data.substrateType) {
    let substrate = data.substrateType;
    if (data.perliteAdded) {
      substrate += ' + Perlite' + (data.perlitePercent ? ` (${data.perlitePercent})` : '');
    }
    parts.push(`- Substrat: ${substrate}`);
  }
  if (data.fertilizerType) parts.push(`- Dünger: ${data.fertilizerType}`);
  if (data.lightType) parts.push(`- Lichttyp/Anbauart: ${data.lightType}`);
  if (data.symptomDurationDays) parts.push(`- Symptome sichtbar seit: ${data.symptomDurationDays}`);
  if (data.recentChanges && data.recentChanges.length > 0) {
    parts.push(`- Kürzliche Änderungen im Setup: ${(data.recentChanges as string[]).join(', ')}`);
  }

  if (data.waterTempCelsius && data.waterTempCelsius !== 'Weiß nicht') {
    parts.push(`- Wassertemperatur: ${data.waterTempCelsius}`);
  }
  if (data.substrateTempCelsius && data.substrateTempCelsius !== 'Weiß nicht') {
    parts.push(`- Substrat-Temperatur: ${data.substrateTempCelsius}`);
  }
  if (data.phFeed && data.phFeed !== 'Nicht gemessen') {
    parts.push(`- pH der Nährlösung: ${data.phFeed}`);
  }
  if (data.ecPpm && data.ecPpm !== 'Nicht gemessen') {
    parts.push(`- EC/PPM: ${data.ecPpm}`);
  }
  if (data.roomTempCelsius) parts.push(`- Raumtemperatur: ${data.roomTempCelsius}`);
  if (data.humidityPercent && data.humidityPercent !== 'Weiß nicht') {
    parts.push(`- Luftfeuchtigkeit: ${data.humidityPercent}`);
  }

  // Add fertilizer context if available
  const fertContext = getFertilizerContext(data.fertilizerType, data.plantAgeWeeks, data.growPhase);
  if (fertContext) {
    parts.push(fertContext);
  }

  parts.push('\nAnalysiere die Fotos systematisch anhand deiner Diagnose-Checkliste. Wenn wichtige Daten fehlen (pH, EC, Temperatur), erwähne welche Messungen der Grower durchführen sollte.');

  return parts.join('\n');
}

export function buildFollowUpPrompt(
  data: QuestionnaireData,
  previousResult: DiagnosisResult,
  daysSinceLast: number
): string {
  const base = buildUserPrompt(data);

  return `${base}

VORHERIGE DIAGNOSE (vor ${daysSinceLast} Tagen):
- Diagnose: ${previousResult.primaryDiagnosis}
- Schweregrad: ${previousResult.severity}
- Ursachenanalyse: ${previousResult.rootCauseAnalysis}
- Empfohlene Maßnahmen: ${previousResult.actionPlan.map((s) => `${s.action}: ${s.details}`).join(' | ')}

Vergleiche den aktuellen Zustand mit der vorherigen Diagnose. Hat die Behandlung gewirkt?`;
}
