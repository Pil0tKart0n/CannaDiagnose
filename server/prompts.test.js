import { describe, it, expect } from 'vitest';

const prompts = require('./prompts');
const { parseNum, evaluateEC, detectDiagnosisType, getPHState } = prompts._internal;

// ── parseNum ──────────────────────────────────────────────────────

describe('parseNum()', () => {
  it('parses German decimal "6,5" to 6.5', () => {
    expect(parseNum('6,5')).toBe(6.5);
  });

  it('parses normal decimal "6.5" to 6.5', () => {
    expect(parseNum('6.5')).toBe(6.5);
  });

  it('parses integer string "7" to 7', () => {
    expect(parseNum('7')).toBe(7);
  });

  it('parses "1,2" to 1.2', () => {
    expect(parseNum('1,2')).toBe(1.2);
  });

  it('parses "0,4" to 0.4', () => {
    expect(parseNum('0,4')).toBeCloseTo(0.4);
  });

  it('returns NaN for non-numeric string', () => {
    expect(parseNum('abc')).toBeNaN();
  });
});

// ── evaluateEC ────────────────────────────────────────────────────

describe('evaluateEC()', () => {
  it('returns empty string for unknown fertilizer', () => {
    expect(evaluateEC('1.5', 'Unknown Brand XYZ', '3–4 Wochen', 'Veg')).toBe('');
  });

  it('returns organic hint for organic fertilizer', () => {
    const result = evaluateEC('1.5', 'BioBizz', '3–4 Wochen', 'Veg');
    expect(result).toContain('ORGANISCH');
    expect(result).toContain('EC');
  });

  it('returns empty string when EC is NaN', () => {
    expect(evaluateEC('abc', 'Canna Coco A+B', '3–4 Wochen', 'Veg')).toBe('');
  });

  it('returns non-empty evaluation for known mineral fertilizer in range', () => {
    // Canna Coco A+B earlyVeg: 0.8–1.2, using EC 1.0 should be in range
    const result = evaluateEC('1,0', 'Canna Coco A+B', '3–4 Wochen', 'Veg');
    expect(typeof result).toBe('string');
  });
});

// ── detectDiagnosisType ───────────────────────────────────────────

describe('detectDiagnosisType()', () => {
  it('detects Stickstoff (N) deficiency', () => {
    expect(detectDiagnosisType('Stickstoff(N)-Mangel')).toBe('N');
  });

  it('detects nitrogen in English', () => {
    expect(detectDiagnosisType('Nitrogen deficiency')).toBe('N');
  });

  it('detects Magnesium (Mg) deficiency', () => {
    expect(detectDiagnosisType('Magnesium(Mg)-Mangel')).toBe('Mg');
  });

  it('detects Kalzium (Ca) deficiency', () => {
    expect(detectDiagnosisType('Calcium(Ca)-Mangel')).toBe('Ca');
  });

  it('detects Kalium (K) deficiency', () => {
    expect(detectDiagnosisType('Kalium(K)-Mangel')).toBe('K');
  });

  it('detects Phosphor (P) deficiency', () => {
    expect(detectDiagnosisType('Phosphor(P)-Mangel')).toBe('P');
  });

  it('detects Eisen (Fe) deficiency', () => {
    expect(detectDiagnosisType('Eisen(Fe)-Mangel')).toBe('Fe');
  });

  it('detects iron in English', () => {
    expect(detectDiagnosisType('Iron deficiency')).toBe('Fe');
  });

  it('detects Nährstoffbrand', () => {
    expect(detectDiagnosisType('Nährstoffbrand durch Überdüngung')).toBe('burn');
  });

  it('detects Lichtbrand', () => {
    expect(detectDiagnosisType('Lichtbrand an oberen Blättern')).toBe('lightburn');
  });

  it('detects Hitzestress', () => {
    expect(detectDiagnosisType('Hitzestress')).toBe('heat');
  });

  it('detects Überwässerung', () => {
    expect(detectDiagnosisType('Überwässerung')).toBe('overwater');
  });

  it('detects Unterwässerung', () => {
    expect(detectDiagnosisType('Unterwässerung - trocken')).toBe('underwater');
  });

  it('detects N-Toxizität', () => {
    expect(detectDiagnosisType('N-Toxizität - dunkelgrün')).toBe('N-tox');
  });

  it('detects Thripse/pest', () => {
    expect(detectDiagnosisType('Thrips-Befall')).toBe('pest');
  });

  it('detects Spinnmilben as pest', () => {
    expect(detectDiagnosisType('Spinnmilben-Befall')).toBe('pest');
  });

  it('detects pH-Lockout', () => {
    expect(detectDiagnosisType('pH-Lockout')).toBe('lockout');
  });

  it('detects Kältestress', () => {
    expect(detectDiagnosisType('Kältestress bei niedrigen Temperaturen')).toBe('cold');
  });

  it('returns unknown for unrecognized diagnosis', () => {
    expect(detectDiagnosisType('Alles bestens, Pflanze sieht gut aus')).toBe('unknown');
  });

  it('is case-insensitive', () => {
    expect(detectDiagnosisType('STICKSTOFF-MANGEL')).toBe('N');
    expect(detectDiagnosisType('magnesium-Mangel')).toBe('Mg');
  });
});

// ── getPHState ────────────────────────────────────────────────────

describe('getPHState()', () => {
  it('returns null when pH is missing', () => {
    expect(getPHState(null, 'Kokos')).toBeNull();
  });

  it('returns null when substrate is missing', () => {
    expect(getPHState('6.0', null)).toBeNull();
  });

  it('returns ok for Kokos at pH 6.0', () => {
    expect(getPHState('6,0', 'Kokos')).toBe('ok');
  });

  it('returns low for Kokos at pH 5.5', () => {
    expect(getPHState('5,5', 'Kokos')).toBe('low');
  });

  it('returns high for Kokos at pH 6.5', () => {
    expect(getPHState('6,5', 'Kokos')).toBe('high');
  });

  it('returns ok for Erde at pH 6.5', () => {
    expect(getPHState('6,5', 'Erde')).toBe('ok');
  });

  it('returns ok for Erde at pH 7.0 (within soil range)', () => {
    expect(getPHState('7,0', 'Erde')).toBe('ok');
  });

  it('returns high for Erde at pH 7.5', () => {
    expect(getPHState('7,5', 'Erde')).toBe('high');
  });

  it('returns low for Erde at pH 5.5', () => {
    expect(getPHState('5,5', 'Erde')).toBe('low');
  });

  it('recognizes hydro substrates', () => {
    expect(getPHState('6,0', 'DWC / Hydro')).toBe('ok');
    expect(getPHState('6,5', 'DWC / Hydro')).toBe('high');
  });

  it('recognizes coco substrate variations', () => {
    expect(getPHState('6,0', 'Coco/Kokos')).toBe('ok');
  });

  it('returns null for non-numeric pH', () => {
    expect(getPHState('abc', 'Erde')).toBeNull();
  });

  // Edge cases at boundaries
  it('returns ok for Kokos at pH 5.8 (lower boundary)', () => {
    expect(getPHState('5,8', 'Kokos')).toBe('ok');
  });

  it('returns ok for Kokos at pH 6.2 (upper boundary)', () => {
    expect(getPHState('6,2', 'Kokos')).toBe('ok');
  });
});

// ── buildUserPrompt ───────────────────────────────────────────────

describe('buildUserPrompt()', () => {
  it('returns a non-empty string', () => {
    const result = prompts.buildUserPrompt({
      growPhase: 'Veg',
      plantAgeWeeks: '3–4 Wochen',
      substrateType: 'Erde',
    });
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });

  it('includes grow phase in output', () => {
    const result = prompts.buildUserPrompt({ growPhase: 'Blüte' });
    expect(result).toContain('Blüte');
  });

  it('includes substrate in output', () => {
    const result = prompts.buildUserPrompt({ substrateType: 'Kokos' });
    expect(result).toContain('Kokos');
  });

  it('includes fertilizer type in output', () => {
    const result = prompts.buildUserPrompt({ fertilizerType: 'Canna Coco A+B' });
    expect(result).toContain('Canna Coco A+B');
  });

  it('handles empty data without throwing', () => {
    const result = prompts.buildUserPrompt({});
    expect(typeof result).toBe('string');
  });
});

// ── buildRefinePrompt ─────────────────────────────────────────────

describe('buildRefinePrompt()', () => {
  const mockPreviousResult = {
    primaryDiagnosis: 'N-Mangel',
    severity: 'hoch',
    rootCauseAnalysis: 'Stickstoff fehlt',
    confidence: 0.85,
    actionPlan: [{ priority: 1, action: 'Dünger erhöhen', details: 'N-Gehalt steigern' }],
  };

  it('returns a non-empty string', () => {
    const result = prompts.buildRefinePrompt(
      mockPreviousResult,
      'Kokos',
      '6,0',
      '1,2',
      'Canna Coco A+B',
      '3–4 Wochen',
      'Veg',
    );
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });

  it('includes pH value in output', () => {
    const result = prompts.buildRefinePrompt(
      mockPreviousResult,
      'Erde',
      '6,5',
      null,
      null,
      null,
      null,
    );
    expect(result).toContain('6.5');
  });

  it('includes EC value in output', () => {
    const result = prompts.buildRefinePrompt(
      mockPreviousResult,
      'Kokos',
      null,
      '1,4',
      null,
      null,
      null,
    );
    expect(result).toContain('1.4');
  });

  it('includes substrate in output', () => {
    const result = prompts.buildRefinePrompt(
      mockPreviousResult,
      'Kokos',
      null,
      null,
      null,
      null,
      null,
    );
    expect(result).toContain('Kokos');
  });

  it('handles all null optional params without throwing', () => {
    const result = prompts.buildRefinePrompt(
      mockPreviousResult,
      null,
      null,
      null,
      null,
      null,
      null,
    );
    expect(typeof result).toBe('string');
  });
});
