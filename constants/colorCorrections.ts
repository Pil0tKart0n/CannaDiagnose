import { DiagnosisResult } from '../types';

/**
 * Lokale Farbkorrektur-Zuordnung.
 * Wenn der Nutzer eine Farbe beobachtet, wird die Diagnose lokal angepasst
 * (ohne API-Kosten).
 */

export interface ColorCorrection {
  label: string;
  keywords: string[];
  correction: {
    diagnosis: string;
    explanation: string;
    severity: 'niedrig' | 'mittel' | 'hoch' | 'kritisch';
  };
}

export const KNOWN_COLORS: ColorCorrection[] = [
  {
    label: 'Hellgrün',
    keywords: [
      'hellgrün',
      'hellgruen',
      'hellgr',
      'blass grün',
      'blassgrün',
      'blassgruen',
      'lime',
      'lindgrün',
      'lindgruen',
    ],
    correction: {
      diagnosis: 'Stickstoff(N)-Mangel im Frühstadium – Blätter werden blass/hellgrün bevor sie vergilben.',
      explanation:
        'Der Grower bestätigt eine hellgrüne Blattfarbe. Hellgrüne Blätter (statt satt dunkelgrün) sind oft das erste Anzeichen eines beginnenden Stickstoff-Mangels – die Pflanze beginnt Chlorophyll abzubauen. Wenn es die unteren/älteren Blätter betrifft: N-Mangel wahrscheinlich. Wenn es neue Blätter betrifft: könnte auch Schwefel(S)-Mangel oder Eisen(Fe)-Mangel sein.',
      severity: 'mittel',
    },
  },
  {
    label: 'Gelb (gleichmäßig)',
    keywords: ['gelb', 'gelblich', 'hellgelb', 'vergilbt', 'vergilbung'],
    correction: {
      diagnosis:
        'Stickstoff(N)-Mangel – gleichmäßige Vergilbung des gesamten Blattes, bestätigt durch Farbangabe des Growers.',
      explanation:
        'Der Grower bestätigt eine gleichmäßige Gelbfärbung ohne auffälliges Adernmuster. Dies ist das klassische Bild eines Stickstoff-Mangels: Das gesamte Blatt wird blass/gelb, die Pflanze mobilisiert N aus älteren Blättern. Bei leicht grüneren Adern handelt es sich um den normalen Verlauf – die Adern vergilben zuletzt.',
      severity: 'hoch',
    },
  },
  {
    label: 'Gelb (Adern grün)',
    keywords: ['adern grün', 'adern gruen', 'interveinal', 'fischgräte', 'fischgraete'],
    correction: {
      diagnosis:
        'Magnesium(Mg)-Mangel – intervenale Chlorose mit deutlich grünen Adern, bestätigt durch Farbangabe des Growers.',
      explanation:
        'Der Grower bestätigt deutlich grüne Blattadern bei gelbem Gewebe dazwischen – das klassische Fischgräten-Muster eines Mg-Mangels. In Kokos häufig durch pH-Drift unter 5.8 oder fehlende CalMag-Supplementierung verursacht.',
      severity: 'hoch',
    },
  },
  {
    label: 'Violett / Purpur',
    keywords: ['violett', 'purpur', 'lila', 'purple', 'violet'],
    correction: {
      diagnosis: 'Phosphor(P)-Mangel – violette/purpurne Verfärbung, bestätigt durch Farbangabe des Growers.',
      explanation:
        'Der Grower bestätigt violette/purpurne Verfärbungen. Dies deutet auf Phosphor-Mangel hin. P-Mangel zeigt sich typisch durch dunkelgrüne Blätter mit violettem Schimmer, purpurne Stängel/Blattstiele, und violette Blattränder. Kann auch durch Kälte (<15°C) oder Genetik verstärkt werden.',
      severity: 'hoch',
    },
  },
  {
    label: 'Braun / Trocken',
    keywords: ['braun', 'rostbraun', 'rostfarben', 'nekrose', 'nekrotisch', 'trocken', 'knusprig'],
    correction: {
      diagnosis:
        'Kalium(K)-Mangel oder Nährstoffbrand – braune, trockene Nekrosen, bestätigt durch Farbangabe des Growers.',
      explanation:
        'Der Grower bestätigt braune, trockene Verfärbungen (totes Gewebe). An den Blatträndern von außen nach innen wandernd deutet dies auf K-Mangel hin. Nur an den äußersten Blattspitzen = Nährstoffbrand (Überdüngung). Prüfe EC-Wert und pH.',
      severity: 'hoch',
    },
  },
  {
    label: 'Weiß / Bleich',
    keywords: ['weiß', 'weiss', 'bleich', 'gebleicht', 'albino'],
    correction: {
      diagnosis: 'Lichtbrand oder Eisen(Fe)-Mangel – gebleichte/weiße Blätter, bestätigt durch Farbangabe des Growers.',
      explanation:
        'Der Grower bestätigt weiße/gebleichte Blattbereiche. An oberen/lampennahen Blättern = Lichtbrand (Lampe höher hängen oder dimmen). An neuen Blättern generell = Fe-Mangel (pH prüfen, oft >7.0). Beides erfordert schnelles Handeln.',
      severity: 'hoch',
    },
  },
  {
    label: 'Dunkelgrün',
    keywords: ['dunkelgrün', 'dunkelgruen', 'sattgrün', 'sattgruen', 'tiefgrün', 'tiefgruen'],
    correction: {
      diagnosis: 'Stickstoff(N)-Überschuss – unnatürlich dunkelgrüne Blätter, bestätigt durch Farbangabe des Growers.',
      explanation:
        'Der Grower bestätigt unnatürlich dunkelgrüne Blätter. In Kombination mit nach unten gekrallten Blattspitzen ("Eagle Claw") = klassische N-Toxizität. Sofort Düngung reduzieren und mit reinem Wasser spülen.',
      severity: 'mittel',
    },
  },
  {
    label: 'Rot / Rötlich',
    keywords: ['rot', 'rötlich', 'roetlich', 'rötliche', 'roetliche'],
    correction: {
      diagnosis: 'Phosphor(P)-Mangel oder Kältestress – rötliche Verfärbungen, bestätigt durch Farbangabe des Growers.',
      explanation:
        'Der Grower bestätigt rötliche Verfärbungen. Rote/rötliche Stängel und Blattteile deuten auf P-Mangel oder Kältestress (<15°C nachts) hin. Kann auch genetisch bedingt sein. Prüfe Nachttemperaturen und P-Versorgung.',
      severity: 'mittel',
    },
  },
  {
    label: 'Silbrig / Glänzend',
    keywords: ['silbrig', 'silber', 'glänzend', 'glaenzend', 'schimmernd'],
    correction: {
      diagnosis: 'Thripse-Befall – silbrige/glänzende Spuren auf Blättern, bestätigt durch Farbangabe des Growers.',
      explanation:
        'Der Grower bestätigt silbrige/glänzende Verfärbungen. Dies sind typische Fraßspuren von Thripsen – die Schädlinge raspeln die obere Zellschicht ab, was silbrige Streifen hinterlässt. Oft begleitet von kleinen schwarzen Kotpunkten. Sofortige Behandlung mit Neem-Öl oder Raubmilben empfohlen.',
      severity: 'hoch',
    },
  },
];

/**
 * Wendet eine Farbkorrektur auf ein bestehendes Diagnose-Ergebnis an.
 * Die ursprüngliche Diagnose wird als Referenz beibehalten.
 */
export function applyColorCorrection(color: ColorCorrection, currentResult: DiagnosisResult): DiagnosisResult {
  return {
    ...currentResult,
    primaryDiagnosis: color.correction.diagnosis,
    rootCauseAnalysis:
      color.correction.explanation + '\n\n(Ursprüngliche Diagnose: ' + currentResult.primaryDiagnosis + ')',
    severity: color.correction.severity,
    confidence: Math.max(currentResult.confidence, 0.8),
  };
}
