import { Platform } from 'react-native';
import { QuestionnaireData, DiagnosisResult, Severity, ContributingFactor, ActionStep } from '../types';
import { optimizeImage, cachedReadAsBase64 } from './imageOptimization';

// Re-export extracted modules so existing imports like `from '../services/claude'` keep working
export { optimizeImage, cachedReadAsBase64, clearImageCache } from './imageOptimization';
export { initReferenceImages, verifyDiagnosis } from './referenceImages';

// Prompts are now server-side only — client sends structured data

// ALL platforms route through our Express /api/scan proxy (server holds the API key).
// Never expose the API key to the client — prevents paywall bypass via APK extraction.
const SERVER_URL = process.env.EXPO_PUBLIC_API_PROXY_URL || 'https://leafscan.de';
const API_URL = Platform.OS === 'web' ? '/api/scan' : `${SERVER_URL}/api/scan`;
const VALIDATE_URL = Platform.OS === 'web' ? '/api/validate' : `${SERVER_URL}/api/validate`;
// gpt-4o has vastly better image analysis and instruction following than gpt-4o-mini.
// Cost is higher but diagnosis accuracy improves significantly (~30-40% fewer misdiagnoses).
const _MODEL = 'gpt-4o';

const MAX_RETRIES = 2;
const RETRY_DELAYS = [2000, 5000]; // ms

/** Build fetch headers — include session token for premium check */
function apiHeaders(sessionToken?: string | null): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  // Native app detection is done server-side via missing Origin header
  if (sessionToken) {
    headers['Authorization'] = `Bearer ${sessionToken}`;
  } else if (Platform.OS === 'web' && typeof window !== 'undefined') {
    // Web fallback: read from localStorage directly
    try {
      const raw = window.localStorage.getItem('leafscan_session_token');
      if (raw) {
        headers['Authorization'] = `Bearer ${raw}`;
      }
    } catch {}
  }
  return headers;
}

// ---------------------------------------------------------------------------
// Connectivity check
// ---------------------------------------------------------------------------

export async function checkConnectivity(): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    // Check connectivity via our server (not OpenAI directly)
    const healthUrl = Platform.OS === 'web' ? '/api/health' : `${SERVER_URL}/api/health`;
    await fetch(healthUrl, {
      method: 'GET',
      signal: controller.signal,
    });
    clearTimeout(timeout);
    return true;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Validation helpers
// ---------------------------------------------------------------------------

function isValidSeverity(v: unknown): v is Severity {
  return typeof v === 'string' && ['niedrig', 'mittel', 'hoch', 'kritisch'].includes(v);
}

function ensureContributingFactors(v: unknown): ContributingFactor[] {
  if (!Array.isArray(v)) return [];
  return v.filter(
    (item): item is ContributingFactor =>
      typeof item === 'object' && item !== null && typeof item.factor === 'string' && typeof item.impact === 'string',
  );
}

function ensureActionPlan(v: unknown): ActionStep[] {
  if (!Array.isArray(v)) return [];
  return v.filter(
    (item): item is ActionStep =>
      typeof item === 'object' &&
      item !== null &&
      typeof item.priority === 'number' &&
      typeof item.action === 'string' &&
      typeof item.details === 'string',
  );
}

function ensureStringArray(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.filter((s): s is string => typeof s === 'string');
}

export function validateDiagnosisResult(data: any): DiagnosisResult {
  if (typeof data !== 'object' || data === null) {
    throw new Error('Antwort ist kein gültiges Objekt.');
  }

  const result: DiagnosisResult = {
    severity: isValidSeverity(data.severity) ? data.severity : 'mittel',
    primaryDiagnosis:
      typeof data.primaryDiagnosis === 'string' && data.primaryDiagnosis.length > 0
        ? data.primaryDiagnosis
        : 'Diagnose nicht verfügbar',
    confidence: (() => {
      const c = Number(data.confidence);
      if (isNaN(c)) return 0.5;
      // Normalize: if value > 1, assume 0-100 scale and convert to 0-1
      if (c > 1) return Math.min(c / 100, 1);
      return Math.max(0, Math.min(c, 1));
    })(),
    rootCauseAnalysis:
      typeof data.rootCauseAnalysis === 'string' && data.rootCauseAnalysis.length > 0
        ? data.rootCauseAnalysis
        : 'Keine Ursachenanalyse verfügbar.',
    contributingFactors: ensureContributingFactors(data.contributingFactors),
    actionPlan: ensureActionPlan(data.actionPlan),
    preventiveTips: ensureStringArray(data.preventiveTips),
    followUpDays: typeof data.followUpDays === 'number' && data.followUpDays > 0 ? data.followUpDays : 7,
    category:
      typeof data.category === 'string' &&
      ['nutrient_deficiency', 'abiotic_stress', 'pest', 'disease', 'physiological'].includes(data.category)
        ? (data.category as DiagnosisResult['category'])
        : undefined,
    requiresHumanReview: typeof data.requiresHumanReview === 'boolean' ? data.requiresHumanReview : undefined,
  };

  // Ensure at least one contributing factor if empty
  if (result.contributingFactors.length === 0) {
    result.contributingFactors = [{ factor: 'Unbekannt', impact: 'Weitere Beobachtung nötig' }];
  }

  // Ensure at least one action step if empty
  if (result.actionPlan.length === 0) {
    result.actionPlan = [
      { priority: 1, action: 'Pflanze beobachten', details: 'Weitere Symptome dokumentieren und erneut analysieren.' },
    ];
  }

  // Ensure at least one preventive tip if empty
  if (result.preventiveTips.length === 0) {
    result.preventiveTips = ['Regelmäßig pH- und EC-Werte kontrollieren.'];
  }

  return result;
}

// ---------------------------------------------------------------------------
// JSON extraction from Claude response
// ---------------------------------------------------------------------------

function extractJSON(content: string): any {
  let jsonStr = content.trim();

  // Strip markdown code fences
  if (jsonStr.startsWith('```')) {
    jsonStr = jsonStr.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
  }

  // Try direct parse first
  try {
    return JSON.parse(jsonStr);
  } catch {
    // noop – try recovery below
  }

  // Try to find the first { ... } block in the text
  const firstBrace = jsonStr.indexOf('{');
  const lastBrace = jsonStr.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    try {
      return JSON.parse(jsonStr.substring(firstBrace, lastBrace + 1));
    } catch {
      // noop
    }
  }

  throw new Error('Diagnose konnte nicht verarbeitet werden – ungültiges JSON.');
}

// ---------------------------------------------------------------------------
// Error classification
// ---------------------------------------------------------------------------

export type ApiErrorType = 'network' | 'rate_limit' | 'server' | 'auth' | 'parse' | 'no_plant' | 'unknown';

export interface ApiError {
  type: ApiErrorType;
  message: string;
  retryable: boolean;
}

function classifyError(err: any, statusCode?: number): ApiError {
  const msg = err?.message ?? String(err);

  // Network / fetch failures
  if (
    msg.includes('Network request failed') ||
    msg.includes('Failed to fetch') ||
    (msg.includes('fetch') && msg.includes('fail')) ||
    msg.includes('AbortError') ||
    msg.includes('network') ||
    msg.includes('Kein Internet')
  ) {
    return { type: 'network', message: 'Keine Internetverbindung. Bitte prüfe dein Netzwerk.', retryable: true };
  }

  // Rate limit
  if (statusCode === 429) {
    return { type: 'rate_limit', message: 'Zu viele Anfragen. Bitte warte einen Moment.', retryable: true };
  }

  // Server errors
  if (statusCode && statusCode >= 500) {
    return { type: 'server', message: 'Server-Fehler. Bitte versuche es erneut.', retryable: true };
  }

  // Quota exceeded (server returns 403 with quota_exceeded)
  if (statusCode === 403) {
    return {
      type: 'rate_limit',
      message: 'Tageslimit erreicht. Upgrade auf Premium für unbegrenzte Diagnosen.',
      retryable: false,
    };
  }

  // Auth
  if (statusCode === 401) {
    return { type: 'auth', message: 'API-Authentifizierung fehlgeschlagen.', retryable: false };
  }

  // Parse errors
  if (msg.includes('JSON') || msg.includes('verarbeitet')) {
    return { type: 'parse', message: 'Antwort konnte nicht verarbeitet werden.', retryable: true };
  }

  return { type: 'unknown', message: msg || 'Ein unbekannter Fehler ist aufgetreten.', retryable: true };
}

// ---------------------------------------------------------------------------
// Image validation – quick pre-check before diagnosis
// ---------------------------------------------------------------------------

async function _validateImageIsPlant(imageDataUris: string[], sessionToken?: string | null): Promise<boolean> {
  try {
    const response = await fetch(VALIDATE_URL, {
      method: 'POST',
      headers: apiHeaders(sessionToken),
      body: JSON.stringify({
        images: imageDataUris,
      }),
    });

    if (!response.ok) return true; // fail open – don't block on validation errors

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';
    if (__DEV__) console.log('[LeafScan] Image validation response:', content);

    try {
      const parsed = JSON.parse(
        content
          .replace(/```json?\n?/g, '')
          .replace(/```/g, '')
          .trim(),
      );
      return !!parsed.isPlant;
    } catch {
      // If response contains "true" or "false" as text
      return !content.toLowerCase().includes('"isplant": false') && !content.toLowerCase().includes('"isplant":false');
    }
  } catch (err) {
    if (__DEV__) console.log('[LeafScan] Image validation error (allowing):', err);
    return true; // fail open
  }
}

// ---------------------------------------------------------------------------
// Main API function with retry
// ---------------------------------------------------------------------------

export interface AnalyzeResult {
  result: DiagnosisResult;
  attempt: number; // 1-based, which attempt succeeded
}

export async function analyzePlant(
  imageUris: string | string[],
  questionnaire: QuestionnaireData,
  options?: {
    isFollowUp?: boolean;
    previousResult?: DiagnosisResult;
    previousDate?: string;
  },
  onAttempt?: (attempt: number, maxAttempts: number) => void,
  preOptimizedImages?: string[],
): Promise<AnalyzeResult> {
  // Get session token for premium authentication (works on all platforms)
  const { getSessionToken } = require('./quota');
  const sessionToken: string | null = await getSessionToken();

  // Normalize to array (backward compatible with single string)
  const uris = Array.isArray(imageUris) ? imageUris : [imageUris];

  // Use pre-optimized images if available, otherwise optimize now
  const optimizedUris =
    preOptimizedImages && preOptimizedImages.length > 0
      ? preOptimizedImages
      : await Promise.all(uris.map(optimizeImage));
  const base64Results = await Promise.all(optimizedUris.map((uri) => cachedReadAsBase64(uri)));

  // Build image data URIs for server
  const imageDataUris = base64Results.map((data) => `data:image/jpeg;base64,${data}`);

  const maxAttempts = 1 + MAX_RETRIES; // 3 total
  let lastError: any = null;

  // Image validation is handled server-side in /api/scan to avoid PWA cache issues

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    // Notify caller about which attempt we're on
    onAttempt?.(attempt, maxAttempts);

    try {
      const scanBody: any = {
        mode: 'diagnose',
        images: imageDataUris,
        questionnaire,
      };
      if (options?.isFollowUp && options.previousResult && options.previousDate) {
        scanBody.isFollowUp = true;
        scanBody.previousResult = options.previousResult;
        scanBody.daysSince = Math.round((Date.now() - new Date(options.previousDate).getTime()) / 86400000);
      }

      const response = await fetch(API_URL, {
        method: 'POST',
        headers: apiHeaders(sessionToken),
        body: JSON.stringify(scanBody),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        const classified = classifyError(new Error(errorBody), response.status);

        if (!classified.retryable || attempt === maxAttempts) {
          const err: any = new Error(classified.message);
          err.apiError = classified;
          throw err;
        }

        lastError = classified;
        await delay(RETRY_DELAYS[attempt - 1]);
        continue;
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;

      if (!content) {
        const classified: ApiError = {
          type: 'parse',
          message: 'Keine Antwort von der API erhalten.',
          retryable: true,
        };
        if (attempt === maxAttempts) {
          const err: any = new Error(classified.message);
          err.apiError = classified;
          throw err;
        }
        lastError = classified;
        await delay(RETRY_DELAYS[attempt - 1]);
        continue;
      }

      // Parse & validate
      if (__DEV__) console.log('[LeafScan] Raw API response:', content.substring(0, 500));
      const parsed = extractJSON(content);
      if (__DEV__) console.log('[LeafScan] Parsed JSON:', JSON.stringify(parsed).substring(0, 500));

      // Check if the API detected no plant
      if (parsed.noPlant) {
        const err: any = new Error(parsed.message || 'Keine passende Pflanze erkannt.');
        err.apiError = {
          type: 'no_plant' as ApiErrorType,
          message:
            parsed.message ||
            'Auf dem Foto ist keine passende Pflanze erkennbar. Bitte lade ein Foto deiner Pflanze hoch.',
          retryable: false,
        };
        throw err;
      }

      const validated = validateDiagnosisResult(parsed);
      if (__DEV__) console.log('[LeafScan] Validated result:', JSON.stringify(validated).substring(0, 500));
      return { result: validated, attempt };
    } catch (err: any) {
      // If it already has apiError set (we threw it), check retryable
      if (err.apiError) {
        if (!err.apiError.retryable || attempt === maxAttempts) {
          throw err;
        }
        lastError = err;
        await delay(RETRY_DELAYS[attempt - 1]);
        continue;
      }

      // Classify unhandled errors
      const classified = classifyError(err);
      if (!classified.retryable || attempt === maxAttempts) {
        const wrapped: any = new Error(classified.message);
        wrapped.apiError = classified;
        throw wrapped;
      }
      lastError = err;
      await delay(RETRY_DELAYS[attempt - 1]);
      continue;
    }
  }

  // Should not reach here, but safety net
  const finalErr: any = new Error(lastError?.message ?? 'Analyse fehlgeschlagen.');
  finalErr.apiError = classifyError(lastError);
  throw finalErr;
}

export async function refineDiagnosis(
  imageUris: string | string[],
  previousResult: DiagnosisResult,
  substrateType: string | null,
  phValue: string | null,
  ecValue: string | null,
  fertilizerType?: string | null,
  plantAge?: string | null,
  growPhase?: string | null,
  preOptimizedImages?: string[],
  soilTemp?: string | null,
): Promise<DiagnosisResult> {
  const { getSessionToken } = require('./quota');
  const sessionToken: string | null = await getSessionToken();

  const uris = Array.isArray(imageUris) ? imageUris : [imageUris];

  // Use pre-optimized images if available, otherwise optimize now
  const optimizedUris =
    preOptimizedImages && preOptimizedImages.length > 0
      ? preOptimizedImages
      : await Promise.all(uris.map(optimizeImage));
  const base64Results = await Promise.all(optimizedUris.map((uri) => cachedReadAsBase64(uri)));

  const imageDataUris = base64Results.map((data) => `data:image/jpeg;base64,${data}`);

  // Try up to 2 times
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: apiHeaders(sessionToken),
        body: JSON.stringify({
          mode: 'refine',
          images: imageDataUris,
          currentDiagnosis: previousResult,
          substrate: substrateType,
          ph: phValue,
          ec: ecValue,
          fertilizer: fertilizerType,
          plantAge,
          growPhase,
          soilTemp: soilTemp || undefined,
        }),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        if (__DEV__) console.log('[LeafScan] Refine API error:', response.status, errorBody.substring(0, 300));
        if (attempt < 2) {
          await delay(2000);
          continue;
        }
        throw new Error('API Fehler: ' + response.status);
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;
      if (__DEV__) console.log('[LeafScan] Refine raw response:', content?.substring(0, 500));

      if (!content) {
        if (attempt < 2) {
          await delay(2000);
          continue;
        }
        throw new Error('Keine Antwort von der API erhalten.');
      }

      const stopReason = data.choices?.[0]?.finish_reason;
      if (__DEV__) console.log('[LeafScan] Refine finish_reason:', stopReason);

      const parsed = extractJSON(content);
      let result = validateDiagnosisResult(parsed);

      // Post-processing: strip lockout nonsense when pH is optimal
      result = postProcessRefineResult(result, substrateType, phValue, ecValue);

      return result;
    } catch (err: any) {
      if (__DEV__) console.log('[LeafScan] Refine attempt', attempt, 'failed:', err.message);
      if (attempt < 2) {
        await delay(2000);
        continue;
      }
      throw err;
    }
  }

  throw new Error('Verfeinerung fehlgeschlagen.');
}

/**
 * Post-process refine results: remove lockout mentions when pH is optimal,
 * since the AI sometimes ignores our instructions and adds lockout warnings anyway.
 */
function postProcessRefineResult(
  result: DiagnosisResult,
  substrateType: string | null,
  phValue: string | null,
  ecValue?: string | null,
): DiagnosisResult {
  if (!phValue || !substrateType) return result;

  const phNum = parseFloat(phValue.replace(',', '.'));
  if (isNaN(phNum)) return result;

  const sub = (substrateType || '').toLowerCase();
  const isKokosOrHydro =
    sub.includes('kokos') ||
    sub.includes('coco') ||
    sub.includes('hydro') ||
    sub.includes('dwc') ||
    sub.includes('aero');

  // Check if pH is optimal
  const phOptimal = isKokosOrHydro ? phNum >= 5.8 && phNum <= 6.2 : phNum >= 6.0 && phNum <= 7.0;

  if (!phOptimal) return result; // pH is not optimal, warnings may be valid

  // pH is optimal → NO negative pH mentions allowed
  // Catch: lockout, einschränken, grenzwertig, zu niedrig, unteres Ende, etc.
  const negativePHPatterns =
    /lockout|einschränk|grenzwertig|zu niedrig|unteres ende|am minimum|knapp|begünstigt.*lockout|mg\/ca.*aufnahme|ca\/mg.*aufnahme|kationen.*aufnahme.*einschränk/i;

  const hasBadPH = (text: string): boolean => negativePHPatterns.test(text);

  const cleanText = (text: string): string => {
    // Remove sentences that negatively mention pH when it's optimal
    const sentences = text.split(/(?<=[.!?])\s+/);
    const cleaned = sentences.filter((sentence) => {
      // Only filter sentences that mention pH AND have negative patterns
      const mentionsPH = /ph\s*[\d.,]|ph-|ph\s+von|ph\s+wert|ph\s+ist/i.test(sentence);
      if (mentionsPH && hasBadPH(sentence)) return false;
      // Also filter pure lockout sentences
      if (/lockout/i.test(sentence)) return false;
      return true;
    });
    return cleaned
      .join(' ')
      .replace(/\s{2,}/g, ' ')
      .trim();
  };

  // Clean primary diagnosis
  if (hasBadPH(result.primaryDiagnosis)) {
    // Remove the pH part from primary diagnosis
    result.primaryDiagnosis = result.primaryDiagnosis
      .replace(/,?\s*kombiniert mit[^.]*pH[^.]*\./i, '.')
      .replace(/,?\s*kombiniert mit[^.]*pH[^,]*/i, '')
      .replace(/,?\s*(?:und|wobei|zusätzlich)[^.]*pH[^.]*einschränk[^.]*\.?/i, '.')
      .replace(/\s{2,}/g, ' ')
      .replace(/\.\./g, '.')
      .trim();
  }

  // Clean root cause analysis
  if (hasBadPH(result.rootCauseAnalysis)) {
    result.rootCauseAnalysis = cleanText(result.rootCauseAnalysis);
  }

  // Clean contributing factors - remove any factor that negatively mentions pH
  result.contributingFactors = result.contributingFactors.filter((f) => {
    const factorText = f.factor + ' ' + f.impact;
    // Remove factors about pH being problematic when it's optimal
    if (/ph/i.test(f.factor) && hasBadPH(factorText)) return false;
    if (/lockout/i.test(factorText)) return false;
    return true;
  });

  // Ensure we still have contributing factors
  if (result.contributingFactors.length === 0) {
    result.contributingFactors = [{ factor: 'Weitere Beobachtung', impact: 'Symptome nach EC-Korrektur beobachten' }];
  }

  // Post-process: strip EC-problem mentions when EC is optimal
  const ecNum = ecValue ? parseFloat(ecValue.replace(',', '.')) : NaN;
  if (!isNaN(ecNum)) {
    // Check if EC is in a reasonable range (not too high, not too low)
    // We already have evaluateEC logic in prompts.ts, here we just check for obvious contradictions
    const negativeECPatterns = /ec.*zu hoch|ec.*zu niedrig|überdüng|nährstoffbrand|ec.*problem|ec.*grenzwertig/i;
    // Only clean if the refine prompt already said EC is OK
    const ecOkInPrompt =
      result.rootCauseAnalysis.includes('EC ist NICHT das Problem') || result.rootCauseAnalysis.includes('EC liegt IM');
    if (ecOkInPrompt) {
      // Remove sentences that claim EC is problematic when it's in range
      const cleanECText = (text: string): string => {
        const sentences = text.split(/(?<=[.!?])\s+/);
        return sentences
          .filter((s) => !negativeECPatterns.test(s))
          .join(' ')
          .replace(/\s{2,}/g, ' ')
          .trim();
      };
      if (negativeECPatterns.test(result.rootCauseAnalysis)) {
        result.rootCauseAnalysis = cleanECText(result.rootCauseAnalysis);
      }
      result.contributingFactors = result.contributingFactors.filter((f) => {
        const text = f.factor + ' ' + f.impact;
        return !negativeECPatterns.test(text);
      });
      if (result.contributingFactors.length === 0) {
        result.contributingFactors = [{ factor: 'Weitere Beobachtung', impact: 'Symptome beobachten' }];
      }
    }
  }

  // Confidence floor: never return below 0.3 for a refined diagnosis
  if (result.confidence < 0.3) {
    result.confidence = 0.3;
  }

  if (__DEV__) console.log('[LeafScan] Post-processed: removed negative pH mentions (pH ' + phValue + ' is optimal)');

  return result;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
