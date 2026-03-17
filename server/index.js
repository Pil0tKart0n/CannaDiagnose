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
const ALLOWED_MODEL = 'gpt-4o-mini';
const FREE_SCANS_PER_DAY = 1;

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
const stmtFindSession = db.prepare(`SELECT * FROM premium_sessions WHERE session_token = ? AND active = 1`);
const stmtCreateSession = db.prepare(`
  INSERT INTO premium_sessions (session_token, stripe_customer_id, stripe_subscription_id, plan)
  VALUES (?, ?, ?, ?)
`);
const stmtFindByCustomer = db.prepare(`SELECT * FROM premium_sessions WHERE stripe_customer_id = ? AND active = 1`);
const stmtDeactivateBySubscription = db.prepare(`UPDATE premium_sessions SET active = 0 WHERE stripe_subscription_id = ?`);
const stmtDeactivateByCustomer = db.prepare(`UPDATE premium_sessions SET active = 0 WHERE stripe_customer_id = ?`);

// Cleanup old scan logs (keep 7 days)
function cleanupOldScans() {
  db.prepare(`DELETE FROM scan_log WHERE scanned_at < date('now', '-7 days')`).run();
}
setInterval(cleanupOldScans, 24 * 60 * 60 * 1000); // daily
cleanupOldScans();

// Store price IDs after creation/lookup
let growerPriceId = null;
let proPriceId = null;
let productsReady = false;

// ── Middleware ──
app.use(cors({
  origin: ['https://leafscan.de', 'https://www.leafscan.de'],
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Trust proxy (nginx sets X-Real-IP)
app.set('trust proxy', true);

// Webhook needs raw body, everything else gets JSON parsed
app.use('/api/stripe/webhook', express.raw({ type: 'application/json' }));
app.use(express.json({ limit: '20mb' }));

/** Extract client IP from request */
function getClientIP(req) {
  return req.headers['x-real-ip'] || req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip;
}

/** Check if a session token is valid premium */
function checkPremium(token) {
  if (!token) return null;
  return stmtFindSession.get(token) || null;
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

  // 1. Check for premium session token
  const authHeader = req.headers['authorization'];
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  const premiumSession = checkPremium(token);

  // 2. If not premium, check free quota
  if (!premiumSession) {
    const { count } = stmtCountScans.get(ip);
    if (count >= FREE_SCANS_PER_DAY) {
      return res.status(403).json({
        error: 'quota_exceeded',
        message: 'Tageslimit erreicht. Upgrade auf Premium für unbegrenzte Scans.',
        scansToday: count,
        limit: FREE_SCANS_PER_DAY,
      });
    }
  }

  // 3. Validate request body
  const { messages, max_tokens } = req.body;
  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'invalid_request', message: 'messages array required' });
  }

  // 4. Forward to OpenAI (enforce model + cap tokens, whitelist fields only)
  try {
    const openaiBody = {
      messages,
      model: ALLOWED_MODEL,
      max_tokens: Math.min(max_tokens || 4000, 4000),
    };

    const openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify(openaiBody),
    });

    const data = await openaiRes.text();

    // 5. Record scan ONLY on success and ONLY for free users
    if (openaiRes.ok && !premiumSession) {
      stmtInsertScan.run(ip);
    }

    // Forward response as-is
    res.status(openaiRes.status)
      .set('Content-Type', 'application/json')
      .send(data);
  } catch (err) {
    console.error('[LeafScan] OpenAI proxy error:', err.message);
    res.status(502).json({ error: 'upstream_error', message: 'KI-Service nicht erreichbar.' });
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
      limit: Infinity,
      allowed: true,
    });
  }

  const { count } = stmtCountScans.get(ip);
  const allowed = count < FREE_SCANS_PER_DAY;
  res.json({
    isPremium: false,
    plan: null,
    scansToday: count,
    limit: FREE_SCANS_PER_DAY,
    allowed,
  });
});

// ══════════════════════════════════════════════════
// ██  /api/verify-session — VERIFY STRIPE PAYMENT ██
// ══════════════════════════════════════════════════
app.get('/api/verify-session', async (req, res) => {
  const { session_id } = req.query;
  if (!session_id) {
    return res.status(400).json({ error: 'session_id required' });
  }

  try {
    const session = await stripe.checkout.sessions.retrieve(session_id);

    if (session.payment_status !== 'paid') {
      return res.status(402).json({ error: 'not_paid', message: 'Zahlung nicht abgeschlossen.' });
    }

    // Check if we already have a session for this customer
    const existing = stmtFindByCustomer.get(session.customer);
    if (existing) {
      return res.json({ token: existing.session_token, plan: existing.plan });
    }

    // Determine plan from the price
    const lineItems = await stripe.checkout.sessions.listLineItems(session_id);
    let plan = 'pro'; // default
    if (lineItems.data.length > 0) {
      const priceId = lineItems.data[0].price?.id;
      if (priceId === growerPriceId) plan = 'grower';
    }

    // Create new premium session
    const sessionToken = crypto.randomBytes(32).toString('hex');
    stmtCreateSession.run(sessionToken, session.customer, session.subscription, plan);

    console.log('[LeafScan] Premium activated:', { customer: session.customer, plan });
    res.json({ token: sessionToken, plan });
  } catch (err) {
    console.error('[LeafScan] verify-session error:', err.message);
    res.status(500).json({ error: 'verification_failed' });
  }
});

// ── Create Stripe products on startup ──
async function ensureProducts() {
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
app.post('/api/stripe/checkout', async (req, res) => {
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
app.post('/api/stripe/portal', async (req, res) => {
  const { sessionId } = req.body;
  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    const portalSession = await stripe.billingPortal.sessions.create({ customer: session.customer, return_url: DOMAIN });
    res.json({ url: portalSession.url });
  } catch (err) {
    console.error('[LeafScan] Portal error:', err.message);
    res.status(500).json({ error: 'Portal konnte nicht geöffnet werden.' });
  }
});

// ── POST /api/stripe/webhook — WITH signature verification ──
app.post('/api/stripe/webhook', async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

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

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object;
      console.log('[LeafScan] Payment successful:', session.customer_email || session.customer);

      // Create premium session if not already created by verify-session
      const existing = stmtFindByCustomer.get(session.customer);
      if (!existing) {
        const sessionToken = crypto.randomBytes(32).toString('hex');
        stmtCreateSession.run(sessionToken, session.customer, session.subscription, 'pro');
        console.log('[LeafScan] Premium session created via webhook for:', session.customer);
      }
      break;
    }
    case 'customer.subscription.deleted': {
      const sub = event.data.object;
      console.log('[LeafScan] Subscription cancelled:', sub.customer);
      stmtDeactivateBySubscription.run(sub.id);
      break;
    }
    case 'customer.subscription.updated': {
      const sub = event.data.object;
      if (sub.status === 'canceled' || sub.status === 'past_due' || sub.status === 'unpaid') {
        console.log('[LeafScan] Subscription deactivated:', sub.customer, sub.status);
        stmtDeactivateBySubscription.run(sub.id);
      }
      break;
    }
    default:
      console.log('[LeafScan] Webhook event:', event.type);
  }

  res.json({ received: true });
});

// ── Health check ──
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', stripe: productsReady && !!growerPriceId, db: !!db });
});

// ── Start ──
app.listen(PORT, () => {
  console.log(`[LeafScan] API server running on port ${PORT}`);
  ensureProducts();
});
