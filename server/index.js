const express = require('express');
const Stripe = require('stripe');
const cors = require('cors');
const crypto = require('crypto');
const Database = require('better-sqlite3');
const path = require('path');

const app = express();
const PORT = 4000;

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const DOMAIN = process.env.DOMAIN || 'https://leafscan.de';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const ALLOWED_MODELS = new Set(['gpt-4o', 'gpt-4o-mini']);
const FREE_SCANS_PER_DAY = 1;
const TESTER_SCANS_PER_DAY = 50;
const TESTER_KEY = 'ls-tester-2024-xK9mQ'; // embedded in APK, not security-critical

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
`);

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
const stmtDeactivateByCustomer = db.prepare(`UPDATE premium_sessions SET active = 0 WHERE stripe_customer_id = ?`);

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
  allowedHeaders: ['Content-Type', 'Authorization', 'X-LeafScan-Key'],
}));

// Trust only the first proxy hop (nginx). Using `true` would trust ALL proxies,
// allowing attackers to spoof X-Forwarded-For and bypass rate limits.
app.set('trust proxy', 1);

// Webhook needs raw body, everything else gets JSON parsed
app.use('/api/stripe/webhook', express.raw({ type: 'application/json' }));
app.use(express.json({ limit: '10mb' }));

/** Extract client IP — use req.ip which respects trust proxy setting safely */
function getClientIP(req) {
  return req.ip;
}

/** Check if request comes from APK/native app (via custom header or missing Origin) */
function isTester(req) {
  // Explicit tester key (new APK builds)
  if (req.headers['x-leafscan-key'] === TESTER_KEY) return true;
  // Native apps don't send Origin header, web browsers always do
  if (!req.headers['origin']) return true;
  return false;
}

/** Get the applicable scan limit for this request */
function getScanLimit(req) {
  return isTester(req) ? TESTER_SCANS_PER_DAY : FREE_SCANS_PER_DAY;
}

/** Check if a session token is valid premium (with expiry safety-net) */
const SESSION_MAX_AGE_DAYS = 35; // slightly over 1 month — forces re-verification
function checkPremium(token) {
  if (!token) return null;
  const session = stmtFindSession.get(token);
  if (!session) return null;
  // Safety-net expiry: if webhook secret isn't configured, sessions could live forever.
  // Expire after SESSION_MAX_AGE_DAYS to force re-verification via Stripe.
  const createdAt = new Date(session.created_at + 'Z');
  const ageMs = Date.now() - createdAt.getTime();
  if (ageMs > SESSION_MAX_AGE_DAYS * 24 * 60 * 60 * 1000) {
    stmtDeactivateBySubscription.run(session.stripe_subscription_id);
    return null;
  }
  return session;
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
// ██  /api/scan — THE SECURE OPENAI PROXY (replaces nginx proxy) ██
// ══════════════════════════════════════════════════════════════════
app.post('/api/scan', rateLimit, async (req, res) => {
  if (!OPENAI_API_KEY) {
    return res.status(500).json({ error: 'server_error', message: 'API nicht konfiguriert.' });
  }

  const ip = getClientIP(req);

  // 1. Validate request body FIRST (before burning a scan slot)
  const { messages, max_tokens } = req.body;
  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'invalid_request', message: 'messages array required' });
  }

  // 1b. Strict message validation — prevent abuse as free GPT proxy
  if (messages.length > 5) {
    return res.status(400).json({ error: 'invalid_request', message: 'Too many messages (max 5)' });
  }

  const ALLOWED_ROLES = new Set(['system', 'user', 'assistant']);
  for (const msg of messages) {
    if (typeof msg !== 'object' || msg === null) {
      return res.status(400).json({ error: 'invalid_request', message: 'Invalid message format' });
    }
    if (!ALLOWED_ROLES.has(msg.role)) {
      return res.status(400).json({ error: 'invalid_request', message: 'Invalid message role' });
    }
    // Validate content type: must be string or array (reject numbers, booleans, objects)
    if (typeof msg.content !== 'string' && !Array.isArray(msg.content)) {
      return res.status(400).json({ error: 'invalid_request', message: 'Message content must be string or array' });
    }
    // String content: limit length
    if (typeof msg.content === 'string' && msg.content.length > 100000) {
      return res.status(400).json({ error: 'invalid_request', message: 'Message content too long' });
    }
    // Array content (multimodal): validate each block
    if (Array.isArray(msg.content)) {
      if (msg.content.length > 10) {
        return res.status(400).json({ error: 'invalid_request', message: 'Too many content blocks' });
      }
      for (const block of msg.content) {
        if (typeof block !== 'object' || block === null) {
          return res.status(400).json({ error: 'invalid_request', message: 'Invalid content block' });
        }
        // Only allow 'text' and 'image_url' block types
        if (block.type !== 'text' && block.type !== 'image_url') {
          return res.status(400).json({ error: 'invalid_request', message: 'Invalid content block type' });
        }
        // Text blocks: text must be a string with length limit
        if (block.type === 'text') {
          if (typeof block.text !== 'string') {
            return res.status(400).json({ error: 'invalid_request', message: 'Text block must have string text' });
          }
          if (block.text.length > 100000) {
            return res.status(400).json({ error: 'invalid_request', message: 'Text block content too long' });
          }
        }
        // Image URLs must be data URIs (base64), not arbitrary external URLs
        if (block.type === 'image_url') {
          if (!block.image_url || typeof block.image_url !== 'object' || typeof block.image_url.url !== 'string') {
            return res.status(400).json({ error: 'invalid_request', message: 'Invalid image_url block' });
          }
          if (!block.image_url.url.startsWith('data:image/')) {
            return res.status(400).json({ error: 'invalid_request', message: 'Only base64 data URIs allowed for images' });
          }
        }
      }
    }
  }

  // 2. Check for premium session token
  const authHeader = req.headers['authorization'];
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  const premiumSession = checkPremium(token);

  // 3. If not premium, atomically reserve a free scan slot AFTER validation
  if (!premiumSession) {
    const limit = getScanLimit(req);
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

  // 4. Sanitize messages — strip any extra properties (name, function_call, tool_calls etc.)
  const sanitizedMessages = messages.map(msg => {
    const clean = { role: msg.role, content: msg.content };
    // For array content, also sanitize each block to only allowed keys
    if (Array.isArray(clean.content)) {
      clean.content = clean.content.map(block => {
        if (block.type === 'text') return { type: 'text', text: block.text };
        if (block.type === 'image_url') return { type: 'image_url', image_url: { url: block.image_url.url } };
        return block;
      });
    }
    return clean;
  });

  // 5. Forward to OpenAI (enforce model + cap tokens, whitelist fields only)
  const { temperature, response_format } = req.body;
  const requestedModel = req.body.model;
  try {
    const openaiBody = {
      messages: sanitizedMessages,
      model: ALLOWED_MODELS.has(requestedModel) ? requestedModel : 'gpt-4o',
      max_tokens: Math.min(Number.isFinite(max_tokens) && max_tokens > 0 ? max_tokens : 4000, 4000),
      // temperature 0 = deterministic (more consistent diagnoses)
      temperature: typeof temperature === 'number' ? Math.max(0, Math.min(temperature, 1)) : 0.2,
    };
    // Enable JSON mode if requested (guarantees valid JSON output)
    if (response_format && typeof response_format === 'object' && response_format.type === 'json_object') {
      openaiBody.response_format = { type: 'json_object' };
    }

    const openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify(openaiBody),
    });

    const data = await openaiRes.text();

    // Refund scan if OpenAI returned an error (free user paid quota but got no result)
    if (!premiumSession && !openaiRes.ok) {
      try { stmtRefundScan.run(ip); } catch (e) { console.error('[LeafScan] Scan refund failed:', e.message); }
      console.log('[LeafScan] Scan refunded for', ip, '(upstream status', openaiRes.status + ')');
    }

    // Forward response as-is (preserve upstream content-type)
    res.status(openaiRes.status)
      .set('Content-Type', openaiRes.headers.get('content-type') || 'application/json')
      .send(data);
  } catch (err) {
    // Refund scan on network/fetch failure
    if (!premiumSession) {
      try { stmtRefundScan.run(ip); } catch (e) { console.error('[LeafScan] Scan refund failed:', e.message); }
      console.log('[LeafScan] Scan refunded for', ip, '(fetch error)');
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
  const { messages, max_tokens } = req.body;
  if (!messages || !Array.isArray(messages) || messages.length > 2) {
    return res.status(400).json({ error: 'invalid_request' });
  }

  // Validate messages with same rigor as /api/scan to prevent abuse as free proxy
  for (const msg of messages) {
    if (typeof msg !== 'object' || msg === null) {
      return res.status(400).json({ error: 'invalid_request', message: 'Invalid message format' });
    }
    if (msg.role !== 'system' && msg.role !== 'user') {
      return res.status(400).json({ error: 'invalid_request', message: 'Invalid message role' });
    }
    if (typeof msg.content !== 'string' && !Array.isArray(msg.content)) {
      return res.status(400).json({ error: 'invalid_request', message: 'Message content must be string or array' });
    }
    if (typeof msg.content === 'string' && msg.content.length > 2000) {
      return res.status(400).json({ error: 'invalid_request', message: 'Message content too long' });
    }
    if (Array.isArray(msg.content)) {
      if (msg.content.length > 5) {
        return res.status(400).json({ error: 'invalid_request', message: 'Too many content blocks' });
      }
      for (const block of msg.content) {
        if (typeof block !== 'object' || block === null) {
          return res.status(400).json({ error: 'invalid_request', message: 'Invalid content block' });
        }
        if (block.type !== 'text' && block.type !== 'image_url') {
          return res.status(400).json({ error: 'invalid_request', message: 'Invalid content block type' });
        }
        if (block.type === 'text' && (typeof block.text !== 'string' || block.text.length > 2000)) {
          return res.status(400).json({ error: 'invalid_request', message: 'Invalid text block' });
        }
        if (block.type === 'image_url') {
          if (!block.image_url || typeof block.image_url !== 'object' || typeof block.image_url.url !== 'string') {
            return res.status(400).json({ error: 'invalid_request', message: 'Invalid image_url block' });
          }
          if (!block.image_url.url.startsWith('data:image/')) {
            return res.status(400).json({ error: 'invalid_request', message: 'Only base64 data URIs allowed' });
          }
        }
      }
    }
  }

  // Sanitize messages — strip extra properties
  const sanitizedMessages = messages.map(msg => {
    const clean = { role: msg.role, content: msg.content };
    if (Array.isArray(clean.content)) {
      clean.content = clean.content.map(block => {
        if (block.type === 'text') return { type: 'text', text: block.text };
        if (block.type === 'image_url') return { type: 'image_url', image_url: { url: block.image_url.url } };
        return block;
      });
    }
    return clean;
  });

  try {
    const openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        messages: sanitizedMessages,
        model: 'gpt-4o-mini', // validation is lightweight, mini is fine here
        max_tokens: Math.min(Number(max_tokens) || 20, 50),
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
  const premiumSession = checkPremium(token);

  if (premiumSession) {
    return res.json({
      isPremium: true,
      plan: premiumSession.plan,
      scansToday: 0,
      limit: 999999,
      allowed: true,
    });
  }

  const limit = getScanLimit(req);
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
  const { priceId } = req.body;
  if (!priceId) return res.status(400).json({ error: 'priceId required' });
  if (!growerPriceId || !proPriceId) await ensureProducts();
  if (priceId !== growerPriceId && priceId !== proPriceId) return res.status(400).json({ error: 'Invalid priceId' });

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${DOMAIN}/?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${DOMAIN}/paywall`,
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
  const premiumSession = checkPremium(token);

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
