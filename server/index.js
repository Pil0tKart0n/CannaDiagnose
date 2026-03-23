const express = require('express');
const Stripe = require('stripe');
const cors = require('cors');
const crypto = require('crypto');
const Database = require('better-sqlite3');
const path = require('path');

// Server-side prompts (never sent to client)
const { SYSTEM_PROMPT, FOLLOWUP_SYSTEM_PROMPT, REFINE_SYSTEM_PROMPT,
        buildUserPrompt, buildFollowUpPrompt, buildRefinePrompt } = require('./prompts');

const IMAGE_CHECK_PROMPT = `Siehst du auf diesem Foto eine Cannabis-Pflanze oder Teile davon (Blatt, Blüte, Stängel, Sämling)? Das Foto kann unter farbigem Growlicht (rosa/lila/gelb) aufgenommen sein — ignoriere ungewöhnliche Farben komplett.
Im Zweifel antworte mit true. Antworte NUR mit false wenn du dir SICHER bist, dass KEINE Pflanze auf dem Foto ist (z.B. Essen, Tiere, Gegenstände, Selfies, Text).
Antworte NUR mit JSON: {"isCannabis": true} oder {"isCannabis": false}`;

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

// Migration: api_usage table for OpenAI token/cost tracking
try {
  db.exec(`
    CREATE TABLE IF NOT EXISTS api_usage (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ip TEXT,
      mode TEXT NOT NULL,
      model TEXT NOT NULL DEFAULT 'gpt-4o',
      prompt_tokens INTEGER NOT NULL DEFAULT 0,
      completion_tokens INTEGER NOT NULL DEFAULT 0,
      total_tokens INTEGER NOT NULL DEFAULT 0,
      is_premium INTEGER NOT NULL DEFAULT 0,
      platform TEXT DEFAULT 'unknown',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_api_usage_date ON api_usage(created_at);
    CREATE INDEX IF NOT EXISTS idx_api_usage_mode ON api_usage(mode);
  `);
} catch (e) {}

// Migration: ip_blacklist table
try {
  db.exec(`
    CREATE TABLE IF NOT EXISTS ip_blacklist (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ip TEXT UNIQUE NOT NULL,
      reason TEXT DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
} catch (e) {}

// Migration: events table for funnel tracking
try {
  db.exec(`
    CREATE TABLE IF NOT EXISTS events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      event TEXT NOT NULL,
      ip TEXT,
      device_id TEXT DEFAULT '',
      platform TEXT DEFAULT 'unknown',
      meta TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_events_event ON events(event);
    CREATE INDEX IF NOT EXISTS idx_events_date ON events(created_at);
    CREATE INDEX IF NOT EXISTS idx_events_ip ON events(ip);
  `);
} catch (e) {}

// Migration: announcements table
try {
  db.exec(`
    CREATE TABLE IF NOT EXISTS announcements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      message TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'info',
      active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
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

// Migration: scan_results table — stores every diagnosis result server-side
try {
  db.exec(`
    CREATE TABLE IF NOT EXISTS scan_results (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      scan_log_id INTEGER,
      ip TEXT,
      mode TEXT NOT NULL DEFAULT 'diagnose',
      diagnosis TEXT,
      severity TEXT,
      confidence REAL,
      substrate TEXT,
      is_premium INTEGER NOT NULL DEFAULT 0,
      platform TEXT DEFAULT 'unknown',
      result_json TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_scan_results_date ON scan_results(created_at);
    CREATE INDEX IF NOT EXISTS idx_scan_results_scan ON scan_results(scan_log_id);
  `);
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
const stmtInsertScanResult = db.prepare(`
  INSERT INTO scan_results (scan_log_id, ip, mode, diagnosis, severity, confidence, substrate, is_premium, platform, result_json)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

// ── API usage tracking statements ──
const stmtInsertUsage = db.prepare(`
  INSERT INTO api_usage (ip, mode, model, prompt_tokens, completion_tokens, total_tokens, is_premium, platform)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`);

const stmtInsertEvent = db.prepare(`INSERT INTO events (event, ip, device_id, platform, meta) VALUES (?, ?, ?, ?, ?)`);

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

// Prepared statement for blacklist check
const stmtCheckBlacklist = db.prepare(`SELECT 1 FROM ip_blacklist WHERE ip = ?`);

function rateLimit(req, res, next) {
  const ip = getClientIP(req);

  // Check blacklist
  if (stmtCheckBlacklist.get(ip)) {
    return res.status(403).json({ error: 'blocked', message: 'Zugriff gesperrt.' });
  }

  const count = (ipRequestCounts.get(ip) || 0) + 1;
  ipRequestCounts.set(ip, count);
  if (count > 30) {
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

  // Image validation removed — gpt-4o rejects cannabis under grow lights too aggressively.
  // The main diagnosis prompt handles non-plant images gracefully on its own.

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
    const { currentDiagnosis, substrate, ph, ec, fertilizer, plantAge, growPhase, soilTemp } = req.body;
    if (!currentDiagnosis) {
      return res.status(400).json({ error: 'invalid_request', message: 'currentDiagnosis required for refine mode' });
    }
    const userPrompt = buildRefinePrompt(currentDiagnosis, substrate, ph, ec, fertilizer, plantAge, growPhase, soilTemp);
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
  } else {
    // Premium users also get a scan_log entry (for dashboard tracking)
    stmtInsertScan.run(ip);
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

    // Track API usage
    if (openaiRes.ok) {
      try {
        const parsed_ = JSON.parse(data);
        const usage = parsed_.usage || {};
        const platform = req.headers['origin'] ? 'pwa' : 'apk';
        stmtInsertUsage.run(
          ip, mode, 'gpt-4o',
          usage.prompt_tokens || 0,
          usage.completion_tokens || 0,
          usage.total_tokens || 0,
          premiumSession ? 1 : 0,
          platform
        );
      } catch (e) {}
    }

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
              // Track texture check usage
              try {
                const tUsage = textureData.usage || {};
                stmtInsertUsage.run(ip, 'texture_check', 'gpt-4o', tUsage.prompt_tokens || 0, tUsage.completion_tokens || 0, tUsage.total_tokens || 0, premiumSession ? 1 : 0, req.headers['origin'] ? 'pwa' : 'apk');
              } catch (e) {}
              const textureContent = JSON.parse(textureData.choices[0].message.content);

              if (textureContent.hasTextureIssues) {
                console.log('[LeafScan] Texture issues found:', textureContent.description);
                content.severity = 'mittel';
                content.confidence = 0.60;
                content.primaryDiagnosis = textureContent.description + ' Für eine genauere Diagnose verfeinere das Ergebnis mit deinen pH- und EC-Werten.';
                content.rootCauseAnalysis = '';
                content.contributingFactors = [
                  { factor: 'Frühe Anzeichen', impact: 'Noch kein akutes Problem, aber die Pflanze zeigt erste Auffälligkeiten.' },
                ];
                content.actionPlan = [
                  { priority: 1, action: 'pH-Wert prüfen', details: 'Miss den pH deiner Nährlösung und des Ablaufwassers. Für Kokos: 5.8–6.2, für Erde: 6.0–6.5.' },
                  { priority: 2, action: 'Pflanze beobachten', details: 'Mach in 3–5 Tagen ein neues Foto und vergleiche ob sich die Symptome verstärkt haben.' },
                  { priority: 2, action: 'Nährstoffversorgung checken', details: 'Stelle sicher, dass dein Dünger korrekt dosiert ist und CalMag enthalten ist.' },
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

    // Save scan result to database for dashboard
    if (openaiRes.ok && mode === 'diagnose') {
      try {
        const parsed = JSON.parse(data);
        const content = JSON.parse(parsed.choices[0].message.content);
        const lastScan = db.prepare(`SELECT id FROM scan_log WHERE ip = ? ORDER BY id DESC LIMIT 1`).get(ip);
        const platform = req.headers['origin'] ? 'pwa' : 'apk';
        stmtInsertScanResult.run(
          lastScan ? lastScan.id : null,
          ip,
          mode,
          (content.primaryDiagnosis || '').substring(0, 500),
          content.severity || null,
          typeof content.confidence === 'number' ? content.confidence : null,
          ((req.body.questionnaire && req.body.questionnaire.substrate) || '').substring(0, 50),
          premiumSession ? 1 : 0,
          platform,
          JSON.stringify(content).substring(0, 10000)
        );
      } catch (e) {
        console.log('[LeafScan] Scan result save skipped:', e.message);
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
// ██  /api/validate — ALWAYS RETURNS TRUE (validation moved to /api/scan) ██
// ══════════════════════════════════════════════════════════════════
app.post('/api/validate', (req, res) => {
  // Always return true — real validation happens server-side in /api/scan now.
  // This endpoint exists only for backward compatibility with cached PWA clients.
  res.json({
    choices: [{ message: { content: '{"isCannabis": true}' } }],
  });
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

app.post('/api/feedback', rateLimit, express.json({ limit: '30mb' }), (req, res) => {
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

// ── Event tracking (for funnel analytics) ──
app.post('/api/event', rateLimit, (req, res) => {
  const { event, meta } = req.body || {};
  if (!event || typeof event !== 'string' || event.length > 50) {
    return res.status(400).json({ error: 'invalid event' });
  }
  const ip = getClientIP(req);
  const deviceId = req.headers['x-device-id'] || '';
  const platform = req.headers['origin'] ? 'pwa' : 'apk';
  try {
    stmtInsertEvent.run(event, ip, deviceId, platform, meta ? JSON.stringify(meta).substring(0, 500) : null);
  } catch (e) {}
  res.json({ ok: true });
});

// ── Active announcement (public) ──
app.get('/api/announcement', (req, res) => {
  const row = db.prepare(`SELECT id, message, type FROM announcements WHERE active = 1 ORDER BY id DESC LIMIT 1`).get();
  res.json(row || null);
});

// ══════════════════════════════════════════════════════════════════
// ██  ADMIN DASHBOARD API                                        ██
// ══════════════════════════════════════════════════════════════════

function adminAuth(req, res) {
  const key = req.headers['x-leafscan-key'] || req.query.key;
  if (key !== ADMIN_KEY) {
    res.status(403).json({ error: 'Unauthorized' });
    return false;
  }
  return true;
}

// ── Dashboard overview ──
app.get('/api/admin/dashboard', (req, res) => {
  if (!adminAuth(req, res)) return;

  const scansToday = db.prepare(`SELECT COUNT(*) as c FROM scan_log WHERE scanned_at >= date('now')`).get().c;
  const scansWeek = db.prepare(`SELECT COUNT(*) as c FROM scan_log WHERE scanned_at >= date('now', '-7 days')`).get().c;
  const scansTotal = db.prepare(`SELECT COUNT(*) as c FROM scan_log`).get().c;

  const uniqueToday = db.prepare(`SELECT COUNT(DISTINCT ip) as c FROM scan_log WHERE scanned_at >= date('now')`).get().c;
  const uniqueTotal = db.prepare(`SELECT COUNT(DISTINCT ip) as c FROM scan_log`).get().c;

  const feedbackStats = stmtFeedbackStats.all();
  const totalFeedback = feedbackStats.reduce((sum, s) => sum + s.count, 0);
  const positiveFeedback = feedbackStats.find(s => s.rating === 'positive')?.count || 0;
  const negativeFeedback = feedbackStats.find(s => s.rating === 'negative')?.count || 0;

  const activePremium = db.prepare(`SELECT COUNT(*) as c FROM premium_sessions WHERE active = 1`).get().c;
  const activePromos = db.prepare(`SELECT COUNT(*) as c FROM promo_redemptions WHERE expires_at > datetime('now')`).get().c;

  // Token usage today (split by input/output for accurate cost calculation)
  const usageToday = db.prepare(`SELECT COALESCE(SUM(total_tokens), 0) as t, COALESCE(SUM(prompt_tokens), 0) as inp, COALESCE(SUM(completion_tokens), 0) as out FROM api_usage WHERE created_at >= date('now')`).get();
  const usageMonth = db.prepare(`SELECT COALESCE(SUM(total_tokens), 0) as t, COALESCE(SUM(prompt_tokens), 0) as inp, COALESCE(SUM(completion_tokens), 0) as out FROM api_usage WHERE created_at >= date('now', '-30 days')`).get();
  const tokensToday = usageToday.t;
  const tokensMonth = usageMonth.t;

  // Accurate cost calculation: GPT-4o pricing $2.50/1M input, $10.00/1M output
  const costToday = (usageToday.inp / 1000000 * 2.50 + usageToday.out / 1000000 * 10.00).toFixed(2);
  const costMonth = (usageMonth.inp / 1000000 * 2.50 + usageMonth.out / 1000000 * 10.00).toFixed(2);

  // Average cost per scan (diagnose calls only, last 30 days)
  const avgScan = db.prepare(`SELECT COALESCE(AVG(prompt_tokens), 0) as inp, COALESCE(AVG(completion_tokens), 0) as out FROM api_usage WHERE mode = 'diagnose' AND created_at >= date('now', '-30 days')`).get();
  const avgCostPerScan = (avgScan.inp / 1000000 * 2.50 + avgScan.out / 1000000 * 10.00).toFixed(4);

  res.json({
    scans: { today: scansToday, week: scansWeek, total: scansTotal },
    users: { today: uniqueToday, total: uniqueTotal },
    feedback: { total: totalFeedback, positive: positiveFeedback, negative: negativeFeedback, satisfaction: totalFeedback > 0 ? Math.round(positiveFeedback / totalFeedback * 100) : 0 },
    premium: { active: activePremium, promos: activePromos },
    tokens: { today: tokensToday, month: tokensMonth, costToday, costMonth, avgCostPerScan },
  });
});

// ── Scan statistics over time ──
app.get('/api/admin/stats/scans', (req, res) => {
  if (!adminAuth(req, res)) return;
  const days = Math.min(parseInt(req.query.days) || 30, 90);
  const rows = db.prepare(`
    SELECT date(scanned_at) as day, COUNT(*) as scans, COUNT(DISTINCT ip) as users
    FROM scan_log
    WHERE scanned_at >= date('now', '-' || ? || ' days')
    GROUP BY date(scanned_at)
    ORDER BY day
  `).all(days);
  res.json({ days, data: rows });
});

// ── Top diagnoses (from scan_results, with optional feedback rating) ──
app.get('/api/admin/stats/diagnoses', (req, res) => {
  if (!adminAuth(req, res)) return;
  const rows = db.prepare(`
    SELECT sr.diagnosis, COUNT(*) as count,
           ROUND(AVG(sr.confidence), 2) as avg_confidence,
           SUM(CASE WHEN f.rating = 'positive' THEN 1 ELSE 0 END) as positive,
           SUM(CASE WHEN f.rating = 'negative' THEN 1 ELSE 0 END) as negative
    FROM scan_results sr
    LEFT JOIN scan_log sl ON sl.id = sr.scan_log_id
    LEFT JOIN feedback f ON f.created_at BETWEEN datetime(sl.scanned_at, '-5 minutes') AND datetime(sl.scanned_at, '+5 minutes')
    WHERE sr.diagnosis IS NOT NULL AND sr.diagnosis != ''
    GROUP BY sr.diagnosis
    ORDER BY count DESC
    LIMIT 20
  `).all();
  res.json(rows);
});

// ── Substrate & fertilizer distribution ──
app.get('/api/admin/stats/substrates', (req, res) => {
  if (!adminAuth(req, res)) return;
  const substrates = db.prepare(`
    SELECT substrate, COUNT(*) as count FROM scan_results
    WHERE substrate IS NOT NULL AND substrate != ''
    GROUP BY substrate ORDER BY count DESC
  `).all();
  const fertilizers = db.prepare(`
    SELECT fertilizer, COUNT(*) as count FROM feedback
    WHERE fertilizer IS NOT NULL AND fertilizer != ''
    GROUP BY fertilizer ORDER BY count DESC LIMIT 20
  `).all();
  res.json({ substrates, fertilizers });
});

// ── Platform split (PWA vs APK) ──
app.get('/api/admin/stats/platforms', (req, res) => {
  if (!adminAuth(req, res)) return;
  const rows = db.prepare(`
    SELECT platform, COUNT(*) as count, SUM(total_tokens) as tokens
    FROM api_usage
    WHERE created_at >= date('now', '-30 days')
    GROUP BY platform
  `).all();
  res.json(rows);
});

// ── Hourly distribution (when do users scan?) ──
app.get('/api/admin/stats/hours', (req, res) => {
  if (!adminAuth(req, res)) return;
  const rows = db.prepare(`
    SELECT CAST(strftime('%H', created_at) AS INTEGER) as hour, COUNT(*) as count
    FROM api_usage
    WHERE created_at >= date('now', '-30 days')
    GROUP BY hour ORDER BY hour
  `).all();
  res.json(rows);
});

// ── Token usage over time ──
app.get('/api/admin/stats/tokens', (req, res) => {
  if (!adminAuth(req, res)) return;
  const days = Math.min(parseInt(req.query.days) || 30, 90);
  const rows = db.prepare(`
    SELECT date(created_at) as day,
           SUM(prompt_tokens) as prompt_tokens,
           SUM(completion_tokens) as completion_tokens,
           SUM(total_tokens) as total_tokens,
           COUNT(*) as requests
    FROM api_usage
    WHERE created_at >= date('now', '-' || ? || ' days')
    GROUP BY date(created_at)
    ORDER BY day
  `).all(days);
  res.json({ days, data: rows });
});

// ── Promo code management ──
app.get('/api/admin/promos', (req, res) => {
  if (!adminAuth(req, res)) return;
  const codes = db.prepare(`SELECT * FROM promo_codes ORDER BY created_at DESC`).all();
  const redemptions = db.prepare(`
    SELECT pr.*, pc.days as code_days
    FROM promo_redemptions pr
    LEFT JOIN promo_codes pc ON pr.code = pc.code
    ORDER BY pr.redeemed_at DESC LIMIT 100
  `).all();
  res.json({ codes, redemptions });
});

app.post('/api/admin/promos', express.json(), (req, res) => {
  if (!adminAuth(req, res)) return;
  const { code, days, maxUses, description } = req.body || {};
  if (!code || !days) {
    return res.status(400).json({ error: 'code and days required' });
  }
  const cleanCode = code.trim().toUpperCase();
  try {
    db.prepare(`INSERT INTO promo_codes (code, days, max_uses) VALUES (?, ?, ?)`).run(cleanCode, days, maxUses || 9999);
    res.json({ success: true, code: cleanCode });
  } catch (err) {
    res.status(409).json({ error: 'Code already exists' });
  }
});

app.post('/api/admin/promos/toggle', express.json(), (req, res) => {
  if (!adminAuth(req, res)) return;
  const { code, active } = req.body || {};
  if (!code) return res.status(400).json({ error: 'code required' });
  db.prepare(`UPDATE promo_codes SET active = ? WHERE code = ?`).run(active ? 1 : 0, code);
  res.json({ success: true });
});

// ── Premium sessions overview ──
app.get('/api/admin/premium', (req, res) => {
  if (!adminAuth(req, res)) return;
  const active = db.prepare(`SELECT id, plan, stripe_customer_id, created_at FROM premium_sessions WHERE active = 1 ORDER BY created_at DESC`).all();
  const cancelled = db.prepare(`SELECT id, plan, stripe_customer_id, created_at FROM premium_sessions WHERE active = 0 ORDER BY created_at DESC LIMIT 50`).all();
  res.json({ active, cancelled });
});

// ── Manually grant premium (for testers/influencers) ──
app.post('/api/admin/premium/grant', express.json(), (req, res) => {
  if (!adminAuth(req, res)) return;
  const { days, note } = req.body || {};
  if (!days) return res.status(400).json({ error: 'days required' });

  // Create a promo code for manual grant
  const code = 'ADMIN-' + crypto.randomBytes(4).toString('hex').toUpperCase();
  db.prepare(`INSERT INTO promo_codes (code, days, max_uses) VALUES (?, ?, 1)`).run(code, days);
  res.json({ success: true, code, days, note: `Give this code to the user: ${code}` });
});

// ── IP Blacklist management ──
app.get('/api/admin/blacklist', (req, res) => {
  if (!adminAuth(req, res)) return;
  const list = db.prepare(`SELECT * FROM ip_blacklist ORDER BY created_at DESC`).all();
  res.json(list);
});

app.post('/api/admin/blacklist', express.json(), (req, res) => {
  if (!adminAuth(req, res)) return;
  const { ip, reason } = req.body || {};
  if (!ip) return res.status(400).json({ error: 'ip required' });
  try {
    db.prepare(`INSERT OR IGNORE INTO ip_blacklist (ip, reason) VALUES (?, ?)`).run(ip, reason || '');
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/admin/blacklist', express.json(), (req, res) => {
  if (!adminAuth(req, res)) return;
  const { ip } = req.body || {};
  if (!ip) return res.status(400).json({ error: 'ip required' });
  db.prepare(`DELETE FROM ip_blacklist WHERE ip = ?`).run(ip);
  res.json({ success: true });
});

// ── Rate limit hits tracking ──
app.get('/api/admin/stats/ratelimits', (req, res) => {
  if (!adminAuth(req, res)) return;
  // Return current in-memory rate limit state
  const entries = [];
  for (const [ip, count] of ipRequestCounts.entries()) {
    if (count > 5) entries.push({ ip, requests: count });
  }
  entries.sort((a, b) => b.requests - a.requests);
  res.json(entries);
});

// ── Disk usage (feedback images) ──
app.get('/api/admin/stats/disk', (req, res) => {
  if (!adminAuth(req, res)) return;
  try {
    const files = fs.readdirSync(feedbackImagesDir);
    let totalSize = 0;
    for (const f of files) {
      try {
        totalSize += fs.statSync(path.join(feedbackImagesDir, f)).size;
      } catch (e) {}
    }
    const dbSize = fs.statSync(dbPath).size;
    res.json({
      feedbackImages: { count: files.length, sizeBytes: totalSize, sizeMB: (totalSize / 1048576).toFixed(2) },
      database: { sizeBytes: dbSize, sizeMB: (dbSize / 1048576).toFixed(2) },
    });
  } catch (err) {
    res.json({ feedbackImages: { count: 0, sizeBytes: 0, sizeMB: '0' }, database: { sizeBytes: 0, sizeMB: '0' } });
  }
});

// ── Serve admin dashboard ──
app.get('/api/admin/board', (req, res) => {
  const key = req.headers['x-leafscan-key'] || req.query.key;
  if (key !== ADMIN_KEY) {
    return res.status(403).send('Unauthorized');
  }
  res.sendFile(path.join(__dirname, 'admin.html'));
});

// ── Funnel tracking ──
app.get('/api/admin/stats/funnel', (req, res) => {
  if (!adminAuth(req, res)) return;
  const days = Math.min(parseInt(req.query.days) || 7, 90);

  const events = db.prepare(`
    SELECT event, COUNT(*) as count, COUNT(DISTINCT ip) as unique_users
    FROM events
    WHERE created_at >= date('now', '-' || ? || ' days')
    GROUP BY event
    ORDER BY count DESC
  `).all(days);

  // Build funnel: page_home -> camera_open -> scan_start -> scan_complete -> feedback -> paywall_view -> purchase
  const funnelOrder = ['page_home', 'camera_open', 'scan_start', 'scan_complete', 'feedback_given', 'paywall_view', 'purchase_complete'];
  const funnel = funnelOrder.map(step => {
    const found = events.find(e => e.event === step);
    return { step, count: found?.count || 0, unique: found?.unique_users || 0 };
  });

  res.json({ days, funnel, allEvents: events });
});

// ── Retention (returning users) ──
app.get('/api/admin/stats/retention', (req, res) => {
  if (!adminAuth(req, res)) return;

  // Users who scanned on more than one distinct day
  const returning = db.prepare(`
    SELECT ip, COUNT(DISTINCT date(scanned_at)) as days_active,
           MIN(scanned_at) as first_scan, MAX(scanned_at) as last_scan
    FROM scan_log
    GROUP BY ip
    HAVING days_active > 1
    ORDER BY days_active DESC
    LIMIT 50
  `).all();

  // Weekly cohorts: for each week, how many unique users scanned
  const weekly = db.prepare(`
    SELECT strftime('%Y-W%W', scanned_at) as week,
           COUNT(DISTINCT ip) as users, COUNT(*) as scans
    FROM scan_log
    WHERE scanned_at >= date('now', '-90 days')
    GROUP BY week ORDER BY week
  `).all();

  // Total unique users and returning ratio
  const totalUnique = db.prepare(`SELECT COUNT(DISTINCT ip) as c FROM scan_log`).get()?.c || 0;
  const returningCount = returning.length;

  res.json({ totalUnique, returningCount, returningRate: totalUnique > 0 ? Math.round(returningCount / totalUnique * 100) : 0, returning, weekly });
});

// ── Diagnosis trends (seasonal/monthly) ──
app.get('/api/admin/stats/diagnosis-trends', (req, res) => {
  if (!adminAuth(req, res)) return;

  const rows = db.prepare(`
    SELECT strftime('%Y-%m', created_at) as month, diagnosis, COUNT(*) as count
    FROM feedback
    WHERE diagnosis IS NOT NULL AND diagnosis != '' AND created_at >= date('now', '-12 months')
    GROUP BY month, diagnosis
    ORDER BY month, count DESC
  `).all();

  res.json(rows);
});

// ── Confidence tracking ──
app.get('/api/admin/stats/confidence', (req, res) => {
  if (!adminAuth(req, res)) return;
  const days = Math.min(parseInt(req.query.days) || 30, 90);

  const rows = db.prepare(`
    SELECT date(created_at) as day,
           ROUND(AVG(confidence), 3) as avg_confidence,
           MIN(confidence) as min_confidence,
           MAX(confidence) as max_confidence,
           COUNT(*) as count
    FROM feedback
    WHERE confidence IS NOT NULL AND created_at >= date('now', '-' || ? || ' days')
    GROUP BY day ORDER BY day
  `).all(days);

  res.json({ days, data: rows });
});

// ── Live feed (recent scans) ──
app.get('/api/admin/stats/livefeed', (req, res) => {
  if (!adminAuth(req, res)) return;
  const limit = Math.min(parseInt(req.query.limit) || 20, 100);

  // Combine scan_log with scan_results for recent activity
  const scans = db.prepare(`
    SELECT sl.ip, sl.scanned_at,
           sr.diagnosis, sr.severity, sr.confidence, sr.substrate,
           sr.mode, sr.platform, sr.is_premium,
           au.total_tokens
    FROM scan_log sl
    LEFT JOIN scan_results sr ON sr.scan_log_id = sl.id
       OR (sr.scan_log_id IS NULL AND sr.ip = sl.ip AND sr.created_at BETWEEN datetime(sl.scanned_at, '-1 minutes') AND datetime(sl.scanned_at, '+1 minutes'))
    LEFT JOIN api_usage au ON au.created_at BETWEEN datetime(sl.scanned_at, '-1 minutes') AND datetime(sl.scanned_at, '+1 minutes') AND au.ip = sl.ip
    ORDER BY sl.scanned_at DESC
    LIMIT ?
  `).all(limit);

  // Match feedback ratings in JS (avoids SQLite correlated subquery issue)
  if (scans.length > 0) {
    const feedbacks = db.prepare(`SELECT rating, diagnosis, created_at FROM feedback ORDER BY created_at DESC LIMIT 200`).all();
    for (const scan of scans) {
      scan.rating = null;
      if (!scan.diagnosis) continue;
      const scanPrefix = scan.diagnosis.substring(0, 100);
      const scanTime = new Date(scan.scanned_at.replace(' ', 'T') + 'Z').getTime();
      for (const fb of feedbacks) {
        if (!fb.diagnosis || !fb.diagnosis.startsWith(scanPrefix)) continue;
        const fbTime = new Date(fb.created_at.replace(' ', 'T') + 'Z').getTime();
        const diff = fbTime - scanTime;
        if (diff >= -120000 && diff <= 600000) { // -2min to +10min
          scan.rating = fb.rating;
          break;
        }
      }
    }
  }

  res.json(scans);
});

// ── Recheck diagnosis (re-run with current prompt) ──
app.post('/api/admin/recheck', express.json({ limit: '30mb' }), async (req, res) => {
  if (!adminAuth(req, res)) return;
  const { feedbackId } = req.body || {};
  if (!feedbackId) return res.status(400).json({ error: 'feedbackId required' });

  // Get the original feedback entry
  const entry = db.prepare(`SELECT * FROM feedback_detailed WHERE id = ?`).get(feedbackId);
  if (!entry) return res.status(404).json({ error: 'Feedback entry not found' });

  const diagnosis = entry.diagnosis_json ? JSON.parse(entry.diagnosis_json) : null;
  const questionnaire = entry.questionnaire_json ? JSON.parse(entry.questionnaire_json) : null;
  const imagePaths = entry.image_paths ? JSON.parse(entry.image_paths) : [];

  if (imagePaths.length === 0) {
    return res.status(400).json({ error: 'No images stored for this feedback entry' });
  }

  // Read images from disk and convert to base64 data URIs
  const images = [];
  for (const filename of imagePaths) {
    const cleanName = filename.replace(/[^a-zA-Z0-9._-]/g, '');
    const filepath = path.join(feedbackImagesDir, cleanName);
    if (fs.existsSync(filepath)) {
      const data = fs.readFileSync(filepath);
      const ext = cleanName.split('.').pop() || 'jpg';
      const mimeType = ext === 'png' ? 'image/png' : 'image/jpeg';
      images.push(`data:${mimeType};base64,${data.toString('base64')}`);
    }
  }

  if (images.length === 0) {
    return res.status(400).json({ error: 'Could not read stored images' });
  }

  // Re-run diagnosis with current prompt
  const imageBlocks = images.map(url => ({ type: 'image_url', image_url: { url } }));
  const userPrompt = questionnaire ? buildUserPrompt(questionnaire) : 'Analysiere diese Cannabis-Pflanze auf Mangelerscheinungen.';

  try {
    const openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: [...imageBlocks, { type: 'text', text: userPrompt }] },
        ],
        model: 'gpt-4o',
        max_tokens: 2048,
        temperature: 0,
        response_format: { type: 'json_object' },
      }),
    });

    const data = await openaiRes.json();
    const newDiagnosis = data.choices?.[0]?.message?.content ? JSON.parse(data.choices[0].message.content) : null;

    res.json({
      feedbackId,
      originalDiagnosis: diagnosis,
      newDiagnosis,
      originalRating: entry.rating,
      questionnaire,
      images: imagePaths,
    });
  } catch (err) {
    res.status(500).json({ error: 'Recheck failed: ' + err.message });
  }
});

// ── Announcements management ──
app.get('/api/admin/announcements', (req, res) => {
  if (!adminAuth(req, res)) return;
  const rows = db.prepare(`SELECT * FROM announcements ORDER BY id DESC LIMIT 50`).all();
  res.json(rows);
});

app.post('/api/admin/announcements', express.json(), (req, res) => {
  if (!adminAuth(req, res)) return;
  const { message, type } = req.body || {};
  if (!message) return res.status(400).json({ error: 'message required' });
  const result = db.prepare(`INSERT INTO announcements (message, type) VALUES (?, ?)`).run(message, type || 'info');
  res.json({ success: true, id: result.lastInsertRowid });
});

app.post('/api/admin/announcements/toggle', express.json(), (req, res) => {
  if (!adminAuth(req, res)) return;
  const { id, active } = req.body || {};
  if (!id) return res.status(400).json({ error: 'id required' });
  db.prepare(`UPDATE announcements SET active = ? WHERE id = ?`).run(active ? 1 : 0, id);
  res.json({ success: true });
});

app.delete('/api/admin/announcements', express.json(), (req, res) => {
  if (!adminAuth(req, res)) return;
  const { id } = req.body || {};
  if (!id) return res.status(400).json({ error: 'id required' });
  db.prepare(`DELETE FROM announcements WHERE id = ?`).run(id);
  res.json({ success: true });
});

// ── Stripe Revenue stats ──
app.get('/api/admin/stats/revenue', async (req, res) => {
  if (!adminAuth(req, res)) return;

  try {
    // Get recent charges from Stripe
    const now = Math.floor(Date.now() / 1000);
    const thirtyDaysAgo = now - 30 * 24 * 60 * 60;
    const sevenDaysAgo = now - 7 * 24 * 60 * 60;
    const todayStart = new Date(); todayStart.setHours(0,0,0,0);
    const todayTimestamp = Math.floor(todayStart.getTime() / 1000);

    // Active subscriptions
    const subs = await stripe.subscriptions.list({ status: 'active', limit: 100 });
    const mrr = subs.data.reduce((sum, s) => sum + (s.items.data[0]?.price?.unit_amount || 0), 0);

    // Recent charges
    const charges = await stripe.charges.list({ created: { gte: thirtyDaysAgo }, limit: 100 });
    const revenueMonth = charges.data.filter(c => c.paid && !c.refunded).reduce((sum, c) => sum + c.amount, 0);
    const revenueWeek = charges.data.filter(c => c.paid && !c.refunded && c.created >= sevenDaysAgo).reduce((sum, c) => sum + c.amount, 0);
    const revenueToday = charges.data.filter(c => c.paid && !c.refunded && c.created >= todayTimestamp).reduce((sum, c) => sum + c.amount, 0);

    // Cancelled recently
    const cancelledSubs = await stripe.subscriptions.list({ status: 'canceled', limit: 20 });
    const recentCancellations = cancelledSubs.data.filter(s => s.canceled_at >= thirtyDaysAgo).length;

    // Conversion: paywall views vs purchases (from events table)
    const paywallViews = db.prepare(`SELECT COUNT(*) as c FROM events WHERE event = 'paywall_view' AND created_at >= date('now', '-30 days')`).get()?.c || 0;
    const purchases = db.prepare(`SELECT COUNT(*) as c FROM events WHERE event = 'purchase_complete' AND created_at >= date('now', '-30 days')`).get()?.c || 0;

    res.json({
      mrr: mrr, // in cents
      revenueToday, // in cents
      revenueWeek,
      revenueMonth,
      activeSubscriptions: subs.data.length,
      recentCancellations,
      churnRate: subs.data.length > 0 ? Math.round(recentCancellations / (subs.data.length + recentCancellations) * 100) : 0,
      conversion: { paywallViews, purchases, rate: paywallViews > 0 ? Math.round(purchases / paywallViews * 100) : 0 },
    });
  } catch (err) {
    // If Stripe fails, return partial data
    res.json({
      mrr: 0, revenueToday: 0, revenueWeek: 0, revenueMonth: 0,
      activeSubscriptions: 0, recentCancellations: 0, churnRate: 0,
      conversion: { paywallViews: 0, purchases: 0, rate: 0 },
      error: 'Stripe data unavailable: ' + err.message,
    });
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
