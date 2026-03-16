import fs from 'fs';
import path from 'path';
import os from 'os';

const API_KEY = process.env.EXPO_PUBLIC_OPENAI_API_KEY || fs.readFileSync('.env', 'utf8').match(/EXPO_PUBLIC_OPENAI_API_KEY=(.*)/)?.[1];
const API_URL = 'https://api.openai.com/v1/chat/completions';
const MODEL = 'gpt-4o-mini';

const FULL_PROMPT = `Du bist ein Cannabis-Pathologie-Experte. Analysiere das Bild mit der 5-Dimensionen-Methode.

SYSTEMATISCHE ANALYSE – 5-DIMENSIONEN-DIAGNOSE:
D1 – FARBE: Welche exakte Farbe hat die Verfärbung?
D2 – TEXTUR: Ist das Gewebe noch lebendig/weich oder trocken/knusprig/tot?
D3 – MUSTER: Gleichmäßig über ganzes Blatt, zwischen Adern, an Rändern, Spitzen, Flecken?
D4 – POSITION: Welche Blätter sind betroffen? Alte/untere, neue/obere, alle?
D5 – AUSMASS: Wie viele Blätter? Eins, wenige, viele, gesamte Pflanze?

── SYMPTOM-TABELLE ──

STICKSTOFF(N)-MANGEL:
  D1: Gelb – gesamtes Blatt gleichmäßig blass/gelb (Adern können LEICHT grüner sein – normal bei N, NICHT Mg!)
  D2: Noch lebendig, weich, nicht knusprig
  D3: GLEICHMÄSSIG über gesamte Blattfläche, inkl. Ränder. KEIN auffälliges Adernmuster
  D4: Alte/untere Blätter zuerst, wandert nach oben
  D5: Viele Blätter, progressiv von unten nach oben

MAGNESIUM(Mg)-MANGEL:
  D1: Gelb ZWISCHEN Adern, Adern bleiben DEUTLICH SATTGRÜN (STARKER Kontrast – "Fischgräten")
  D2: Noch lebendig, Blattränder können sich nach oben rollen
  D3: Klar IN FELDERN zwischen Adern. Von Blattmitte nach außen
  D4: Untere bis mittlere Blätter

EISEN(Fe)-MANGEL:
  D1: Gelb bis weiß/bleich, Adern bleiben grün
  D2: Noch lebendig
  D3: Interveinal (wie Mg), aber viel stärker gebleicht
  D4: NEUE/OBERE Blätter zuerst! (immobil – unterscheidet von Mg!)

PHOSPHOR(P)-MANGEL [Wissenschaftlich korrigiert]:
  D1: Dunkelgrün bis blau-grün, MATT/stumpf. Olive-grüne Flecken. Violett/purpur erst SPÄTER
  D2: Noch LEBENDIG, Blätter werden dicker. Olive Flecken wirken "eingesunken"
  D3: INITIAL: olive-grüne Flecken auf alten Blättern. DANN: Stängel/Blattstiele violett/rot
  D4: Untere/mittlere Blätter, auch Stängel
  EXTRA: Genetisch violett = GLÄNZEND; P-Mangel violett = MATT/stumpf

KALIUM(K)-MANGEL [Wissenschaftlich]:
  D1: ZUERST gelb an Sägezahn-Rändern, DANN braun/nekrotisch. Nicht violett!
  D2: TROCKEN, knusprig, papierartig – TOTES Gewebe
  D3: Beginnt an Sägezahn-Blatträndern, wandert INNEN zum Mittelnerv
  D4: Untere/mittlere Blätter zuerst (mobil)
  EXTRA: UNTERSCHIED Nährstoffbrand: K = ganzer Rand erst gelb dann braun. Nährstoffbrand = NUR Spitzen 1-3mm sofort braun

KALZIUM(Ca)-MANGEL [Wissenschaftlich]:
  D1: Kleine gelbe Flecken → braun. Basisteil der Leaflets heller als Spitze
  D2: Trocken, nekrotisch. Stängel brüchig
  D3: Unregelmäßige FLECKEN + intervenale Chlorose. Irreguläre Blattformen
  D4: NEUE Blätter (immobil!) – deformiert, schmale Basis, Wachstumsspitze stirbt

NÄHRSTOFFBRAND (Überdüngung):
  D1: Braun – NUR an den ÄUSSERSTEN SPITZEN
  D2: Trocken, knusprig – scharf abgegrenzt
  D3: NUR Blattspitzen (1-3mm), wie angesengt. NICHT die Ränder entlang!
  D4: Alle Blätter gleichmäßig, Rest grün
  EXTRA: K-Mangel = ganzer Rand betroffen. Nährstoffbrand = NUR Spitze

STICKSTOFF(N)-ÜBERSCHUSS (Toxizität):
  D1: DUNKELGRÜN, unnatürlich satt, GLÄNZEND/glossy (auffällig!)
  D2: Lebendig aber steif, wachsartig
  D3: Dunkelgrün ab Rändern, Blattspitzen krallen UNTEN ("Eagle Claw")
  D4: Alle Blätter, gesamte Pflanze auffällig dunkler als gesund
  EXTRA: Extrem dunkelgrün = NICHT "gesund"! Gesunde Pflanzen sind mittelgrün, nicht schwarz-grün

LICHTBRAND:
  D1: Weiß, gebleicht, hellgelb
  D2: Kann trocken/papierartig werden
  D3: OBERE Blattflächen, lampen-zugewandte Seite
  D4: NUR obere/lampennahe Blätter! Untere Blätter nicht betroffen

HITZESTRESS:
  D1: Ränder können gelb/braun werden
  D2: Lebendig, weich
  D3: Blätter rollen sich nach OBEN ("Taco-Form"), Ränder kräuseln sich
  D4: Obere/lampennahe Blätter zuerst

ÜBERWÄSSERUNG:
  D1: Dunkelgrün bis gelblich-grün, Blätter sehen "zu voll" aus
  D2: SCHLAFF, PRALL/geschwollen/schwer (nicht dünn wie bei Unterwässerung!)
  D3: Gesamte Pflanze hängt/sackt bei NASSEM Substrat
  D4: Alle Blätter gleichzeitig
  EXTRA: Nasses Substrat + hängende Pflanze = Überwässerung! Auch dunkelgrün + hängend = Überwässerung

UNTERWÄSSERUNG:
  D1: Normal bis blass
  D2: Dünn, schlaff, papierartig – hängende DÜNNE Blätter (NICHT prall wie bei Überwässerung!)
  D3: Gesamte Pflanze hängt
  D4: Alle Blätter
  EXTRA: Trockenes Substrat + dünne schlaffe Blätter. Erholt sich SCHNELL nach Gießen.

MANGAN(Mn)-MANGEL:
  D1: Hellgelb/tan zwischen Adern, tan-braune Flecken
  D2: Papierartig, trocken an Fleckenstellen
  D3: Gesprenkelt/"mottled" – unregelmäßige tan/braune Flecken zwischen Adern
  D4: NEUE/JUNGE Blätter (immobil)

NÄHRSTOFF-MOBILITÄT (SCHLÜSSEL):
  MOBIL (alte/untere Blätter zuerst): N, P, K, Mg
  IMMOBIL (neue/obere Blätter zuerst): Ca, Fe, Mn, Zn, B, Cu

WICHTIG: Wenn die Pflanze GESUND aussieht, sag das klar. Nicht nach Problemen suchen die nicht da sind.

Gib NUR JSON zurück: {"diagnose":"...","konfidenz":0.0-1.0,"dimensionen":{"D1":"...","D2":"...","D3":"...","D4":"...","D5":"..."},"begruendung":"..."}`;

// Tests using user-provided images (multiple per deficiency where available)
const tests = [
  // Kalium - 4 user images
  { file: 'kalium_1_user.jpg', expected: 'Kalium (K) Mangel' },
  { file: 'kalium_2_user.jpg', expected: 'Kalium (K) Mangel' },
  { file: 'kalium_3_user.jpg', expected: 'Kalium (K) Mangel' },
  { file: 'kalium_4_user.jpg', expected: 'Kalium (K) Mangel' },
  // Kalzium - 3 user images
  { file: 'kalzium_1_user.jpg', expected: 'Kalzium (Ca) Mangel' },
  { file: 'kalzium_2_user.jpg', expected: 'Kalzium (Ca) Mangel' },
  { file: 'kalzium_3_user.jpg', expected: 'Kalzium (Ca) Mangel' },
  // Phosphor - 3 user images
  { file: 'phosphor_1_user.jpg', expected: 'Phosphor (P) Mangel' },
  { file: 'phosphor_2_user.jpg', expected: 'Phosphor (P) Mangel' },
  { file: 'phosphor_3_user.jpg', expected: 'Phosphor (P) Mangel' },
  // Eisen - 1 user image
  { file: 'eisen_user.jpg', expected: 'Eisen (Fe) Mangel' },
  // Nährstoffbrand - 3 user images
  { file: 'naehrstoffbrand_1_user.jpg', expected: 'Nährstoffbrand' },
  { file: 'naehrstoffbrand_2_user.jpg', expected: 'Nährstoffbrand' },
  { file: 'naehrstoffbrand_3_user.jpg', expected: 'Nährstoffbrand' },
  // N-Toxizität - 5 user images
  { file: 'n_toxizitaet_1_user.jpg', expected: 'Stickstoff-Überschuss (N-Toxizität)' },
  { file: 'n_toxizitaet_2_user.jpg', expected: 'Stickstoff-Überschuss (N-Toxizität)' },
  { file: 'n_toxizitaet_3_user.jpg', expected: 'Stickstoff-Überschuss (N-Toxizität)' },
  { file: 'n_toxizitaet_4_user.jpg', expected: 'Stickstoff-Überschuss (N-Toxizität)' },
  { file: 'n_toxizitaet_5_user.jpg', expected: 'Stickstoff-Überschuss (N-Toxizität)' },
  // Lichtbrand - 1 user image
  { file: 'lichtbrand_user.jpg', expected: 'Lichtbrand' },
  // Überwässerung - 4 user images
  { file: 'ueberwaesserung_1_user.jpg', expected: 'Überwässerung' },
  { file: 'ueberwaesserung_2_user.jpg', expected: 'Überwässerung' },
  { file: 'ueberwaesserung_3_user.jpg', expected: 'Überwässerung' },
  { file: 'ueberwaesserung_4_user.jpg', expected: 'Überwässerung' },
  // Unterwässerung - 1 user image
  { file: 'unterwaesserung_user.jpg', expected: 'Unterwässerung' },
];

const keywords = {
  'kalium': ['kalium', 'potassium', 'k-mangel', 'kaliummangel', '(k)'],
  'kalzium': ['kalzium', 'calcium', 'ca-mangel', 'kalziummangel', '(ca)'],
  'phosphor': ['phosphor', 'phosphorus', 'p-mangel', 'phosphormangel', '(p)'],
  'eisen': ['eisen', 'iron', 'fe-mangel', 'eisenmangel', '(fe)'],
  'nährstoffbrand': ['nährstoffbrand', 'nutrient burn', 'überdüngung', 'nährstoff-brand', 'naehrstoffbrand'],
  'stickstoff-überschuss': ['überschuss', 'toxizität', 'toxicity', 'n-toxiz', 'überdüng', 'n-überschuss', 'krallen', 'eagle claw', '(n)-überschuss'],
  'lichtbrand': ['lichtbrand', 'light burn', 'lichtverbrennung', 'lichtstress', 'lichtschaden'],
  'überwässerung': ['überwässerung', 'overwater', 'zu viel wasser', 'überwässer'],
  'unterwässerung': ['unterwässerung', 'underwater', 'zu wenig wasser', 'unterwässer', 'dehydr'],
};

async function testImage(test) {
  const imgPath = path.join(os.tmpdir(), test.file);
  if (!fs.existsSync(imgPath)) {
    console.log(`\n  SKIP: ${test.file} nicht gefunden`);
    return null;
  }
  const base64 = fs.readFileSync(imgPath).toString('base64');

  const res = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_KEY}`,
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 500,
      messages: [
        { role: 'system', content: FULL_PROMPT },
        {
          role: 'user',
          content: [
            { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${base64}` } },
            { type: 'text', text: 'Analysiere dieses Cannabis-Blatt. Welcher Mangel/welches Problem liegt vor?' },
          ],
        },
      ],
    }),
  });

  const data = await res.json();
  const content = data.choices?.[0]?.message?.content || JSON.stringify(data);

  // Check if correct
  const lower = content.toLowerCase();
  const expectedLower = test.expected.toLowerCase();
  const key = Object.keys(keywords).find(k => expectedLower.includes(k));
  const correct = key ? keywords[key].some(kw => lower.includes(kw)) : false;

  return { correct, content, file: test.file };
}

console.log('=== CannaDiagnose KI-Diagnose-Test (User-Bilder) ===');
console.log(`Modell: ${MODEL}\n`);

// Group tests by expected diagnosis
const groups = {};
for (const t of tests) {
  if (!groups[t.expected]) groups[t.expected] = [];
  groups[t.expected].push(t);
}

let totalCorrect = 0;
let totalTests = 0;
const results = {};

for (const [expected, groupTests] of Object.entries(groups)) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`  ${expected} (${groupTests.length} Bilder)`);
  console.log(`${'='.repeat(60)}`);

  let groupCorrect = 0;
  for (const test of groupTests) {
    const result = await testImage(test);
    if (result === null) continue;
    totalTests++;

    // Show short result
    const diagMatch = result.content.match(/"diagnose"\s*:\s*"([^"]+)"/);
    const diag = diagMatch ? diagMatch[1] : result.content.substring(0, 80);
    const icon = result.correct ? '✅' : '❌';
    console.log(`  ${icon} ${test.file}: ${diag}`);

    if (result.correct) { groupCorrect++; totalCorrect++; }
  }
  const pct = Math.round(groupCorrect / groupTests.length * 100);
  results[expected] = `${groupCorrect}/${groupTests.length} (${pct}%)`;
  console.log(`  → ${groupCorrect}/${groupTests.length} korrekt`);
}

console.log(`\n${'='.repeat(60)}`);
console.log(`  ZUSAMMENFASSUNG`);
console.log(`${'='.repeat(60)}`);
for (const [name, res] of Object.entries(results)) {
  console.log(`  ${res} — ${name}`);
}
console.log(`\n  GESAMT: ${totalCorrect}/${totalTests} korrekt (${Math.round(totalCorrect/totalTests*100)}%)`);
