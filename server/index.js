const express = require('express');
const Stripe = require('stripe');
const cors = require('cors');
const crypto = require('crypto');
const Database = require('better-sqlite3');
const path = require('path');

// Server-side prompts (never sent to client)
const { SYSTEM_PROMPT, FOLLOWUP_SYSTEM_PROMPT, REFINE_SYSTEM_PROMPT,
        buildUserPrompt, buildFollowUpPrompt, buildRefinePrompt } = require('./prompts');

const IMAGE_CHECK_PROMPT = `Siehst du auf diesem Foto eine Cannabis-Pflanze oder Teile davon (Blatt, Blüte, Stängel, Sämling)?
Antworte NUR mit einem JSON-Objekt: {"isCannabis": true} oder {"isCannabis": false}
Keine weitere Erklärung. Nur JSON.`;

const VERIFY_PROMPT = `Du bist ein Cannabis-Diagnose-Verifikator. Du bekommst:
1. Das Foto des Users (erstes Bild)
2. Bestätigte Referenzbilder einer bestimmten Mangelerscheinung (weitere Bilder)
3. Die vorgeschlagene Diagnose

Deine Aufgabe: Vergleiche das User-Foto mit den Referenzbildern.

Antworte NUR mit JSON:
{
  "verified": true/false,
  "confidence": 0.0-1.0,
  "reasoning": "Kurze Begründung warum das User-Foto den Referenzbildern entspricht oder nicht",
  "alternative": "Falls nicht verifiziert: welche Diagnose passt besser? Sonst null"
}`;

const app = express();
const PORT = 4000;

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const DOMAIN = process.env.DOMAIN || 'https://leafscan.de';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const ALLOWED_MODELS = new Set(['gpt-4o', 'gpt-4o-mini']);
const FREE_SCANS_PER_DAY = 1;
const ADMIN_KEY = process.env.ADMIN_KEY || 'ls-admin-2026-Rz7vP3kW';

// ── SQLite setup ──
const dbPath = path.join(__dirname, 'data', 'leafscan.db');
const fs = require('fs');
fs.mkdirSync(path.join(__dirname, 'data'), { recursive: true });
const db = new Database(dbPath);
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS scan_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ip TEXT NOT NULL,
    scanned_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_scan_ip_date ON scan_log(ip, scanned_at);

  CREATE TABLE IF NOT EXISTS premium_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_token TEXT UNIQUE NOT NULL,
    stripe_customer_id TEXT,
    stripe_subscription_id TEXT,
    plan TEXT NOT NULL DEFAULT 'pro',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    active INTEGER NOT NULL DEFAULT 1
  );
  CREATE INDEX IF NOT EXISTS idx_premium_token ON premium_sessions(session_token);
  CREATE INDEX IF NOT EXISTS idx_premium_customer ON premium_sessions(stripe_customer_id);
  CREATE INDEX IF NOT EXISTS idx_premium_subscription ON premium_sessions(stripe_subscription_id);

  CREATE TABLE IF NOT EXISTS promo_codes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT UNIQUE NOT NULL,
    days INTEGER NOT NULL DEFAULT 10,
    max_uses INTEGER NOT NULL DEFAULT 9999,
    used INTEGER NOT NULL DEFAULT 0,
    active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_promo_code ON promo_codes(code);

  CREATE TABLE IF NOT EXISTS promo_redemptions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT NOT NULL,
    ip TEXT NOT NULL,
    device_id TEXT NOT NULL DEFAULT '',
    redeemed_at TEXT NOT NULL DEFAULT (datetime('now')),
    expires_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_promo_ip ON promo_redemptions(ip);

  CREATE TABLE IF NOT EXISTS feedback (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    rating TEXT NOT NULL CHECK(rating IN ('positive', 'negative')),
    diagnosis TEXT,
    severity TEXT,
    confidence REAL,
    substrate TEXT,
    fertilizer TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_feedback_date ON feedback(created_at);
`);

// Migration: feedback_detailed table for full diagnosis data + images
try {
  db.exec(`
    CREATE TABLE IF NOT EXISTS feedback_detailed (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      rating TEXT NOT NULL CHECK(rating IN ('positive', 'negative')),
      diagnosis_json TEXT,
      questionnaire_json TEXT,
      image_paths TEXT,
      ip TEXT,
      device_id TEXT DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_feedback_detailed_date ON feedback_detailed(created_at);
    CREATE INDEX IF NOT EXISTS idx_feedback_detailed_rating ON feedback_detailed(rating);
  `);
} catch (e) {}

// Ensure feedback_images directory exists
const feedbackImagesDir = path.join(__dirname, 'data', 'feedback_images');
fs.mkdirSync(feedbackImagesDir, { recursive: true });

// Migration: add device_id column if missing (existing DBs won't have it)
try {
  db.exec(`ALTER TABLE promo_redemptions ADD COLUMN device_id TEXT NOT NULL DEFAULT ''`);
} catch (e) {
  // Column already exists — ignore
}
try {
  db.exec(`CREATE INDEX IF NOT EXISTS idx_promo_device ON promo_redemptions(device_id)`);
} catch (e) {}

// Prepared statements for performance
const stmtCountScans = db.prepare(`
  SELECT COUNT(*) as count FROM scan_log
  WHERE ip = ? AND scanned_at >= date('now')
`);
const stmtInsertScan = db.prepare(`INSERT INTO scan_log (ip) VALUES (?)`);
const stmtAtomicScan = db.prepare(`
  INSERT INTO scan_log (ip)
  SELECT ? WHERE (SELECT COUNT(*) FROM scan_log WHERE ip = ? AND scanned_at >= date('now')) < ?
`);
const stmtRefundScan = db.prepare(`
  DELETE FROM scan_log WHERE id = (
    SELECT id FROM scan_log WHERE ip = ? ORDER BY id DESC LIMIT 1
  )
`);
const stmtUpdatePlan = db.prepare(`UPDATE premium_sessions SET plan = ? WHERE session_token = ?`);
const stmtFindSession = db.prepare(`SELECT * FROM premium_sessions WHERE session_token = ? AND active = 1`);
const stmtCreateSession = db.prepare(`
  INSERT INTO premium_sessions (session_token, stripe_customer_id, stripe_subscription_id, plan)
  VALUES (?, ?, ?, ?)
`);
const stmtFindByCustomer = db.prepare(`SELECT * FROM premium_sessions WHERE stripe_customer_id = ? AND active = 1`);
const stmtDeactivateBySubscription = db.prepare(`UPDATE premium_sessions SET active = 0 WHERE stripe_subscription_id = ?`);
const stmtInsertFeedback = db.prepare(`
  INSERT INTO feedback (rating, diagnosis, severity, confidence, substrate, fertilizer)
  VALUES (?, ?, ?, ?, ?, ?)
`);
const stmtFeedbackStats = db.prepare(`
  SELECT rating, COUNT(*) as count FROM feedback GROUP BY rating
`);
const stmtFeedbackRecent = db.prepare(`
  SELECT * FROM feedback ORDER BY created_at DESC LIMIT ?
`);
const stmtDeactivateByCustomer = db.prepare(`UPDATE premium_sessions SET active = 0 WHERE stripe_customer_id = ?`);

// ── Promo code statements ──
const stmtFindPromo = db.prepare(`SELECT * FROM promo_codes WHERE code = ? AND active = 1`);
const stmtIncrementPromo = db.prepare(`UPDATE promo_codes SET used = used + 1 WHERE code = ?`);
// Check if this IP or device has EVER redeemed ANY promo code
const stmtCheckRedeemedByIp = db.prepare(`SELECT * FROM promo_redemptions WHERE ip = ? LIMIT 1`);
const stmtCheckRedeemedByDevice = db.prepare(`SELECT * FROM promo_redemptions WHERE device_id = ? AND device_id != '' LIMIT 1`);
const stmtRedeemPromo = db.prepare(`INSERT INTO promo_redemptions (code, ip, device_id, expires_at) VALUES (?, ?, ?, datetime('now', '+' || ? || ' days'))`);
const stmtActivePromo = db.prepare(`SELECT * FROM promo_redemptions WHERE (ip = ? OR (device_id = ? AND device_id != '')) AND expires_at > datetime('now') ORDER BY expires_at DESC LIMIT 1`);

// Seed default promo codes (only if they don't exist yet)
const seedPromo = db.prepare(`INSERT OR IGNORE INTO promo_codes (code, days, max_uses) VALUES (?, ?, ?)`);
seedPromo.run('HOMEGROW', 10, 9999);
seedPromo.run('HGC2026', 10, 9999);

// Permanent VIP codes for mods (1 use each, 100 years = forever)
const vipCodes = [
  'VIP-K7X2', 'VIP-M3R9', 'VIP-Q5W1', 'VIP-T8N4', 'VIP-J6P3',
  'VIP-H2L8', 'VIP-F9D5', 'VIP-B4G7', 'VIP-Y1C6', 'VIP-S7A2',
  'VIP-W3E9', 'VIP-N5V1', 'VIP-R8X4', 'VIP-L2Z6', 'VIP-D4U8',
];
for (const code of vipCodes) {
  seedPromo.run(code, 36500, 1);
}

// Cleanup old scan logs (keep 7 days)
const stmtCleanupScans = db.prepare(`DELETE FROM scan_log WHERE scanned_at < date('now', '-7 days')`);
function cleanupOldScans() {
  stmtCleanupScans.run();
}
setInterval(cleanupOldScans, 24 * 60 * 60 * 1000); // daily
cleanupOldScans();

// Store price IDs after creation/lookup
let growerPriceId = null;
let proPriceId = null;
let productsReady = false;

// ── Middleware ──
app.use(cors({
  origin: function(origin, callback) {
    // Allow requests from web domain
    const allowedOrigins = ['https://leafscan.de', 'https://www.leafscan.de'];
    // Allow requests with no origin (native apps, server-to-server)
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Trust only the first proxy hop (nginx). Using `true` would trust ALL proxies,
// allowing attackers to spoof X-Forwarded-For and bypass rate limits.
app.set('trust proxy', 1);

// Webhook needs raw body, everything else gets JSON parsed
app.use('/api/stripe/webhook', express.raw({ type: 'application/json' }));
app.use(express.json({ limit: '30mb' }));

/** Extract client IP — use req.ip which respects trust proxy setting safely */
function getClientIP(req) {
  return req.ip;
}

/** Get the applicable scan limit for this request */
function getScanLimit() {
  return FREE_SCANS_PER_DAY;
}

/** Check if a session token is valid premium (with expiry safety-net) */
const SESSION_MAX_AGE_DAYS = 35; // slightly over 1 month — forces re-verification
function checkPremium(token, req) {
  // 1. Check Stripe premium session
  if (token) {
    const session = stmtFindSession.get(token);
    if (session) {
      const createdAt = new Date(session.created_at + 'Z');
      const ageMs = Date.now() - createdAt.getTime();
      if (ageMs > SESSION_MAX_AGE_DAYS * 24 * 60 * 60 * 1000) {
        stmtDeactivateBySubscription.run(session.stripe_subscription_id);
      } else {
        return session;
      }
    }
  }
  // 2. Check active promo code redemption (by IP or device_id)
  if (req) {
    const ip = getClientIP(req);
    const deviceId = req.headers['x-device-id'] || '';
    const promo = stmtActivePromo.get(ip, deviceId);
    if (promo) {
      return { plan: 'promo', promo_code: promo.code, expires_at: promo.expires_at };
    }
  }
  return null;
}

// ── IP-based rate limiting (anti-abuse) ──
const ipRequestCounts = new Map();
setInterval(() => ipRequestCounts.clear(), 60 * 1000); // reset every minute

function rateLimit(req, res, next) {
  const ip = getClientIP(req);
  const count = (ipRequestCounts.get(ip) || 0) + 1;
  ipRequestCounts.set(ip, count);
  if (count > 10) { // max 10 requests per minute per IP
    return res.status(429).json({ error: 'rate_limited', message: 'Zu viele Anfragen. Bitte warte eine Minute.' });
  }
  next();
}

// ══════════════════════════════════════════════════════════════════
// ██  /api/scan — SERVER-SIDE PROMPT BUILDING (prompts never leave server) ██
// ══════════════════════════════════════════════════════════════════

/** Validate that images are base64 data URIs */
function validateImages(images) {
  if (!Array.isArray(images) || images.length === 0 || images.length > 5) return false;
  return images.every(img => typeof img === 'string' && img.startsWith('data:image/'));
}

/** Build OpenAI image blocks from base64 data URIs */
function toImageBlocks(images) {
  return images.map(url => ({ type: 'image_url', image_url: { url } }));
}

app.post('/api/scan', rateLimit, async (req, res) => {
  if (!OPENAI_API_KEY) {
    return res.status(500).json({ error: 'server_error', message: 'API nicht konfiguriert.' });
  }

  const ip = getClientIP(req);
  const { mode, images } = req.body;

  // Require new structured format
  if (!mode || !images) {
    return res.status(400).json({ error: 'invalid_request', message: 'mode and images required' });
  }
  if (!['diagnose', 'refine', 'verify'].includes(mode)) {
    return res.status(400).json({ error: 'invalid_request', message: 'Invalid mode' });
  }
  if (!validateImages(images)) {
    return res.status(400).json({ error: 'invalid_request', message: 'Invalid images (1-5 base64 data URIs required)' });
  }

  // Build messages server-side based on mode
  let messages;
  let maxTokens = 2048;
  const imageBlocks = toImageBlocks(images);

  if (mode === 'diagnose') {
    const { questionnaire, isFollowUp, previousResult, daysSince } = req.body;
    if (!questionnaire || typeof questionnaire !== 'object') {
      return res.status(400).json({ error: 'invalid_request', message: 'questionnaire required for diagnose mode' });
    }
    let userPrompt, systemPrompt;
    if (isFollowUp && previousResult && daysSince) {
      userPrompt = buildFollowUpPrompt(questionnaire, previousResult, daysSince);
      systemPrompt = FOLLOWUP_SYSTEM_PROMPT;
    } else {
      userPrompt = buildUserPrompt(questionnaire);
      if (images.length > 1) {
        userPrompt += '\n\n📸 MULTI-FOTO-ANALYSE (' + images.length + ' Fotos): Vergleiche ALLE Fotos miteinander! Prüfe ob die Symptome auf allen Fotos KONSISTENT sind (= systematisches Problem) oder ob verschiedene Fotos UNTERSCHIEDLICHE Symptome zeigen. Wenn die Fotos verschiedene Pflanzenbereiche zeigen (oben vs. unten), nutze das für die Mobilitäts-Analyse (mobil vs. immobil). Nenne in der rootCauseAnalysis, was du auf den verschiedenen Fotos siehst.';
      }
      systemPrompt = SYSTEM_PROMPT;
    }
    messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: [...imageBlocks, { type: 'text', text: userPrompt }] },
    ];
  } else if (mode === 'refine') {
    const { currentDiagnosis, substrate, ph, ec, fertilizer, plantAge, growPhase } = req.body;
    if (!currentDiagnosis) {
      return res.status(400).json({ error: 'invalid_request', message: 'currentDiagnosis required for refine mode' });
    }
    const userPrompt = buildRefinePrompt(currentDiagnosis, substrate, ph, ec, fertilizer, plantAge, growPhase);
    messages = [
      { role: 'system', content: REFINE_SYSTEM_PROMPT },
      { role: 'user', content: [...imageBlocks, { type: 'text', text: userPrompt }] },
    ];
  } else if (mode === 'verify') {
    const { diagnosis } = req.body;
    if (!diagnosis) {
      return res.status(400).json({ error: 'invalid_request', message: 'diagnosis required for verify mode' });
    }
    // images[0] = user photo, images[1+] = reference images
    const refCount = images.length - 1;
    messages = [
      { role: 'system', content: VERIFY_PROMPT },
      {
        role: 'user',
        content: [
          ...imageBlocks,
          { type: 'text', text: `Vorgeschlagene Diagnose: "${diagnosis}". Bild 1 = User-Foto. Bilder 2-${refCount + 1} = bestätigte Referenzbilder. Stimmt die Diagnose?` },
        ],
      },
    ];
    maxTokens = 300;
  }

  // Check for premium session token
  const authHeader = req.headers['authorization'];
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  const premiumSession = checkPremium(token, req);

  // If not premium, atomically reserve a free scan slot
  if (!premiumSession) {
    const limit = getScanLimit();
    const result = stmtAtomicScan.run(ip, ip, limit);
    if (result.changes === 0) {
      const { count } = stmtCountScans.get(ip);
      return res.status(403).json({
        error: 'quota_exceeded',
        message: 'Tageslimit erreicht. Upgrade auf Premium für unbegrenzte Scans.',
        scansToday: count,
        limit,
      });
    }
  }

  // Forward to OpenAI
  try {
    const openaiBody = {
      messages,
      model: 'gpt-4o',
      max_tokens: maxTokens,
      temperature: 0,
      response_format: { type: 'json_object' },
    };

    const openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify(openaiBody),
    });

    let data = await openaiRes.text();

    // Refund scan if OpenAI returned an error
    if (!premiumSession && !openaiRes.ok) {
      try { stmtRefundScan.run(ip); } catch (e) { console.error('[LeafScan] Scan refund failed:', e.message); }
    }

    // ── Texture safety net: if main diagnosis says "healthy", double-check texture ──
    if (mode === 'diagnose' && openaiRes.ok) {
      try {
        const parsed = JSON.parse(data);
        const choices = parsed.choices;
        if (choices && choices[0]) {
          const content = JSON.parse(choices[0].message.content);
          const diagText = (content.primaryDiagnosis || '').toLowerCase();
          const isHealthy = content.severity === 'niedrig' &&
            (content.confidence >= 0.7) &&
            (diagText.includes('gesund') || diagText.includes('healthy') || diagText.includes('keine'));

          if (isHealthy) {
            console.log('[LeafScan] Healthy diagnosis detected — running texture safety check...');
            const texturePrompt = `Du bist ein Cannabis-Grow-Experte. Ignoriere KOMPLETT alle Farben — das Foto ist unter Growlicht aufgenommen.

Analysiere NUR die PHYSISCHE TEXTUR und FORM der Blätter:
1. Sind die Blattoberflächen glatt und flach? Oder gibt es Wellen, Buckel, Blasen?
2. Treten die Blattadern hervor? Sinkt das Gewebe zwischen den Adern ein?
3. Sind die Blattränder glatt oder nach oben/unten gebogen?
4. Gibt es Kräuselung oder "Taco"-Blätter?

Antworte NUR mit JSON:
{"hasTextureIssues": true/false, "description": "Beschreibe kurz und sachlich was du siehst, OHNE technische Analysebegriffe. Schreibe wie ein Grower."}`;

            const textureRes = await fetch('https://api.openai.com/v1/chat/completions', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${OPENAI_API_KEY}`,
              },
              body: JSON.stringify({
                messages: [
                  { role: 'system', content: texturePrompt },
                  { role: 'user', content: [...imageBlocks, { type: 'text', text: 'Prüfe die Blattoberflächen auf diesen Fotos. NUR Textur und Form, keine Farben.' }] },
                ],
                model: 'gpt-4o',
                max_tokens: 200,
                temperature: 0,
                response_format: { type: 'json_object' },
              }),
            });

            if (textureRes.ok) {
              const textureData = await textureRes.json();
              const textureContent = JSON.parse(textureData.choices[0].message.content);

              if (textureContent.hasTextureIssues) {
                console.log('[LeafScan] Texture issues found:', textureContent.description);
                content.severity = 'niedrig';
                content.confidence = 0.60;
                content.primaryDiagnosis = textureContent.description + ' Das könnten frühe Anzeichen für ein beginnendes Problem sein — beobachte die Pflanze in den nächsten Tagen genau.';
                content.rootCauseAnalysis = '';
                content.contributingFactors = [
                  { factor: 'Frühe Anzeichen', impact: 'Noch kein akutes Problem, aber die Pflanze zeigt erste Auffälligkeiten.' },
                ];
                content.actionPlan = [
                  { step: 'pH-Wert prüfen', detail: 'Miss den pH deiner Nährlösung und des Ablaufwassers. Für Kokos: 5.8–6.2, für Erde: 6.0–6.5.' },
                  { step: 'Pflanze beobachten', detail: 'Mach in 3–5 Tagen ein neues Foto und vergleiche ob sich die Symptome verstärkt haben.' },
                  { step: 'Nährstoffversorgung checken', detail: 'Stelle sicher, dass dein Dünger korrekt dosiert ist und CalMag enthalten ist.' },
                ];
                content.followUpDays = 5;
                content.preventiveTips = [
                  'Fotos unter weißem Licht ermöglichen eine genauere Diagnose.',
                  'Regelmäßig pH und EC messen hilft, Probleme früh zu erkennen.',
                ];

                choices[0].message.content = JSON.stringify(content);
                data = JSON.stringify(parsed);
              }
            }
          }
        }
      } catch (textureErr) {
        console.log('[LeafScan] Texture check skipped:', textureErr.message);
      }
    }

    res.status(openaiRes.status)
      .set('Content-Type', openaiRes.headers.get('content-type') || 'application/json')
      .send(data);
  } catch (err) {
    if (!premiumSession) {
      try { stmtRefundScan.run(ip); } catch (e) { console.error('[LeafScan] Scan refund failed:', e.message); }
    }
    console.error('[LeafScan] OpenAI proxy error:', err.message);
    res.status(502).json({ error: 'upstream_error', message: 'KI-Service nicht erreichbar.' });
  }
});

// ══════════════════════════════════════════════════════════════════
// ██  /api/validate — LIGHTWEIGHT IMAGE CHECK (no scan counted) ██
// ══════════════════════════════════════════════════════════════════
app.post('/api/validate', rateLimit, async (req, res) => {
  if (!OPENAI_API_KEY) {
    return res.status(500).json({ error: 'server_error' });
  }

  const { images } = req.body;
  if (!images || !Array.isArray(images) || images.length === 0 || images.length > 5) {
    return res.status(400).json({ error: 'invalid_request', message: 'images array required (1-5)' });
  }
  if (!images.every(img => typeof img === 'string' && img.startsWith('data:image/'))) {
    return res.status(400).json({ error: 'invalid_request', message: 'Only base64 data URIs allowed' });
  }

  // Build messages server-side (IMAGE_CHECK_PROMPT never leaves server)
  const imageBlocks = images.map(url => ({ type: 'image_url', image_url: { url } }));
  const messages = [
    { role: 'user', content: [...imageBlocks, { type: 'text', text: IMAGE_CHECK_PROMPT }] },
  ];

  try {
    const openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        messages,
        model: 'gpt-4o-mini',
        max_tokens: 20,
        temperature: 0,
      }),
    });
    const data = await openaiRes.text();
    res.status(openaiRes.status)
      .set('Content-Type', openaiRes.headers.get('content-type') || 'application/json')
      .send(data);
  } catch (err) {
    console.error('[LeafScan] Validate proxy error:', err.message);
    res.status(502).json({ error: 'upstream_error' });
  }
});

// ══════════════════════════════════════════════════
// ██  /api/quota — CHECK SCAN QUOTA             ██
// ══════════════════════════════════════════════════
app.get('/api/quota', (req, res) => {
  const ip = getClientIP(req);
  const authHeader = req.headers['authorization'];
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  const premiumSession = checkPremium(token, req);

  if (premiumSession) {
    return res.json({
      isPremium: true,
      plan: premiumSession.plan,
      scansToday: 0,
      limit: 999999,
      allowed: true,
    });
  }

  const limit = getScanLimit();
  const { count } = stmtCountScans.get(ip);
  const allowed = count < limit;
  res.json({
    isPremium: false,
    plan: null,
    scansToday: count,
    limit,
    allowed,
  });
});

// ══════════════════════════════════════════════════
// ██  /api/redeem-code — PROMO CODE REDEMPTION    ██
// ══════════════════════════════════════════════════
app.post('/api/redeem-code', rateLimit, (req, res) => {
  const { code } = req.body || {};
  if (!code || typeof code !== 'string') {
    return res.status(400).json({ error: 'missing_code', message: 'Bitte gib einen Code ein.' });
  }

  const cleanCode = code.trim().toUpperCase();
  const deviceId = (req.body.deviceId || '').trim();
  const ip = getClientIP(req);

  // Check if code exists
  const promo = stmtFindPromo.get(cleanCode);
  if (!promo) {
    return res.status(404).json({ error: 'invalid_code', message: 'Ungültiger Code.' });
  }

  // Check max uses (VIP codes = 1 use globally)
  if (promo.used >= promo.max_uses) {
    return res.status(410).json({ error: 'code_exhausted', message: 'Dieser Code wurde bereits eingelöst.' });
  }

  const isVIP = cleanCode.startsWith('VIP-');

  if (isVIP) {
    // VIP codes: check if this specific device already has a VIP code
    if (deviceId) {
      const existingByDevice = stmtCheckRedeemedByDevice.get(deviceId);
      if (existingByDevice && existingByDevice.code.startsWith('VIP-')) {
        return res.status(409).json({ error: 'already_redeemed', message: 'Auf diesem Gerät ist bereits ein VIP-Code aktiv.' });
      }
    }
  } else {
    // Regular promo codes: one per IP and one per device ever
    const existingByIp = stmtCheckRedeemedByIp.get(ip);
    if (existingByIp) {
      return res.status(409).json({ error: 'already_redeemed', message: 'Du hast bereits einen Code eingelöst.' });
    }
    if (deviceId) {
      const existingByDevice = stmtCheckRedeemedByDevice.get(deviceId);
      if (existingByDevice) {
        return res.status(409).json({ error: 'already_redeemed', message: 'Auf diesem Gerät wurde bereits ein Code eingelöst.' });
      }
    }
  }

  // Redeem!
  stmtRedeemPromo.run(cleanCode, ip, deviceId, promo.days);
  stmtIncrementPromo.run(cleanCode);

  const redemption = stmtActivePromo.get(ip, deviceId);

  res.json({
    success: true,
    message: `Code eingelöst! Du hast ${promo.days} Tage Premium.`,
    days: promo.days,
    expires_at: redemption.expires_at,
  });
});

// ══════════════════════════════════════════════════
// ██  /api/verify-session — VERIFY STRIPE PAYMENT ██
// ══════════════════════════════════════════════════
app.get('/api/verify-session', rateLimit, async (req, res) => {
  const { session_id } = req.query;
  if (!session_id || typeof session_id !== 'string' || session_id.length > 200) {
    return res.status(400).json({ error: 'session_id required' });
  }

  try {
    const session = await stripe.checkout.sessions.retrieve(session_id);

    if (session.payment_status !== 'paid') {
      return res.status(402).json({ error: 'not_paid', message: 'Zahlung nicht abgeschlossen.' });
    }

    // Determine plan from the price
    const lineItems = await stripe.checkout.sessions.listLineItems(session_id);
    let plan = 'pro'; // default
    if (lineItems.data.length > 0) {
      const priceId = lineItems.data[0].price?.id;
      if (priceId === growerPriceId) plan = 'grower';
    }

    // Atomic check-then-insert in a transaction to prevent race conditions (double-click etc.)
    const upsertSession = db.transaction((customerId, subscriptionId, plan) => {
      const existing = stmtFindByCustomer.get(customerId);
      if (existing) {
        const createdAt = new Date(existing.created_at + 'Z');
        const ageMs = Date.now() - createdAt.getTime();
        if (ageMs < SESSION_MAX_AGE_DAYS * 24 * 60 * 60 * 1000) {
          return { token: existing.session_token, plan: existing.plan, isNew: false };
        }
        // Expired — deactivate old session
        stmtDeactivateByCustomer.run(customerId);
      }
      const sessionToken = crypto.randomBytes(32).toString('hex');
      stmtCreateSession.run(sessionToken, customerId, subscriptionId, plan);
      return { token: sessionToken, plan, isNew: true };
    });

    const result = upsertSession(session.customer, session.subscription, plan);
    if (result.isNew) {
      console.log('[LeafScan] Premium activated:', { customer: session.customer, plan: result.plan });
    }
    res.json({ token: result.token, plan: result.plan });
  } catch (err) {
    console.error('[LeafScan] verify-session error:', err.message);
    res.status(500).json({ error: 'verification_failed' });
  }
});

// ── Create Stripe products on startup ──
let ensureProductsPromise = null;
async function ensureProducts() {
  if (ensureProductsPromise) return ensureProductsPromise;
  ensureProductsPromise = _ensureProducts().finally(() => { ensureProductsPromise = null; });
  return ensureProductsPromise;
}
async function _ensureProducts() {
  try {
    const products = await stripe.products.list({ limit: 10 });
    let growerProduct = products.data.find(p => p.metadata.plan === 'grower');
    let proProduct = products.data.find(p => p.metadata.plan === 'pro');

    if (!growerProduct) {
      growerProduct = await stripe.products.create({
        name: 'LeafScan Grower',
        description: '10 Diagnosen pro Tag, unbegrenzte Pflanzen, PDF-Export',
        metadata: { plan: 'grower' },
      });
    }
    if (!proProduct) {
      proProduct = await stripe.products.create({
        name: 'LeafScan Pro',
        description: 'Unbegrenzte Diagnosen, PDF-Export, Prioritäts-Analyse',
        metadata: { plan: 'pro' },
      });
    }

    const prices = await stripe.prices.list({ limit: 20, active: true });
    growerPriceId = prices.data.find(p => p.product === growerProduct.id && p.recurring?.interval === 'month')?.id;
    proPriceId = prices.data.find(p => p.product === proProduct.id && p.recurring?.interval === 'month')?.id;

    if (!growerPriceId) {
      const price = await stripe.prices.create({ product: growerProduct.id, unit_amount: 499, currency: 'eur', recurring: { interval: 'month' } });
      growerPriceId = price.id;
    }
    if (!proPriceId) {
      const price = await stripe.prices.create({ product: proProduct.id, unit_amount: 999, currency: 'eur', recurring: { interval: 'month' } });
      proPriceId = price.id;
    }

    productsReady = true;
    console.log('[LeafScan] Stripe products ready:', { growerPriceId, proPriceId });
  } catch (err) {
    console.error('[LeafScan] Failed to setup Stripe products:', err.message);
    setTimeout(ensureProducts, 10000);
  }
}

// ── GET /api/stripe/products ──
app.get('/api/stripe/products', async (req, res) => {
  if (!growerPriceId || !proPriceId) await ensureProducts();
  res.json({
    plans: [
      { id: 'grower', priceId: growerPriceId, name: 'Grower', description: '10 Diagnosen pro Tag, unbegrenzte Pflanzen, PDF-Export', price: '4,99 €', priceAmount: 499, interval: 'month' },
      { id: 'pro', priceId: proPriceId, name: 'Pro', description: 'Unbegrenzte Diagnosen, PDF-Export, Prioritäts-Analyse', price: '9,99 €', priceAmount: 999, interval: 'month' },
    ],
  });
});

// ── POST /api/stripe/checkout — NOW with session_id in success URL ──
app.post('/api/stripe/checkout', rateLimit, async (req, res) => {
  const { priceId, successUrl, cancelUrl } = req.body;
  if (!priceId) return res.status(400).json({ error: 'priceId required' });
  if (!growerPriceId || !proPriceId) await ensureProducts();
  if (priceId !== growerPriceId && priceId !== proPriceId) return res.status(400).json({ error: 'Invalid priceId' });

  // Allow custom redirect URLs for native app deep-links (leafscan:// scheme only)
  const isValidDeepLink = (url) => url && url.startsWith('leafscan://');
  const finalSuccessUrl = isValidDeepLink(successUrl) ? successUrl : `${DOMAIN}/?session_id={CHECKOUT_SESSION_ID}`;
  const finalCancelUrl = isValidDeepLink(cancelUrl) ? cancelUrl : `${DOMAIN}/paywall`;

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: finalSuccessUrl,
      cancel_url: finalCancelUrl,
      locale: 'de',
    });
    res.json({ url: session.url });
  } catch (err) {
    console.error('[LeafScan] Checkout error:', err.message);
    res.status(500).json({ error: 'Checkout konnte nicht erstellt werden.' });
  }
});

// ── POST /api/stripe/portal ──
// Secured: requires valid premium session token — portal is opened for the
// customer linked to that token, not for an arbitrary client-supplied sessionId.
app.post('/api/stripe/portal', rateLimit, async (req, res) => {
  // Authenticate via premium session token
  const authHeader = req.headers['authorization'];
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  const premiumSession = checkPremium(token, req);

  if (!premiumSession || !premiumSession.stripe_customer_id) {
    return res.status(401).json({ error: 'Nicht autorisiert. Bitte melde dich als Premium-Nutzer an.' });
  }

  try {
    // Use the customer ID from our DB (not from client input) to prevent IDOR
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: premiumSession.stripe_customer_id,
      return_url: DOMAIN,
    });
    res.json({ url: portalSession.url });
  } catch (err) {
    console.error('[LeafScan] Portal error:', err.message);
    res.status(500).json({ error: 'Portal konnte nicht geöffnet werden.' });
  }
});

// ── POST /api/stripe/webhook — WITH signature verification ──
// Required events in Stripe Dashboard:
//   checkout.session.completed, customer.subscription.deleted,
//   customer.subscription.updated, invoice.payment_failed
app.post('/api/stripe/webhook', async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!sig) {
    return res.status(400).send('Missing stripe-signature header');
  }

  let event;
  try {
    if (!webhookSecret) {
      console.error('[LeafScan] STRIPE_WEBHOOK_SECRET not set — rejecting webhook');
      return res.status(500).send('Webhook secret not configured');
    }
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err) {
    console.error('[LeafScan] Webhook signature failed:', err.message);
    return res.status(400).send('Webhook Error');
  }

  try {
    switch (event.type) {
      // ── Payment completed → activate premium ──
      case 'checkout.session.completed': {
        const session = event.data.object;
        console.log('[LeafScan] Payment successful:', session.customer);

        // Use transaction to prevent race conditions with verify-session
        const upsertFromWebhook = db.transaction((customerId, subscriptionId) => {
          const existing = stmtFindByCustomer.get(customerId);
          if (existing) return; // Already created by verify-session

          let plan = 'pro';
          // Plan will be determined async below, but create with default first
          const sessionToken = crypto.randomBytes(32).toString('hex');
          stmtCreateSession.run(sessionToken, customerId, subscriptionId, plan);
          return sessionToken;
        });

        const newToken = upsertFromWebhook(session.customer, session.subscription);
        if (newToken) {
          // Determine actual plan and update if needed
          try {
            const lineItems = await stripe.checkout.sessions.listLineItems(session.id);
            if (lineItems.data.length > 0) {
              const priceId = lineItems.data[0].price?.id;
              if (priceId === growerPriceId) {
                stmtUpdatePlan.run('grower', newToken);
              }
            }
          } catch (e) {
            console.log('[LeafScan] Could not determine plan from webhook, using default pro');
          }
          console.log('[LeafScan] Premium session created via webhook for:', session.customer);
        }
        break;
      }

      // ── Subscription cancelled → deactivate immediately ──
      case 'customer.subscription.deleted': {
        const sub = event.data.object;
        console.log('[LeafScan] Subscription cancelled:', sub.customer);
        stmtDeactivateBySubscription.run(sub.id);
        stmtDeactivateByCustomer.run(sub.customer);
        break;
      }

      // ── Subscription status changed → check if still active ──
      case 'customer.subscription.updated': {
        const sub = event.data.object;
        const inactiveStatuses = ['canceled', 'past_due', 'unpaid', 'incomplete_expired'];
        if (inactiveStatuses.includes(sub.status)) {
          console.log('[LeafScan] Subscription deactivated:', sub.customer, sub.status);
          stmtDeactivateBySubscription.run(sub.id);
        }
        // If subscription is reactivated, verify-session handles re-creation
        break;
      }

      // ── Payment failed → warn but don't deactivate yet (Stripe retries) ──
      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        console.log('[LeafScan] Payment failed for:', invoice.customer, 'attempt:', invoice.attempt_count);
        // After 3 failed attempts, Stripe will cancel the subscription
        // which triggers customer.subscription.deleted above
        if (invoice.attempt_count >= 3) {
          console.log('[LeafScan] 3+ failed payments — deactivating:', invoice.customer);
          stmtDeactivateByCustomer.run(invoice.customer);
        }
        break;
      }

      default:
        // Ignore unknown events silently (don't log spam)
        break;
    }
  } catch (err) {
    // Log but don't fail — always return 200 to prevent Stripe retries on our bugs
    console.error('[LeafScan] Webhook processing error:', err.message);
  }

  res.json({ received: true });
});

// ── Feedback (enhanced: saves full diagnosis + images for negative feedback) ──
const stmtInsertDetailedFeedback = db.prepare(`
  INSERT INTO feedback_detailed (rating, diagnosis_json, questionnaire_json, image_paths, ip, device_id)
  VALUES (?, ?, ?, ?, ?, ?)
`);

app.post('/api/feedback', express.json({ limit: '30mb' }), (req, res) => {
  try {
    const { rating, diagnosis, severity, confidence, substrate, fertilizer,
            fullDiagnosis, questionnaire, images } = req.body || {};
    if (!rating || !['positive', 'negative'].includes(rating)) {
      return res.status(400).json({ error: 'rating must be positive or negative' });
    }

    // Legacy feedback table (always)
    stmtInsertFeedback.run(
      rating,
      (diagnosis || '').substring(0, 500),
      (severity || '').substring(0, 20),
      typeof confidence === 'number' ? confidence : null,
      (substrate || '').substring(0, 50),
      (fertilizer || '').substring(0, 100)
    );

    // Detailed feedback with images (for learning)
    if (fullDiagnosis || images) {
      const ip = getClientIP(req);
      const deviceId = req.headers['x-device-id'] || '';
      const ts = Date.now();
      let savedPaths = [];

      // Save images to disk
      if (Array.isArray(images) && images.length > 0) {
        for (let i = 0; i < Math.min(images.length, 5); i++) {
          const img = images[i];
          if (typeof img === 'string' && img.startsWith('data:image/')) {
            const match = img.match(/^data:image\/(\w+);base64,(.+)$/);
            if (match) {
              const ext = match[1] === 'jpeg' ? 'jpg' : match[1];
              const filename = `fb_${ts}_${i}.${ext}`;
              const filepath = path.join(feedbackImagesDir, filename);
              fs.writeFileSync(filepath, Buffer.from(match[2], 'base64'));
              savedPaths.push(filename);
            }
          }
        }
      }

      stmtInsertDetailedFeedback.run(
        rating,
        fullDiagnosis ? JSON.stringify(fullDiagnosis).substring(0, 10000) : null,
        questionnaire ? JSON.stringify(questionnaire).substring(0, 2000) : null,
        savedPaths.length > 0 ? JSON.stringify(savedPaths) : null,
        ip,
        deviceId
      );

      console.log(`[LeafScan] Detailed ${rating} feedback saved: ${savedPaths.length} images, diagnosis: ${(diagnosis || '').substring(0, 50)}`);
    }

    res.json({ ok: true });
  } catch (err) {
    console.error('[LeafScan] Feedback error:', err.message);
    res.status(500).json({ error: 'Failed to save feedback' });
  }
});

app.get('/api/admin/feedback', (req, res) => {
  const key = req.headers['x-leafscan-key'] || req.query.key;
  if (key !== ADMIN_KEY) {
    return res.status(403).json({ error: 'Unauthorized' });
  }
  const limit = Math.min(parseInt(req.query.limit) || 50, 500);
  const stats = stmtFeedbackStats.all();
  const recent = stmtFeedbackRecent.all(limit);
  const total = stats.reduce((sum, s) => sum + s.count, 0);
  const positive = stats.find(s => s.rating === 'positive')?.count || 0;
  const negative = stats.find(s => s.rating === 'negative')?.count || 0;
  res.json({
    summary: { total, positive, negative, satisfaction: total > 0 ? Math.round(positive / total * 100) : 0 },
    recent,
  });
});

// ── Detailed feedback for learning (admin only) ──
const stmtDetailedFeedbackAll = db.prepare(`SELECT * FROM feedback_detailed ORDER BY created_at DESC LIMIT ?`);
const stmtDetailedFeedbackNegative = db.prepare(`SELECT * FROM feedback_detailed WHERE rating = 'negative' ORDER BY created_at DESC LIMIT ?`);

app.get('/api/admin/feedback-detailed', (req, res) => {
  const key = req.headers['x-leafscan-key'] || req.query.key;
  if (key !== ADMIN_KEY) {
    return res.status(403).json({ error: 'Unauthorized' });
  }
  const limit = Math.min(parseInt(req.query.limit) || 50, 500);
  const onlyNegative = req.query.negative === 'true';
  const rows = onlyNegative ? stmtDetailedFeedbackNegative.all(limit) : stmtDetailedFeedbackAll.all(limit);

  // Parse JSON fields
  const entries = rows.map(row => ({
    id: row.id,
    rating: row.rating,
    diagnosis: row.diagnosis_json ? JSON.parse(row.diagnosis_json) : null,
    questionnaire: row.questionnaire_json ? JSON.parse(row.questionnaire_json) : null,
    images: row.image_paths ? JSON.parse(row.image_paths) : [],
    created_at: row.created_at,
  }));

  res.json({ count: entries.length, entries });
});

// Serve feedback images (admin only)
app.get('/api/admin/feedback-image/:filename', (req, res) => {
  const key = req.headers['x-leafscan-key'] || req.query.key;
  if (key !== ADMIN_KEY) {
    return res.status(403).json({ error: 'Unauthorized' });
  }
  const filename = req.params.filename.replace(/[^a-zA-Z0-9._-]/g, '');
  const filepath = path.join(feedbackImagesDir, filename);
  if (fs.existsSync(filepath)) {
    res.sendFile(filepath);
  } else {
    res.status(404).json({ error: 'Image not found' });
  }
});

// ── Health check ──
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// ── Global error handler (prevents stack traces leaking to clients) ──
app.use((err, req, res, next) => {
  console.error('[LeafScan] Unhandled error:', err.message);
  if (res.headersSent) return next(err);
  res.status(500).json({ error: 'Internal server error' });
});

// ── Crash safety ──
process.on('unhandledRejection', (reason) => {
  console.error('[LeafScan] Unhandled promise rejection:', reason);
});

// ── Start ──
app.listen(PORT, () => {
  console.log(`[LeafScan] API server running on port ${PORT}`);
  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    console.warn('[LeafScan] ⚠️  WARNING: STRIPE_WEBHOOK_SECRET is not set!');
    console.warn('[LeafScan] ⚠️  Subscription cancellations will NOT be processed.');
    console.warn('[LeafScan] ⚠️  Set it in .env.server from your Stripe Dashboard → Webhooks.');
  }
  ensureProducts();
});
