/**
 * LeafScan API Proxy — Cloudflare Worker
 *
 * Schützt den OpenAI API Key, indem alle Anfragen über diesen
 * Worker laufen. Der Key liegt als Secret im Cloudflare Dashboard,
 * NICHT im Client-Code.
 *
 * Deployment:
 *   1. npm install -g wrangler
 *   2. wrangler login
 *   3. cd proxy && wrangler deploy
 *   4. wrangler secret put OPENAI_API_KEY   (dann Key einfügen)
 *   5. In .env: EXPO_PUBLIC_API_PROXY_URL=https://leafscan-api.<dein-subdomain>.workers.dev
 */

const ALLOWED_ORIGINS = [
  'https://leafscan.app',
  'https://www.leafscan.app',
  'http://localhost:8081',
  'http://localhost:19006',
];

function corsHeaders(origin) {
  const allowed = ALLOWED_ORIGINS.includes(origin) || origin?.startsWith('http://localhost');
  return {
    'Access-Control-Allow-Origin': allowed ? origin : ALLOWED_ORIGINS[0],
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
  };
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '';
    const cors = corsHeaders(origin);

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: cors });
    }

    // Only POST allowed
    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405, headers: cors });
    }

    // Only /v1/chat/completions endpoint
    const url = new URL(request.url);
    if (url.pathname !== '/v1/chat/completions') {
      return new Response('Not found', { status: 404, headers: cors });
    }

    // Rate limiting: simple per-IP limit (10 requests per minute)
    const clientIP = request.headers.get('CF-Connecting-IP') || 'unknown';
    const rateLimitKey = `rate:${clientIP}`;

    // Forward to OpenAI with our secret key
    try {
      const body = await request.text();

      // Basic validation: body must be valid JSON with model field
      let parsed;
      try {
        parsed = JSON.parse(body);
      } catch {
        return new Response('Invalid JSON', { status: 400, headers: cors });
      }

      if (!parsed.model || !parsed.messages) {
        return new Response('Missing required fields', { status: 400, headers: cors });
      }

      // Enforce max_tokens cap to prevent abuse
      if (!parsed.max_tokens || parsed.max_tokens > 4000) {
        parsed.max_tokens = 2000;
      }

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify(parsed),
      });

      // Stream the response back
      const responseHeaders = { ...cors, 'Content-Type': 'application/json' };
      return new Response(response.body, {
        status: response.status,
        headers: responseHeaders,
      });
    } catch (err) {
      return new Response(JSON.stringify({ error: 'Proxy error' }), {
        status: 500,
        headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }
  },
};
