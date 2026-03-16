import * as FileSystem from 'expo-file-system/legacy';
import { Platform } from 'react-native';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { QuestionnaireData, DiagnosisResult, Severity, ContributingFactor, ActionStep } from '../types';
import { SYSTEM_PROMPT, FOLLOWUP_SYSTEM_PROMPT, REFINE_SYSTEM_PROMPT, buildUserPrompt, buildFollowUpPrompt, buildRefinePrompt } from '../constants/prompts';
import { readAsBase64 } from './fileSystemWeb';

// On web (PWA), route through our proxy to protect the API key.
// On native, call OpenAI directly (key is embedded in the binary, not inspectable via browser).
const PROXY_URL = process.env.EXPO_PUBLIC_API_PROXY_URL || '';
const DIRECT_API_URL = 'https://api.openai.com/v1/chat/completions';
const API_URL = (Platform.OS === 'web' && PROXY_URL)
  ? `${PROXY_URL}/v1/chat/completions`
  : DIRECT_API_URL;
const USE_PROXY = Platform.OS === 'web' && !!PROXY_URL;
const MODEL = 'gpt-4o-mini';

const MAX_RETRIES = 2;
const RETRY_DELAYS = [2000, 5000]; // ms

/** Build fetch headers — omit Authorization when using proxy (key lives server-side) */
function apiHeaders(apiKey: string): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (!USE_PROXY) {
    headers['Authorization'] = `Bearer ${apiKey}`;
  }
  return headers;
}

// Claude API resizes images internally to max 1568px.
// Resizing locally saves 80-90% upload time with zero quality loss.
const MAX_IMAGE_DIMENSION = 1568;

/**
 * Resize an image so its longest side is at most MAX_IMAGE_DIMENSION pixels.
 * Returns the URI of the resized image (JPEG, quality 0.95 for minimal loss).
 */
export async function optimizeImage(uri: string): Promise<string> {
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

    console.log(`[LeafScan] Image resized: ${width}x${height} → ${newWidth}x${newHeight}`);
    return result.uri;
  } catch (err) {
    console.log('[LeafScan] Image optimize failed, using original:', err);
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
    await fetch('https://api.openai.com', {
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
  preOptimizedImages?: string[],
): Promise<AnalyzeResult> {
  const apiKey = process.env.EXPO_PUBLIC_OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error(
      'API Key nicht konfiguriert. Bitte setze EXPO_PUBLIC_OPENAI_API_KEY in der .env Datei.'
    );
  }

  // Normalize to array (backward compatible with single string)
  const uris = Array.isArray(imageUris) ? imageUris : [imageUris];

  // Use pre-optimized images if available, otherwise optimize now
  const optimizedUris = preOptimizedImages && preOptimizedImages.length > 0
    ? preOptimizedImages
    : await Promise.all(uris.map(optimizeImage));
  const base64Results = await Promise.all(
    optimizedUris.map((uri) => readAsBase64(uri))
  );

  // Build image content blocks for OpenAI format
  const imageBlocks = base64Results.map((data) => ({
    type: 'image_url' as const,
    image_url: {
      url: `data:image/jpeg;base64,${data}`,
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
        headers: apiHeaders(apiKey),
        body: JSON.stringify({
          model: MODEL,
          max_tokens: 1500,
          messages: [
            {
              role: 'system',
              content: systemPrompt,
            },
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
      console.log('[LeafScan] Raw API response:', content.substring(0, 500));
      const parsed = extractJSON(content);
      console.log('[LeafScan] Parsed JSON:', JSON.stringify(parsed).substring(0, 500));
      const validated = validateDiagnosisResult(parsed);
      console.log('[LeafScan] Validated result:', JSON.stringify(validated).substring(0, 500));
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
  const apiKey = process.env.EXPO_PUBLIC_OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('API Key nicht konfiguriert.');
  }

  const uris = Array.isArray(imageUris) ? imageUris : [imageUris];

  // Optimize images (resize to max 1568px) then read as base64
  const optimizedUris = await Promise.all(uris.map(optimizeImage));
  const base64Results = await Promise.all(
    optimizedUris.map((uri) => readAsBase64(uri))
  );

  const imageBlocks = base64Results.map((data) => ({
    type: 'image_url' as const,
    image_url: {
      url: `data:image/jpeg;base64,${data}`,
    },
  }));

  const userPrompt = buildRefinePrompt(previousResult, substrateType, phValue, ecValue, fertilizerType, plantAge);

  // Try up to 2 times
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: apiHeaders(apiKey),
        body: JSON.stringify({
          model: MODEL,
          max_tokens: 2048,
          messages: [
            {
              role: 'system',
              content: REFINE_SYSTEM_PROMPT,
            },
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
        console.log('[LeafScan] Refine API error:', response.status, errorBody.substring(0, 300));
        if (attempt < 2) { await delay(2000); continue; }
        throw new Error('API Fehler: ' + response.status);
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;
      console.log('[LeafScan] Refine raw response:', content?.substring(0, 500));

      if (!content) {
        if (attempt < 2) { await delay(2000); continue; }
        throw new Error('Keine Antwort von der API erhalten.');
      }

      const stopReason = data.choices?.[0]?.finish_reason;
      console.log('[LeafScan] Refine finish_reason:', stopReason);

      const parsed = extractJSON(content);
      let result = validateDiagnosisResult(parsed);

      // Post-processing: strip lockout nonsense when pH is optimal
      result = postProcessRefineResult(result, substrateType, phValue);

      return result;
    } catch (err: any) {
      console.log('[LeafScan] Refine attempt', attempt, 'failed:', err.message);
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

  console.log('[LeafScan] Post-processed: removed negative pH mentions (pH ' + phValue + ' is optimal)');

  return result;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ---------------------------------------------------------------------------
// Reference Image Verification
// ---------------------------------------------------------------------------

import { Asset } from 'expo-asset';
import referenceImageRegistry from '../assets/reference_images/registry';

let _refImagesInitialized = false;

/**
 * Copies bundled reference images to documentDirectory on first launch.
 * Safe to call multiple times — no-ops after first successful run.
 */
export async function initReferenceImages(): Promise<void> {
  if (Platform.OS === 'web') { _refImagesInitialized = true; return; }
  if (_refImagesInitialized) return;

  const markerFile = `${FileSystem.documentDirectory}reference_images/.initialized`;
  const markerInfo = await FileSystem.getInfoAsync(markerFile);
  if (markerInfo.exists) {
    _refImagesInitialized = true;
    console.log('[LeafScan] Reference images already initialized');
    return;
  }

  console.log('[LeafScan] Initializing reference images...');

  // Ensure base directory exists
  await FileSystem.makeDirectoryAsync(
    `${FileSystem.documentDirectory}reference_images`,
    { intermediates: true },
  );

  // Group registry by folder to create subdirectories
  const folders = new Set(referenceImageRegistry.map(r => r.folder));
  for (const folder of folders) {
    await FileSystem.makeDirectoryAsync(
      `${FileSystem.documentDirectory}reference_images/${folder}`,
      { intermediates: true },
    );
  }

  // Download each asset to documentDirectory
  for (const entry of referenceImageRegistry) {
    try {
      const [asset] = await Asset.loadAsync(entry.asset);
      if (asset.localUri) {
        const destPath = `${FileSystem.documentDirectory}reference_images/${entry.folder}/${entry.file}`;
        await FileSystem.copyAsync({ from: asset.localUri, to: destPath });
      }
    } catch (err: any) {
      console.log(`[LeafScan] Failed to copy ${entry.folder}/${entry.file}:`, err.message);
    }
  }

  // Write marker so we don't re-copy next time
  await FileSystem.writeAsStringAsync(markerFile, new Date().toISOString());
  _refImagesInitialized = true;
  console.log('[LeafScan] Reference images initialized:', referenceImageRegistry.length, 'files');
}

/**
 * Maps a diagnosis string to the reference image folder name.
 */
function diagnosisToRefFolder(diagnosis: string): string | null {
  const d = diagnosis.toLowerCase();
  if (d.includes('stickstoff') && (d.includes('überschuss') || d.includes('toxiz'))) return null;
  if (d.includes('stickstoff') || d.includes('nitrogen') || d.includes('n-mangel') || d.includes('(n)')) return 'N_mangel';
  if (d.includes('phosphor') || d.includes('(p)') || d.includes('p-mangel')) return 'P_mangel';
  if (d.includes('kalium') || d.includes('potassium') || d.includes('(k)') || d.includes('k-mangel')) return 'K_mangel';
  if (d.includes('kalzium') || d.includes('calcium') || d.includes('(ca)') || d.includes('ca-mangel')) return 'Ca_mangel';
  if (d.includes('magnesium') || d.includes('(mg)') || d.includes('mg-mangel')) return 'Mg_mangel';
  if (d.includes('schwefel') || d.includes('sulfur') || d.includes('(s)') || d.includes('s-mangel')) return 'S_mangel';
  if (d.includes('eisen') || d.includes('iron') || d.includes('(fe)') || d.includes('fe-mangel')) return 'Fe_mangel';
  if (d.includes('mangan') || d.includes('manganese') || d.includes('(mn)') || d.includes('mn-mangel')) return 'Mn_mangel';
  if (d.includes('zink') || d.includes('zinc') || d.includes('(zn)') || d.includes('zn-mangel')) return 'Zn_mangel';
  if (d.includes('bor') || d.includes('boron') || d.includes('(b)')) return 'B_mangel';
  if (d.includes('kupfer') || d.includes('copper') || d.includes('(cu)')) return 'Cu_mangel';
  if (d.includes('molybdän') || d.includes('(mo)')) return 'Mo_mangel';
  return null;
}

/**
 * Loads reference images for a given deficiency folder as base64 strings.
 * Returns up to 2 reference images to keep API costs low.
 */
async function loadReferenceImages(folder: string): Promise<string[]> {
  if (Platform.OS === 'web') return [];
  const base64Images: string[] = [];
  const refDir = `${FileSystem.documentDirectory}reference_images/${folder}`;

  const dirInfo = await FileSystem.getInfoAsync(refDir);
  if (!dirInfo.exists) {
    console.log('[LeafScan] Reference folder not found:', folder);
    return [];
  }

  for (let i = 1; i <= 2; i++) {
    const filePath = `${refDir}/ref_${i}.jpg`;
    const fileInfo = await FileSystem.getInfoAsync(filePath);
    if (fileInfo.exists) {
      const b64 = await FileSystem.readAsStringAsync(filePath, {
        encoding: FileSystem.EncodingType.Base64,
      });
      base64Images.push(b64);
    }
  }

  return base64Images;
}

const VERIFY_PROMPT = `Du bist ein Cannabis-Diagnose-Verifikator. Du bekommst:
1. Das Foto des Users (erstes Bild)
2. Bestätigte Referenzbilder einer bestimmten Mangelerscheinung (weitere Bilder)
3. Die vorgeschlagene Diagnose

Deine Aufgabe: Vergleiche das User-Foto mit den Referenzbildern.

Antworte NUR mit JSON:
{
  "verified": true/false,
  "confidence": 0.0-1.0,
  "reasoning": "Kurze Begründung warum das User-Foto den Referenzbildern entspricht oder nicht",
  "alternative": "Falls nicht verifiziert: welche Diagnose passt besser? Sonst null"
}`;

/**
 * Verifies a diagnosis by comparing the user's image with reference images.
 * Returns the original result (possibly with adjusted confidence) or null if no ref images available.
 */
export async function verifyDiagnosis(
  userImageBase64: string,
  diagnosis: DiagnosisResult,
): Promise<{ verified: boolean; confidence: number; alternative: string | null } | null> {
  const folder = diagnosisToRefFolder(diagnosis.primaryDiagnosis);
  if (!folder) {
    console.log('[LeafScan] No reference folder for:', diagnosis.primaryDiagnosis);
    return null;
  }

  const refImages = await loadReferenceImages(folder);
  if (refImages.length === 0) {
    console.log('[LeafScan] No reference images found for:', folder);
    return null;
  }

  const apiKey = process.env.EXPO_PUBLIC_OPENAI_API_KEY;
  if (!apiKey) return null;

  console.log('[LeafScan] Verifying diagnosis with', refImages.length, 'reference images for', folder);

  const imageBlocks = [
    // User image first
    { type: 'image_url' as const, image_url: { url: `data:image/jpeg;base64,${userImageBase64}` } },
    // Reference images
    ...refImages.map(b64 => ({
      type: 'image_url' as const,
      image_url: { url: `data:image/jpeg;base64,${b64}` },
    })),
  ];

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 300,
        messages: [
          { role: 'system', content: VERIFY_PROMPT },
          {
            role: 'user',
            content: [
              ...imageBlocks,
              { type: 'text', text: `Vorgeschlagene Diagnose: "${diagnosis.primaryDiagnosis}". Bild 1 = User-Foto. Bilder 2-${refImages.length + 1} = bestätigte Referenzbilder. Stimmt die Diagnose?` },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      console.log('[LeafScan] Verify API error:', response.status);
      return null;
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) return null;

    console.log('[LeafScan] Verify response:', content.substring(0, 300));
    const parsed = extractJSON(content);

    return {
      verified: !!parsed.verified,
      confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.5,
      alternative: parsed.alternative || null,
    };
  } catch (err: any) {
    console.log('[LeafScan] Verify error:', err.message);
    return null;
  }
}
