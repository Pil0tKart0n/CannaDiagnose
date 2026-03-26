const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');

// Database module (schema, migrations, prepared statements)
const {
  db, feedbackImagesDir, scanImagesDir,
  stmtCountScans, stmtInsertScan, stmtAtomicScan, stmtRefundScan,
  stmtFindSession, stmtCreateSession, stmtFindByCustomer,
  stmtDeactivateBySubscription, stmtDeactivateByCustomer,
  stmtInsertFeedback, stmtFeedbackStats, stmtFeedbackRecent, stmtInsertDetailedFeedback,
  stmtFindPromo, stmtIncrementPromo, stmtCheckRedeemedByIp,
  stmtCheckRedeemedByDevice, stmtRedeemPromo, stmtActivePromo,
  stmtInsertScanResult, stmtInsertUsage, stmtInsertEvent, stmtCheckBlacklist,
} = require('./db');

// Server-side prompts (never sent to client)
const { SYSTEM_PROMPT, FOLLOWUP_SYSTEM_PROMPT, REFINE_SYSTEM_PROMPT,
        buildUserPrompt, buildFollowUpPrompt, buildRefinePrompt } = require('./prompts');

// Route modules
const { router: adminRouter, setIpRequestCounts, setStripe: setAdminStripe } = require('./routes/admin');
const { router: stripeRouter, stripe, ensureProducts, getGrowerPriceId, setRateLimit, setCheckPremium } = require('./routes/stripe');

const IMAGE_CHECK_PROMPT = `Siehst du auf diesem Foto eine Cannabis-Pflanze oder Teile davon (Blatt, Bl\u00fcte, St\u00e4ngel, S\u00e4mling)? Das Foto kann unter farbigem Growlicht (rosa/lila/gelb) aufgenommen sein \u2014 ignoriere ungew\u00f6hnliche Farben komplett.
Im Zweifel antworte mit true. Antworte NUR mit false wenn du dir SICHER bist, dass KEINE Pflanze auf dem Foto ist (z.B. Essen, Tiere, Gegenst\u00e4nde, Selfies, Text).
Antworte NUR mit JSON: {"isCannabis": true} oder {"isCannabis": false}`;

const VERIFY_PROMPT = `Du bist ein Cannabis-Diagnose-Verifikator. Du bekommst:
1. Das Foto des Users (erstes Bild)
2. Best\u00e4tigte Referenzbilder einer bestimmten Mangelerscheinung (weitere Bilder)
3. Die vorgeschlagene Diagnose

Deine Aufgabe: Vergleiche das User-Foto mit den Referenzbildern.

Antworte NUR mit JSON:
{
  "verified": true/false,
  "confidence": 0.0-1.0,
  "reasoning": "Kurze Begr\u00fcndung warum das User-Foto den Referenzbildern entspricht oder nicht",
  "alternative": "Falls nicht verifiziert: welche Diagnose passt besser? Sonst null"
}`;

const app = express();
const PORT = 4000;

const DOMAIN = process.env.DOMAIN || 'https://leafscan.de';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const ALLOWED_MODELS = new Set(['gpt-4o', 'gpt-4o-mini']);
const FREE_SCANS_PER_DAY = 1;

// ── Database is initialized in ./db.js ──

// Schema, migrations, seeds, cleanup — all handled by ./db.js

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

// ── Wire shared state into route modules ──
setIpRequestCounts(ipRequestCounts);
setAdminStripe(stripe);
setRateLimit(rateLimit);
setCheckPremium(checkPremium);

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
        userPrompt += '\n\n\ud83d\udcf8 MULTI-FOTO-ANALYSE (' + images.length + ' Fotos): Vergleiche ALLE Fotos miteinander! Pr\u00fcfe ob die Symptome auf allen Fotos KONSISTENT sind (= systematisches Problem) oder ob verschiedene Fotos UNTERSCHIEDLICHE Symptome zeigen. Wenn die Fotos verschiedene Pflanzenbereiche zeigen (oben vs. unten), nutze das f\u00fcr die Mobilit\u00e4ts-Analyse (mobil vs. immobil). Nenne in der rootCauseAnalysis, was du auf den verschiedenen Fotos siehst.';
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
          { type: 'text', text: `Vorgeschlagene Diagnose: "${diagnosis}". Bild 1 = User-Foto. Bilder 2-${refCount + 1} = best\u00e4tigte Referenzbilder. Stimmt die Diagnose?` },
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
        message: 'Tageslimit erreicht. Upgrade auf Premium f\u00fcr unbegrenzte Scans.',
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
      } catch (e) { console.error('[LeafScan] Token usage insert failed:', e.message); }
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
            console.log('[LeafScan] Healthy diagnosis detected \u2014 running texture safety check...');
            const texturePrompt = `Du bist ein Cannabis-Grow-Experte. Ignoriere KOMPLETT alle Farben \u2014 das Foto ist unter Growlicht aufgenommen.

Analysiere NUR die PHYSISCHE TEXTUR und FORM der Bl\u00e4tter:
1. Sind die Blattoberfl\u00e4chen glatt und flach? Oder gibt es Wellen, Buckel, Blasen?
2. Treten die Blattadern hervor? Sinkt das Gewebe zwischen den Adern ein?
3. Sind die Blattr\u00e4nder glatt oder nach oben/unten gebogen?
4. Gibt es Kr\u00e4uselung oder "Taco"-Bl\u00e4tter?

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
                  { role: 'user', content: [...imageBlocks, { type: 'text', text: 'Pr\u00fcfe die Blattoberfl\u00e4chen auf diesen Fotos. NUR Textur und Form, keine Farben.' }] },
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
                content.primaryDiagnosis = textureContent.description + ' F\u00fcr eine genauere Diagnose verfeinere das Ergebnis mit deinen pH- und EC-Werten.';
                content.rootCauseAnalysis = '';
                content.contributingFactors = [
                  { factor: 'Fr\u00fche Anzeichen', impact: 'Noch kein akutes Problem, aber die Pflanze zeigt erste Auff\u00e4lligkeiten.' },
                ];
                content.actionPlan = [
                  { priority: 1, action: 'pH-Wert pr\u00fcfen', details: 'Miss den pH deiner N\u00e4hrl\u00f6sung und des Ablaufwassers. F\u00fcr Kokos: 5.8\u20136.2, f\u00fcr Erde: 6.0\u20136.5.' },
                  { priority: 2, action: 'Pflanze beobachten', details: 'Mach in 3\u20135 Tagen ein neues Foto und vergleiche ob sich die Symptome verst\u00e4rkt haben.' },
                  { priority: 2, action: 'N\u00e4hrstoffversorgung checken', details: 'Stelle sicher, dass dein D\u00fcnger korrekt dosiert ist und CalMag enthalten ist.' },
                ];
                content.followUpDays = 5;
                content.preventiveTips = [
                  'Fotos unter wei\u00dfem Licht erm\u00f6glichen eine genauere Diagnose.',
                  'Regelm\u00e4\u00dfig pH und EC messen hilft, Probleme fr\u00fch zu erkennen.',
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

        // Save first image to disk for dashboard preview
        let savedImagePaths = [];
        try {
          if (Array.isArray(images) && images.length > 0) {
            const ts = Date.now();
            const img = images[0]; // save only first image
            if (typeof img === 'string' && img.startsWith('data:image/')) {
              const match = img.match(/^data:image\/(\w+);base64,(.+)$/);
              if (match) {
                const ext = match[1] === 'jpeg' ? 'jpg' : match[1];
                const filename = `scan_${ts}_0.${ext}`;
                const filepath = path.join(scanImagesDir, filename);
                fs.writeFileSync(filepath, Buffer.from(match[2], 'base64'));
                savedImagePaths.push(filename);
              }
            }
          }
        } catch (imgErr) {
          console.log('[LeafScan] Scan image save skipped:', imgErr.message);
        }

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
          JSON.stringify(content).substring(0, 10000),
          savedImagePaths.length > 0 ? JSON.stringify(savedImagePaths) : null
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
    return res.status(404).json({ error: 'invalid_code', message: 'Ung\u00fcltiger Code.' });
  }

  // Check max uses (VIP codes = 1 use globally)
  if (promo.used >= promo.max_uses) {
    return res.status(410).json({ error: 'code_exhausted', message: 'Dieser Code wurde bereits eingel\u00f6st.' });
  }

  const isVIP = cleanCode.startsWith('VIP-');

  if (isVIP) {
    // VIP codes: check if this specific device already has a VIP code
    if (deviceId) {
      const existingByDevice = stmtCheckRedeemedByDevice.get(deviceId);
      if (existingByDevice && existingByDevice.code.startsWith('VIP-')) {
        return res.status(409).json({ error: 'already_redeemed', message: 'Auf diesem Ger\u00e4t ist bereits ein VIP-Code aktiv.' });
      }
    }
  } else {
    // Regular promo codes: one per IP and one per device ever
    const existingByIp = stmtCheckRedeemedByIp.get(ip);
    if (existingByIp) {
      return res.status(409).json({ error: 'already_redeemed', message: 'Du hast bereits einen Code eingel\u00f6st.' });
    }
    if (deviceId) {
      const existingByDevice = stmtCheckRedeemedByDevice.get(deviceId);
      if (existingByDevice) {
        return res.status(409).json({ error: 'already_redeemed', message: 'Auf diesem Ger\u00e4t wurde bereits ein Code eingel\u00f6st.' });
      }
    }
  }

  // Redeem!
  stmtRedeemPromo.run(cleanCode, ip, deviceId, promo.days);
  stmtIncrementPromo.run(cleanCode);

  const redemption = stmtActivePromo.get(ip, deviceId);

  res.json({
    success: true,
    message: `Code eingel\u00f6st! Du hast ${promo.days} Tage Premium.`,
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
      if (priceId === getGrowerPriceId()) plan = 'grower';
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

// ── Feedback (enhanced: saves full diagnosis + images for negative feedback) ──
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
  } catch (e) { console.error('[LeafScan] Event insert failed:', e.message); }
  res.json({ ok: true });
});

// ── Active announcement (public) ──
app.get('/api/announcement', (req, res) => {
  const row = db.prepare(`SELECT id, message, type FROM announcements WHERE active = 1 ORDER BY id DESC LIMIT 1`).get();
  res.json(row || null);
});

// ══════════════════════════════════════════════════════════════════
// ██  ROUTE MODULES                                              ██
// ══════════════════════════════════════════════════════════════════
app.use(adminRouter);
app.use(stripeRouter);

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
    console.warn('[LeafScan] \u26a0\ufe0f  WARNING: STRIPE_WEBHOOK_SECRET is not set!');
    console.warn('[LeafScan] \u26a0\ufe0f  Subscription cancellations will NOT be processed.');
    console.warn('[LeafScan] \u26a0\ufe0f  Set it in .env.server from your Stripe Dashboard \u2192 Webhooks.');
  }
  ensureProducts();
});
