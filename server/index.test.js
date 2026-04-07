import { describe, it, expect, beforeEach, vi } from 'vitest';

// ── Test the core logic extracted from server/index.js ──
// We test the pure functions and request handling logic without starting Express.

describe('isTester()', () => {
  const TESTER_KEY = 'ls-tester-2024-xK9mQ';

  function isTester(req) {
    return req.headers['x-leafscan-key'] === TESTER_KEY;
  }

  it('returns true when correct tester key is sent', () => {
    const req = { headers: { 'x-leafscan-key': TESTER_KEY } };
    expect(isTester(req)).toBe(true);
  });

  it('returns false without tester key', () => {
    const req = { headers: {} };
    expect(isTester(req)).toBe(false);
  });

  it('returns false with wrong tester key', () => {
    const req = { headers: { 'x-leafscan-key': 'wrong-key' } };
    expect(isTester(req)).toBe(false);
  });

  it('returns false for browser requests (with Sec-Fetch-Site but no key)', () => {
    const req = { headers: { 'sec-fetch-site': 'same-origin' } };
    expect(isTester(req)).toBe(false);
  });
});

describe('getScanLimit()', () => {
  const FREE_SCANS_PER_DAY = 1;
  const TESTER_SCANS_PER_DAY = 50;
  const TESTER_KEY = 'ls-tester-2024-xK9mQ';

  function isTester(req) {
    return req.headers['x-leafscan-key'] === TESTER_KEY;
  }

  function getScanLimit(req) {
    return isTester(req) ? TESTER_SCANS_PER_DAY : FREE_SCANS_PER_DAY;
  }

  it('returns 50 for APK tester', () => {
    const req = { headers: { 'x-leafscan-key': TESTER_KEY } };
    expect(getScanLimit(req)).toBe(50);
  });

  it('returns 1 for PWA user', () => {
    const req = { headers: { 'sec-fetch-site': 'same-origin' } };
    expect(getScanLimit(req)).toBe(1);
  });

  it('returns 1 for curl/Postman (no headers)', () => {
    const req = { headers: {} };
    expect(getScanLimit(req)).toBe(1);
  });
});

describe('Rate limiting logic', () => {
  it('allows up to 10 requests per minute per IP', () => {
    const ipRequestCounts = new Map();
    const ip = '1.2.3.4';

    for (let i = 1; i <= 10; i++) {
      const count = (ipRequestCounts.get(ip) || 0) + 1;
      ipRequestCounts.set(ip, count);
      expect(count).toBeLessThanOrEqual(10);
    }

    const count = (ipRequestCounts.get(ip) || 0) + 1;
    ipRequestCounts.set(ip, count);
    expect(count).toBe(11);
    expect(count > 10).toBe(true); // Would be blocked
  });

  it('tracks IPs independently', () => {
    const ipRequestCounts = new Map();

    ipRequestCounts.set('1.1.1.1', 10);
    ipRequestCounts.set('2.2.2.2', 1);

    expect(ipRequestCounts.get('1.1.1.1')).toBe(10);
    expect(ipRequestCounts.get('2.2.2.2')).toBe(1);
  });
});

describe('Message validation logic', () => {
  const ALLOWED_ROLES = new Set(['system', 'user', 'assistant']);

  function validateMessage(msg) {
    if (typeof msg !== 'object' || msg === null) return 'Invalid message format';
    if (!ALLOWED_ROLES.has(msg.role)) return 'Invalid message role';
    if (typeof msg.content !== 'string' && !Array.isArray(msg.content)) return 'Message content must be string or array';
    if (typeof msg.content === 'string' && msg.content.length > 100000) return 'Message content too long';
    return null; // valid
  }

  it('accepts valid system message', () => {
    expect(validateMessage({ role: 'system', content: 'You are a helper' })).toBeNull();
  });

  it('accepts valid user message', () => {
    expect(validateMessage({ role: 'user', content: 'Hello' })).toBeNull();
  });

  it('accepts valid assistant message', () => {
    expect(validateMessage({ role: 'assistant', content: 'Hi there' })).toBeNull();
  });

  it('rejects invalid role', () => {
    expect(validateMessage({ role: 'admin', content: 'hack' })).toBe('Invalid message role');
  });

  it('rejects null message', () => {
    expect(validateMessage(null)).toBe('Invalid message format');
  });

  it('rejects number content', () => {
    expect(validateMessage({ role: 'user', content: 42 })).toBe('Message content must be string or array');
  });

  it('rejects oversized content', () => {
    const big = 'x'.repeat(100001);
    expect(validateMessage({ role: 'user', content: big })).toBe('Message content too long');
  });

  it('accepts array content', () => {
    expect(validateMessage({ role: 'user', content: [{ type: 'text', text: 'hi' }] })).toBeNull();
  });
});

describe('Image URL validation', () => {
  function validateImageBlock(block) {
    if (!block.image_url || typeof block.image_url !== 'object' || typeof block.image_url.url !== 'string') {
      return 'Invalid image_url block';
    }
    if (!block.image_url.url.startsWith('data:image/')) {
      return 'Only base64 data URIs allowed for images';
    }
    return null;
  }

  it('accepts base64 data URI', () => {
    expect(validateImageBlock({
      type: 'image_url',
      image_url: { url: 'data:image/jpeg;base64,/9j/4AAQ...' },
    })).toBeNull();
  });

  it('rejects external URL', () => {
    expect(validateImageBlock({
      type: 'image_url',
      image_url: { url: 'https://evil.com/image.jpg' },
    })).toBe('Only base64 data URIs allowed for images');
  });

  it('rejects missing image_url object', () => {
    expect(validateImageBlock({ type: 'image_url' })).toBe('Invalid image_url block');
  });
});

describe('Premium session expiry logic', () => {
  const SESSION_MAX_AGE_DAYS = 35;

  function isExpired(createdAtStr) {
    const createdAt = new Date(createdAtStr + 'Z');
    const ageMs = Date.now() - createdAt.getTime();
    return ageMs > SESSION_MAX_AGE_DAYS * 24 * 60 * 60 * 1000;
  }

  it('session created today is not expired', () => {
    const now = new Date().toISOString().replace('Z', '').replace('T', ' ').slice(0, 19);
    expect(isExpired(now)).toBe(false);
  });

  it('session created 36 days ago is expired', () => {
    const date = new Date(Date.now() - 36 * 24 * 60 * 60 * 1000);
    const str = date.toISOString().replace('Z', '').replace('T', ' ').slice(0, 19);
    expect(isExpired(str)).toBe(true);
  });

  it('session created 34 days ago is not expired', () => {
    const date = new Date(Date.now() - 34 * 24 * 60 * 60 * 1000);
    const str = date.toISOString().replace('Z', '').replace('T', ' ').slice(0, 19);
    expect(isExpired(str)).toBe(false);
  });
});

describe('Model whitelist', () => {
  const ALLOWED_MODELS = new Set(['gpt-4.1', 'gpt-4.1-nano']);

  it('allows gpt-4.1', () => {
    expect(ALLOWED_MODELS.has('gpt-4.1')).toBe(true);
  });

  it('allows gpt-4.1-nano', () => {
    expect(ALLOWED_MODELS.has('gpt-4.1-nano')).toBe(true);
  });

  it('rejects gpt-3.5-turbo', () => {
    expect(ALLOWED_MODELS.has('gpt-3.5-turbo')).toBe(false);
  });

  it('rejects old gpt-4o', () => {
    expect(ALLOWED_MODELS.has('gpt-4o')).toBe(false);
  });

  it('falls back to gpt-4.1 for invalid model', () => {
    const requested = 'gpt-3.5-turbo';
    const model = ALLOWED_MODELS.has(requested) ? requested : 'gpt-4.1';
    expect(model).toBe('gpt-4.1');
  });
});

describe('Max tokens capping', () => {
  function capTokens(max_tokens) {
    return Math.min(Number.isFinite(max_tokens) && max_tokens > 0 ? max_tokens : 4000, 4000);
  }

  it('caps at 4000', () => {
    expect(capTokens(10000)).toBe(4000);
  });

  it('passes through valid value', () => {
    expect(capTokens(2048)).toBe(2048);
  });

  it('defaults to 4000 for undefined', () => {
    expect(capTokens(undefined)).toBe(4000);
  });

  it('defaults to 4000 for negative', () => {
    expect(capTokens(-1)).toBe(4000);
  });

  it('defaults to 4000 for NaN', () => {
    expect(capTokens(NaN)).toBe(4000);
  });
});
