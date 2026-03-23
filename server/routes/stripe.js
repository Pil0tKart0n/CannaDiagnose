/**
 * Stripe routes — all /api/stripe/* endpoints + product setup.
 * Extracted from index.js for modularity.
 */
const express = require('express');
const Stripe = require('stripe');
const crypto = require('crypto');

const {
  db,
  stmtFindSession, stmtCreateSession, stmtFindByCustomer,
  stmtDeactivateBySubscription, stmtDeactivateByCustomer, stmtUpdatePlan,
} = require('../db');

const router = express.Router();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const DOMAIN = process.env.DOMAIN || 'https://leafscan.de';

// Store price IDs after creation/lookup
let growerPriceId = null;
let proPriceId = null;
let productsReady = false;

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
        description: 'Unbegrenzte Diagnosen, PDF-Export, Prioritaets-Analyse',
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

/** Get the growerPriceId (used by verify-session in index.js) */
function getGrowerPriceId() {
  return growerPriceId;
}

// ── GET /api/stripe/products ──
router.get('/api/stripe/products', async (req, res) => {
  if (!growerPriceId || !proPriceId) await ensureProducts();
  res.json({
    plans: [
      { id: 'grower', priceId: growerPriceId, name: 'Grower', description: '10 Diagnosen pro Tag, unbegrenzte Pflanzen, PDF-Export', price: '4,99 \u20ac', priceAmount: 499, interval: 'month' },
      { id: 'pro', priceId: proPriceId, name: 'Pro', description: 'Unbegrenzte Diagnosen, PDF-Export, Prioritaets-Analyse', price: '9,99 \u20ac', priceAmount: 999, interval: 'month' },
    ],
  });
});

// ── POST /api/stripe/checkout ──
let _rateLimit = null;
function setRateLimit(fn) {
  _rateLimit = fn;
}

router.post('/api/stripe/checkout', (req, res, next) => {
  if (_rateLimit) return _rateLimit(req, res, next);
  next();
}, async (req, res) => {
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
// Secured: requires valid premium session token
let _checkPremium = null;
function setCheckPremium(fn) {
  _checkPremium = fn;
}

router.post('/api/stripe/portal', (req, res, next) => {
  if (_rateLimit) return _rateLimit(req, res, next);
  next();
}, async (req, res) => {
  // Authenticate via premium session token
  const authHeader = req.headers['authorization'];
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  const premiumSession = _checkPremium ? _checkPremium(token, req) : null;

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
    res.status(500).json({ error: 'Portal konnte nicht geoeffnet werden.' });
  }
});

// ── POST /api/stripe/webhook — WITH signature verification ──
// Required events in Stripe Dashboard:
//   checkout.session.completed, customer.subscription.deleted,
//   customer.subscription.updated, invoice.payment_failed
router.post('/api/stripe/webhook', async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!sig) {
    return res.status(400).send('Missing stripe-signature header');
  }

  let event;
  try {
    if (!webhookSecret) {
      console.error('[LeafScan] STRIPE_WEBHOOK_SECRET not set -- rejecting webhook');
      return res.status(500).send('Webhook secret not configured');
    }
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err) {
    console.error('[LeafScan] Webhook signature failed:', err.message);
    return res.status(400).send('Webhook Error');
  }

  try {
    switch (event.type) {
      // ── Payment completed -> activate premium ──
      case 'checkout.session.completed': {
        const session = event.data.object;
        console.log('[LeafScan] Payment successful:', session.customer);

        // Use transaction to prevent race conditions with verify-session
        const upsertFromWebhook = db.transaction((customerId, subscriptionId) => {
          const existing = stmtFindByCustomer.get(customerId);
          if (existing) return; // Already created by verify-session

          const sessionToken = crypto.randomBytes(32).toString('hex');
          stmtCreateSession.run(sessionToken, customerId, subscriptionId, 'pro');
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

      // ── Subscription cancelled -> deactivate immediately ──
      case 'customer.subscription.deleted': {
        const sub = event.data.object;
        console.log('[LeafScan] Subscription cancelled:', sub.customer);
        stmtDeactivateBySubscription.run(sub.id);
        stmtDeactivateByCustomer.run(sub.customer);
        break;
      }

      // ── Subscription status changed -> check if still active ──
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

      // ── Payment failed -> warn but don't deactivate yet (Stripe retries) ──
      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        console.log('[LeafScan] Payment failed for:', invoice.customer, 'attempt:', invoice.attempt_count);
        // After 3 failed attempts, Stripe will cancel the subscription
        // which triggers customer.subscription.deleted above
        if (invoice.attempt_count >= 3) {
          console.log('[LeafScan] 3+ failed payments -- deactivating:', invoice.customer);
          stmtDeactivateByCustomer.run(invoice.customer);
        }
        break;
      }

      default:
        // Ignore unknown events silently (don't log spam)
        break;
    }
  } catch (err) {
    // Log but don't fail -- always return 200 to prevent Stripe retries on our bugs
    console.error('[LeafScan] Webhook processing error:', err.message);
  }

  res.json({ received: true });
});

module.exports = {
  router,
  stripe,
  ensureProducts,
  getGrowerPriceId,
  setRateLimit,
  setCheckPremium,
};
