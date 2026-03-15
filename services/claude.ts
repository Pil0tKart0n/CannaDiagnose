import * as FileSystem from 'expo-file-system/legacy';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { QuestionnaireData, DiagnosisResult, Severity, ContributingFactor, ActionStep } from '../types';
import { SYSTEM_PROMPT, FOLLOWUP_SYSTEM_PROMPT, REFINE_SYSTEM_PROMPT, buildUserPrompt, buildFollowUpPrompt, buildRefinePrompt } from '../constants/prompts';

const API_URL = 'https://api.anthropic.com/v1/messages';
const MODEL = 'claude-sonnet-4-6';

const MAX_RETRIES = 2;
const RETRY_DELAYS = [2000, 5000]; // ms

// Claude API resizes images internally to max 1568px.
// Resizing locally saves 80-90% upload time with zero quality loss.
const MAX_IMAGE_DIMENSION = 1568;

/**
 * Resize an image so its longest side is at most MAX_IMAGE_DIMENSION pixels.
 * Returns the URI of the resized image (JPEG, quality 0.95 for minimal loss).
 */
async function optimizeImage(uri: string): Promise<string> {
  try {
    // Get original dimensions via manipulateAsync with no actions
    const probe = await manipulateAsync(uri, []);
    const { width, height } = probe;

    // Skip resize if already small enough
    if (width <= MAX_IMAGE_DIMENSION && height <= MAX_IMAGE_DIMENSION) {
      // Still convert to JPEG for consistent format & slight compression
      const result = await manipulateAsync(uri, [], {
        compress: 0.95,
        format: SaveFormat.JPEG,
      });
      return result.uri;
    }

    // Calculate resize dimensions (maintain aspect ratio)
    const scale = MAX_IMAGE_DIMENSION / Math.max(width, height);
    const newWidth = Math.round(width * scale);
    const newHeight = Math.round(height * scale);

    const result = await manipulateAsync(
      uri,
      [{ resize: { width: newWidth, height: newHeight } }],
      { compress: 0.95, format: SaveFormat.JPEG },
    );

    console.log(`[CannaDiagnose] Image resized: ${width}x${height} → ${newWidth}x${newHeight}`);
    return result.uri;
  } catch (err) {
    console.log('[CannaDiagnose] Image optimize failed, using original:', err);
    return uri; // Fallback: use original
  }
}

// ---------------------------------------------------------------------------
// Connectivity check
// ---------------------------------------------------------------------------

export async function checkConnectivity(): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    await fetch('https://api.anthropic.com', {
      method: 'HEAD',
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
  return v
    .filter((item): item is ContributingFactor =>
      typeof item === 'object' &&
      item !== null &&
      typeof item.factor === 'string' &&
      typeof item.impact === 'string'
    );
}

function ensureActionPlan(v: unknown): ActionStep[] {
  if (!Array.isArray(v)) return [];
  return v
    .filter((item): item is ActionStep =>
      typeof item === 'object' &&
      item !== null &&
      typeof item.priority === 'number' &&
      typeof item.action === 'string' &&
      typeof item.details === 'string'
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
      if (isNaN(c)) return 0.75;
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
    followUpDays:
      typeof data.followUpDays === 'number' && data.followUpDays > 0
        ? data.followUpDays
        : 7,
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

export type ApiErrorType = 'network' | 'rate_limit' | 'server' | 'auth' | 'parse' | 'unknown';

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
    msg.includes('fetch') && msg.includes('fail') ||
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

  // Auth
  if (statusCode === 401 || statusCode === 403) {
    return { type: 'auth', message: 'API-Authentifizierung fehlgeschlagen.', retryable: false };
  }

  // Parse errors
  if (msg.includes('JSON') || msg.includes('verarbeitet')) {
    return { type: 'parse', message: 'Antwort konnte nicht verarbeitet werden.', retryable: true };
  }

  return { type: 'unknown', message: msg || 'Ein unbekannter Fehler ist aufgetreten.', retryable: true };
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
): Promise<AnalyzeResult> {
  const apiKey = process.env.EXPO_PUBLIC_CLAUDE_API_KEY;
  if (!apiKey) {
    throw new Error(
      'API Key nicht konfiguriert. Bitte setze EXPO_PUBLIC_CLAUDE_API_KEY in der .env Datei.'
    );
  }

  // Normalize to array (backward compatible with single string)
  const uris = Array.isArray(imageUris) ? imageUris : [imageUris];

  // Connectivity check
  const online = await checkConnectivity();
  if (!online) {
    const err: any = new Error('Kein Internet');
    err.apiError = {
      type: 'network' as ApiErrorType,
      message: 'Keine Internetverbindung. Bitte prüfe dein WLAN oder mobile Daten.',
      retryable: true,
    } satisfies ApiError;
    throw err;
  }

  // Optimize images (resize to max 1568px) then read as base64
  const optimizedUris = await Promise.all(uris.map(optimizeImage));
  const base64Results = await Promise.all(
    optimizedUris.map((uri) =>
      FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      })
    )
  );

  // Build image content blocks (all optimized to JPEG)
  const imageBlocks = base64Results.map((data) => ({
    type: 'image' as const,
    source: {
      type: 'base64' as const,
      media_type: 'image/jpeg' as const,
      data,
    },
  }));

  let userPrompt: string;
  let systemPrompt: string;

  if (options?.isFollowUp && options.previousResult && options.previousDate) {
    const daysSince = Math.round(
      (Date.now() - new Date(options.previousDate).getTime()) / 86400000
    );
    userPrompt = buildFollowUpPrompt(questionnaire, options.previousResult, daysSince);
    systemPrompt = FOLLOWUP_SYSTEM_PROMPT;
  } else {
    userPrompt = buildUserPrompt(questionnaire);
    systemPrompt = SYSTEM_PROMPT;
  }

  const maxAttempts = 1 + MAX_RETRIES; // 3 total
  let lastError: any = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    // Notify caller about which attempt we're on
    onAttempt?.(attempt, maxAttempts);

    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: MODEL,
          max_tokens: 2048,
          system: systemPrompt,
          messages: [
            {
              role: 'user',
              content: [
                ...imageBlocks,
                {
                  type: 'text',
                  text: userPrompt,
                },
              ],
            },
          ],
        }),
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
      const content = data.content?.[0]?.text;

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
      console.log('[CannaDiagnose] Raw API response:', content.substring(0, 500));
      const parsed = extractJSON(content);
      console.log('[CannaDiagnose] Parsed JSON:', JSON.stringify(parsed).substring(0, 500));
      const validated = validateDiagnosisResult(parsed);
      console.log('[CannaDiagnose] Validated result:', JSON.stringify(validated).substring(0, 500));
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
): Promise<DiagnosisResult> {
  const apiKey = process.env.EXPO_PUBLIC_CLAUDE_API_KEY;
  if (!apiKey) {
    throw new Error('API Key nicht konfiguriert.');
  }

  const uris = Array.isArray(imageUris) ? imageUris : [imageUris];

  const online = await checkConnectivity();
  if (!online) {
    throw new Error('Keine Internetverbindung.');
  }

  // Optimize images (resize to max 1568px) then read as base64
  const optimizedUris = await Promise.all(uris.map(optimizeImage));
  const base64Results = await Promise.all(
    optimizedUris.map((uri) =>
      FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      })
    )
  );

  const imageBlocks = base64Results.map((data) => ({
    type: 'image' as const,
    source: {
      type: 'base64' as const,
      media_type: 'image/jpeg' as const,
      data,
    },
  }));

  const userPrompt = buildRefinePrompt(previousResult, substrateType, phValue, ecValue, fertilizerType, plantAge);

  // Try up to 2 times
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: MODEL,
          max_tokens: 4096,
          system: REFINE_SYSTEM_PROMPT,
          messages: [
            {
              role: 'user',
              content: [
                ...imageBlocks,
                { type: 'text', text: userPrompt },
              ],
            },
          ],
        }),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        console.log('[CannaDiagnose] Refine API error:', response.status, errorBody.substring(0, 300));
        if (attempt < 2) { await delay(2000); continue; }
        throw new Error('API Fehler: ' + response.status);
      }

      const data = await response.json();
      const content = data.content?.[0]?.text;
      console.log('[CannaDiagnose] Refine raw response:', content?.substring(0, 500));

      if (!content) {
        if (attempt < 2) { await delay(2000); continue; }
        throw new Error('Keine Antwort von der API erhalten.');
      }

      // Check if response was truncated (stop_reason !== 'end_turn')
      const stopReason = data.stop_reason;
      console.log('[CannaDiagnose] Refine stop_reason:', stopReason);

      const parsed = extractJSON(content);
      let result = validateDiagnosisResult(parsed);

      // Post-processing: strip lockout nonsense when pH is optimal
      result = postProcessRefineResult(result, substrateType, phValue);

      return result;
    } catch (err: any) {
      console.log('[CannaDiagnose] Refine attempt', attempt, 'failed:', err.message);
      if (attempt < 2) { await delay(2000); continue; }
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
): DiagnosisResult {
  if (!phValue || !substrateType) return result;

  const phNum = parseFloat(phValue.replace(',', '.'));
  if (isNaN(phNum)) return result;

  const sub = (substrateType || '').toLowerCase();
  const isKokosOrHydro = sub.includes('kokos') || sub.includes('coco') || sub.includes('hydro') || sub.includes('dwc') || sub.includes('aero');

  // Check if pH is optimal
  const phOptimal = isKokosOrHydro
    ? (phNum >= 5.8 && phNum <= 6.2)
    : (phNum >= 6.0 && phNum <= 7.0);

  if (!phOptimal) return result; // pH is not optimal, warnings may be valid

  // pH is optimal → NO negative pH mentions allowed
  // Catch: lockout, einschränken, grenzwertig, zu niedrig, unteres Ende, etc.
  const negativePHPatterns = /lockout|einschränk|grenzwertig|zu niedrig|unteres ende|am minimum|knapp|begünstigt.*lockout|mg\/ca.*aufnahme|ca\/mg.*aufnahme|kationen.*aufnahme.*einschränk/i;

  const hasBadPH = (text: string): boolean => negativePHPatterns.test(text);

  const cleanText = (text: string): string => {
    // Remove sentences that negatively mention pH when it's optimal
    const sentences = text.split(/(?<=[.!?])\s+/);
    const cleaned = sentences.filter(sentence => {
      // Only filter sentences that mention pH AND have negative patterns
      const mentionsPH = /ph\s*[\d.,]|ph-|ph\s+von|ph\s+wert|ph\s+ist/i.test(sentence);
      if (mentionsPH && hasBadPH(sentence)) return false;
      // Also filter pure lockout sentences
      if (/lockout/i.test(sentence)) return false;
      return true;
    });
    return cleaned.join(' ').replace(/\s{2,}/g, ' ').trim();
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
  result.contributingFactors = result.contributingFactors.filter(f => {
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

  console.log('[CannaDiagnose] Post-processed: removed negative pH mentions (pH ' + phValue + ' is optimal)');

  return result;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
