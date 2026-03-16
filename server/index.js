const express = require('express');
const Stripe = require('stripe');
const cors = require('cors');

const app = express();
const PORT = 4000;

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const DOMAIN = process.env.DOMAIN || 'https://leafscan.de';

// Store price IDs after creation/lookup
let growerPriceId = null;
let proPriceId = null;

// ── Middleware ──
app.use(cors());
// Webhook needs raw body, everything else gets JSON parsed
app.use('/api/stripe/webhook', express.raw({ type: 'application/json' }));
app.use(express.json());

// ── Create Stripe products on startup ──
async function ensureProducts() {
  try {
    // Search for existing products
    const products = await stripe.products.list({ limit: 10 });

    let growerProduct = products.data.find(p => p.metadata.plan === 'grower');
    let proProduct = products.data.find(p => p.metadata.plan === 'pro');

    // Create Grower product if not exists
    if (!growerProduct) {
      growerProduct = await stripe.products.create({
        name: 'LeafScan Grower',
        description: '10 Diagnosen pro Tag, unbegrenzte Pflanzen, PDF-Export',
        metadata: { plan: 'grower' },
      });
      console.log('[LeafScan] Created Grower product:', growerProduct.id);
    }

    // Create Pro product if not exists
    if (!proProduct) {
      proProduct = await stripe.products.create({
        name: 'LeafScan Pro',
        description: 'Unbegrenzte Diagnosen, PDF-Export, Prioritäts-Analyse',
        metadata: { plan: 'pro' },
      });
      console.log('[LeafScan] Created Pro product:', proProduct.id);
    }

    // Get or create prices
    const prices = await stripe.prices.list({ limit: 20, active: true });

    growerPriceId = prices.data.find(
      p => p.product === growerProduct.id && p.recurring?.interval === 'month'
    )?.id;

    proPriceId = prices.data.find(
      p => p.product === proProduct.id && p.recurring?.interval === 'month'
    )?.id;

    if (!growerPriceId) {
      const price = await stripe.prices.create({
        product: growerProduct.id,
        unit_amount: 499, // 4,99€ in cents
        currency: 'eur',
        recurring: { interval: 'month' },
      });
      growerPriceId = price.id;
      console.log('[LeafScan] Created Grower price:', growerPriceId);
    }

    if (!proPriceId) {
      const price = await stripe.prices.create({
        product: proProduct.id,
        unit_amount: 999, // 9,99€ in cents
        currency: 'eur',
        recurring: { interval: 'month' },
      });
      proPriceId = price.id;
      console.log('[LeafScan] Created Pro price:', proPriceId);
    }

    console.log('[LeafScan] Stripe products ready:', { growerPriceId, proPriceId });
  } catch (err) {
    console.error('[LeafScan] Failed to setup Stripe products:', err.message);
  }
}

// ── GET /api/stripe/products — return available plans ──
app.get('/api/stripe/products', (req, res) => {
  res.json({
    plans: [
      {
        id: 'grower',
        priceId: growerPriceId,
        name: 'Grower',
        description: '10 Diagnosen pro Tag, unbegrenzte Pflanzen, PDF-Export',
        price: '4,99 €',
        priceAmount: 499,
        interval: 'month',
      },
      {
        id: 'pro',
        priceId: proPriceId,
        name: 'Pro',
        description: 'Unbegrenzte Diagnosen, PDF-Export, Prioritäts-Analyse',
        price: '9,99 €',
        priceAmount: 999,
        interval: 'month',
      },
    ],
  });
});

// ── POST /api/stripe/checkout — create checkout session ──
app.post('/api/stripe/checkout', async (req, res) => {
  const { priceId } = req.body;

  if (!priceId) {
    return res.status(400).json({ error: 'priceId required' });
  }

  // Validate it's one of our prices
  if (priceId !== growerPriceId && priceId !== proPriceId) {
    return res.status(400).json({ error: 'Invalid priceId' });
  }

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${DOMAIN}/?payment=success`,
      cancel_url: `${DOMAIN}/paywall`,
      locale: 'de',
    });

    res.json({ url: session.url });
  } catch (err) {
    console.error('[LeafScan] Checkout error:', err.message);
    res.status(500).json({ error: 'Checkout konnte nicht erstellt werden.' });
  }
});

// ── POST /api/stripe/portal — customer portal for managing subscriptions ──
app.post('/api/stripe/portal', async (req, res) => {
  const { sessionId } = req.body;

  try {
    // Get customer from session
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: session.customer,
      return_url: DOMAIN,
    });

    res.json({ url: portalSession.url });
  } catch (err) {
    console.error('[LeafScan] Portal error:', err.message);
    res.status(500).json({ error: 'Portal konnte nicht geöffnet werden.' });
  }
});

// ── POST /api/stripe/webhook — handle Stripe events ──
app.post('/api/stripe/webhook', async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;
  try {
    if (webhookSecret) {
      event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
    } else {
      // Without webhook secret, parse directly (dev mode)
      event = JSON.parse(req.body.toString());
    }
  } catch (err) {
    console.error('[LeafScan] Webhook signature failed:', err.message);
    return res.status(400).send('Webhook Error');
  }

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object;
      console.log('[LeafScan] Payment successful:', session.customer_email || session.customer);
      // Premium is activated client-side via success URL parameter
      break;
    }
    case 'customer.subscription.deleted': {
      const sub = event.data.object;
      console.log('[LeafScan] Subscription cancelled:', sub.customer);
      break;
    }
    default:
      console.log('[LeafScan] Webhook event:', event.type);
  }

  res.json({ received: true });
});

// ── Health check ──
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', stripe: !!growerPriceId });
});

// ── Start ──
app.listen(PORT, () => {
  console.log(`[LeafScan] Stripe API running on port ${PORT}`);
  ensureProducts();
});
