import { describe, it, expect } from 'vitest';

const { FERTILIZER_PROFILES, getFertilizerContext, isOrganicFertilizer, getFertilizerNames } = require('./fertilizers');

// ── FERTILIZER_PROFILES ───────────────────────────────────────────

describe('FERTILIZER_PROFILES', () => {
  it('is a non-empty object', () => {
    expect(typeof FERTILIZER_PROFILES).toBe('object');
    expect(Object.keys(FERTILIZER_PROFILES).length).toBeGreaterThan(0);
  });

  it('every profile has required fields', () => {
    for (const [key, profile] of Object.entries(FERTILIZER_PROFILES)) {
      expect(profile.name, `${key} missing name`).toBeDefined();
      expect(profile.brand, `${key} missing brand`).toBeDefined();
      expect(profile.type, `${key} missing type`).toBeDefined();
      expect(['mineral', 'organic', 'hybrid']).toContain(profile.type);
      expect(profile.ecRanges, `${key} missing ecRanges`).toBeDefined();
      expect(profile.notes, `${key} missing notes`).toBeDefined();
    }
  });

  it('every profile has all EC range phases', () => {
    const requiredPhases = ['seedling', 'earlyVeg', 'lateVeg', 'earlyFlower', 'midFlower', 'lateFlower', 'flush'];
    for (const [key, profile] of Object.entries(FERTILIZER_PROFILES)) {
      for (const phase of requiredPhases) {
        expect(profile.ecRanges[phase], `${key} missing ecRanges.${phase}`).toBeDefined();
        expect(typeof profile.ecRanges[phase]).toBe('string');
      }
    }
  });

  it('contains well-known brands', () => {
    expect(FERTILIZER_PROFILES['Canna Coco A+B']).toBeDefined();
    expect(FERTILIZER_PROFILES['BioBizz']).toBeDefined();
    expect(FERTILIZER_PROFILES['Athena Pro']).toBeDefined();
  });
});

// ── getFertilizerNames ────────────────────────────────────────────

describe('getFertilizerNames()', () => {
  it('returns an array', () => {
    const names = getFertilizerNames();
    expect(Array.isArray(names)).toBe(true);
  });

  it('includes all profile keys plus fallback options', () => {
    const names = getFertilizerNames();
    const profileKeys = Object.keys(FERTILIZER_PROFILES);
    for (const key of profileKeys) {
      expect(names).toContain(key);
    }
    expect(names).toContain('Anderer Dünger');
    expect(names).toContain('Kein Dünger / nur Wasser');
  });

  it('has more entries than FERTILIZER_PROFILES (due to fallback options)', () => {
    const names = getFertilizerNames();
    expect(names.length).toBe(Object.keys(FERTILIZER_PROFILES).length + 2);
  });
});

// ── getFertilizerContext ──────────────────────────────────────────

describe('getFertilizerContext()', () => {
  it('returns non-empty string for known fertilizer', () => {
    const ctx = getFertilizerContext('Canna Coco A+B', '3–4 Wochen', 'Veg');
    expect(typeof ctx).toBe('string');
    expect(ctx.length).toBeGreaterThan(0);
  });

  it('includes fertilizer name in context', () => {
    const ctx = getFertilizerContext('Canna Coco A+B', '3–4 Wochen', 'Veg');
    expect(ctx).toContain('Canna Coco A+B');
  });

  it('includes brand name in context', () => {
    const ctx = getFertilizerContext('Canna Coco A+B', '3–4 Wochen', 'Veg');
    expect(ctx).toContain('Canna');
  });

  it('includes EC range for the given phase', () => {
    const ctx = getFertilizerContext('Canna Coco A+B', '3–4 Wochen', 'Veg');
    expect(ctx).toContain('EC');
  });

  it('returns empty string for "Anderer Dünger"', () => {
    expect(getFertilizerContext('Anderer Dünger')).toBe('');
  });

  it('returns empty string for "Kein Dünger / nur Wasser"', () => {
    expect(getFertilizerContext('Kein Dünger / nur Wasser')).toBe('');
  });

  it('returns empty string for null input', () => {
    expect(getFertilizerContext(null)).toBe('');
  });

  it('returns empty string for unknown fertilizer', () => {
    expect(getFertilizerContext('Totally Unknown Brand XYZ')).toBe('');
  });

  it('mentions organic type for organic fertilizers', () => {
    const ctx = getFertilizerContext('BioBizz', '3–4 Wochen', 'Veg');
    expect(ctx).toContain('organisch');
  });

  it('handles flower phase', () => {
    const ctx = getFertilizerContext('Canna Coco A+B', '3–4 Wochen', 'Blüte');
    expect(ctx).toContain('Blüte');
  });

  it('handles late flower / harvest phase', () => {
    const ctx = getFertilizerContext('Canna Coco A+B', '9–12 Wochen', 'Blüte');
    expect(ctx).toContain('Ernte');
  });

  it('handles Mutterpflanze grow phase (uses Veg values)', () => {
    const ctx = getFertilizerContext('Canna Coco A+B', '5–8 Wochen', 'Mutterpflanze');
    expect(ctx.length).toBeGreaterThan(0);
    expect(ctx).toContain('Canna Coco A+B');
  });
});

// ── isOrganicFertilizer ───────────────────────────────────────────

describe('isOrganicFertilizer()', () => {
  it('returns true for BioBizz (organic)', () => {
    expect(isOrganicFertilizer('BioBizz')).toBe(true);
  });

  it('returns false for Canna Coco A+B (mineral)', () => {
    expect(isOrganicFertilizer('Canna Coco A+B')).toBe(false);
  });

  it('returns false for Athena Pro (mineral)', () => {
    expect(isOrganicFertilizer('Athena Pro')).toBe(false);
  });

  it('returns false for unknown fertilizer', () => {
    expect(isOrganicFertilizer('Unknown Brand')).toBe(false);
  });

  it('returns false for null', () => {
    expect(isOrganicFertilizer(null)).toBe(false);
  });

  it('returns false for undefined', () => {
    expect(isOrganicFertilizer(undefined)).toBe(false);
  });

  it('returns false for empty string', () => {
    expect(isOrganicFertilizer('')).toBe(false);
  });

  it('correctly identifies all organic/hybrid fertilizers', () => {
    for (const [key, profile] of Object.entries(FERTILIZER_PROFILES)) {
      const expected = profile.type === 'organic' || profile.type === 'hybrid';
      expect(isOrganicFertilizer(key)).toBe(expected);
    }
  });
});
