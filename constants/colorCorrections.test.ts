import { describe, it, expect } from 'vitest';
import { KNOWN_COLORS, applyColorCorrection, ColorCorrection } from './colorCorrections';
import { DiagnosisResult } from '../types';

describe('KNOWN_COLORS', () => {
  it('has exactly 9 entries', () => {
    expect(KNOWN_COLORS).toHaveLength(9);
  });

  it('each entry has label, keywords, and correction', () => {
    for (const color of KNOWN_COLORS) {
      expect(typeof color.label).toBe('string');
      expect(color.label.length).toBeGreaterThan(0);

      expect(Array.isArray(color.keywords)).toBe(true);
      expect(color.keywords.length).toBeGreaterThan(0);

      expect(color.correction).toBeDefined();
      expect(typeof color.correction.diagnosis).toBe('string');
      expect(color.correction.diagnosis.length).toBeGreaterThan(0);
      expect(typeof color.correction.explanation).toBe('string');
      expect(color.correction.explanation.length).toBeGreaterThan(0);
      expect(['niedrig', 'mittel', 'hoch', 'kritisch']).toContain(color.correction.severity);
    }
  });

  it('all keywords are lowercase strings', () => {
    for (const color of KNOWN_COLORS) {
      for (const kw of color.keywords) {
        expect(typeof kw).toBe('string');
        expect(kw).toBe(kw.toLowerCase());
      }
    }
  });

  it('contains expected color labels', () => {
    const labels = KNOWN_COLORS.map((c) => c.label);
    expect(labels).toContain('Hellgrün');
    expect(labels).toContain('Gelb (gleichmäßig)');
    expect(labels).toContain('Gelb (Adern grün)');
    expect(labels).toContain('Violett / Purpur');
    expect(labels).toContain('Braun / Trocken');
    expect(labels).toContain('Weiß / Bleich');
    expect(labels).toContain('Dunkelgrün');
    expect(labels).toContain('Rot / Rötlich');
    expect(labels).toContain('Silbrig / Glänzend');
  });
});

describe('applyColorCorrection()', () => {
  const mockResult: DiagnosisResult = {
    primaryDiagnosis: 'Unbekanntes Problem',
    rootCauseAnalysis: 'Analyse läuft',
    severity: 'niedrig',
    confidence: 0.5,
    contributingFactors: [{ factor: 'Licht', impact: 'gering' }],
    actionPlan: [{ priority: 1, action: 'Prüfen', details: 'Details' }],
    preventiveTips: ['Tipp 1'],
    followUpDays: 7,
  };

  it('overrides primaryDiagnosis with the color correction', () => {
    const color = KNOWN_COLORS[0]; // Hellgrün
    const result = applyColorCorrection(color, mockResult);
    expect(result.primaryDiagnosis).toBe(color.correction.diagnosis);
  });

  it('includes original diagnosis in rootCauseAnalysis', () => {
    const color = KNOWN_COLORS[0];
    const result = applyColorCorrection(color, mockResult);
    expect(result.rootCauseAnalysis).toContain('Ursprüngliche Diagnose: Unbekanntes Problem');
    expect(result.rootCauseAnalysis).toContain(color.correction.explanation);
  });

  it('overrides severity with the color correction severity', () => {
    const color = KNOWN_COLORS[1]; // Gelb, severity hoch
    const result = applyColorCorrection(color, mockResult);
    expect(result.severity).toBe('hoch');
  });

  it('sets confidence to at least 0.80', () => {
    const color = KNOWN_COLORS[0];
    const lowConfResult = { ...mockResult, confidence: 0.3 };
    const result = applyColorCorrection(color, lowConfResult);
    expect(result.confidence).toBe(0.8);
  });

  it('preserves confidence if already above 0.80', () => {
    const color = KNOWN_COLORS[0];
    const highConfResult = { ...mockResult, confidence: 0.95 };
    const result = applyColorCorrection(color, highConfResult);
    expect(result.confidence).toBe(0.95);
  });

  it('preserves other fields from the original result', () => {
    const color = KNOWN_COLORS[0];
    const result = applyColorCorrection(color, mockResult);
    expect(result.contributingFactors).toEqual(mockResult.contributingFactors);
    expect(result.actionPlan).toEqual(mockResult.actionPlan);
    expect(result.preventiveTips).toEqual(mockResult.preventiveTips);
    expect(result.followUpDays).toBe(7);
  });

  it('works with every known color without throwing', () => {
    for (const color of KNOWN_COLORS) {
      const result = applyColorCorrection(color, mockResult);
      expect(result.primaryDiagnosis).toBe(color.correction.diagnosis);
      expect(result.severity).toBe(color.correction.severity);
      expect(result.confidence).toBeGreaterThanOrEqual(0.8);
    }
  });
});
