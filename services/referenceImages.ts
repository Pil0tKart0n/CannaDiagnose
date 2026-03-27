import * as FileSystem from 'expo-file-system/legacy';
import { Platform } from 'react-native';
import { Asset } from 'expo-asset';
import referenceImageRegistry from '../assets/reference_images/registry';
import { DiagnosisResult } from '../types';

let _refImagesInitialized = false;

/**
 * Copies bundled reference images to documentDirectory on first launch.
 * Safe to call multiple times — no-ops after first successful run.
 */
export async function initReferenceImages(): Promise<void> {
  if (Platform.OS === 'web') {
    _refImagesInitialized = true;
    return;
  }
  if (_refImagesInitialized) return;

  const markerFile = `${FileSystem.documentDirectory}reference_images/.initialized`;
  const markerInfo = await FileSystem.getInfoAsync(markerFile);
  if (markerInfo.exists) {
    _refImagesInitialized = true;
    if (__DEV__) console.log('[LeafScan] Reference images already initialized');
    return;
  }

  if (__DEV__) console.log('[LeafScan] Initializing reference images...');

  // Ensure base directory exists
  await FileSystem.makeDirectoryAsync(`${FileSystem.documentDirectory}reference_images`, { intermediates: true });

  // Group registry by folder to create subdirectories
  const folders = new Set(referenceImageRegistry.map((r) => r.folder));
  for (const folder of folders) {
    await FileSystem.makeDirectoryAsync(`${FileSystem.documentDirectory}reference_images/${folder}`, {
      intermediates: true,
    });
  }

  // Download each asset to documentDirectory
  for (const entry of referenceImageRegistry) {
    try {
      const [asset] = await Asset.loadAsync(entry.asset);
      if (asset.localUri) {
        const destPath = `${FileSystem.documentDirectory}reference_images/${entry.folder}/${entry.file}`;
        await FileSystem.copyAsync({ from: asset.localUri, to: destPath });
      }
    } catch (err: unknown) {
      console.warn(`[LeafScan] Failed to copy ${entry.folder}/${entry.file}:`, (err as Error).message);
    }
  }

  // Write marker so we don't re-copy next time
  await FileSystem.writeAsStringAsync(markerFile, new Date().toISOString());
  _refImagesInitialized = true;
  if (__DEV__) console.log('[LeafScan] Reference images initialized:', referenceImageRegistry.length, 'files');
}

/**
 * Maps a diagnosis string to the reference image folder name.
 */
function diagnosisToRefFolder(diagnosis: string): string | null {
  const d = diagnosis.toLowerCase();
  if (d.includes('stickstoff') && (d.includes('überschuss') || d.includes('toxiz'))) return null;
  if (d.includes('stickstoff') || d.includes('nitrogen') || d.includes('n-mangel') || d.includes('(n)'))
    return 'N_mangel';
  if (d.includes('phosphor') || d.includes('(p)') || d.includes('p-mangel')) return 'P_mangel';
  if (d.includes('kalium') || d.includes('potassium') || d.includes('(k)') || d.includes('k-mangel')) return 'K_mangel';
  if (d.includes('kalzium') || d.includes('calcium') || d.includes('(ca)') || d.includes('ca-mangel'))
    return 'Ca_mangel';
  if (d.includes('magnesium') || d.includes('(mg)') || d.includes('mg-mangel')) return 'Mg_mangel';
  if (d.includes('schwefel') || d.includes('sulfur') || d.includes('(s)') || d.includes('s-mangel')) return 'S_mangel';
  if (d.includes('eisen') || d.includes('iron') || d.includes('(fe)') || d.includes('fe-mangel')) return 'Fe_mangel';
  if (d.includes('mangan') || d.includes('manganese') || d.includes('(mn)') || d.includes('mn-mangel'))
    return 'Mn_mangel';
  if (d.includes('zink') || d.includes('zinc') || d.includes('(zn)') || d.includes('zn-mangel')) return 'Zn_mangel';
  if (d.includes('bor') || d.includes('boron') || d.includes('b-mangel')) return 'B_mangel';
  if (d.includes('kupfer') || d.includes('copper') || d.includes('cu-mangel')) return 'Cu_mangel';
  if (d.includes('molybdän') || d.includes('mo-mangel')) return 'Mo_mangel';
  return null;
}

/**
 * Loads reference images for a given deficiency folder as base64 strings.
 * Returns up to 2 reference images to keep API costs low.
 * Works on both native (FileSystem) and web (fetch from public/).
 */
async function loadReferenceImages(folder: string): Promise<string[]> {
  if (Platform.OS === 'web') {
    return loadReferenceImagesWeb(folder);
  }

  const base64Images: string[] = [];
  const refDir = `${FileSystem.documentDirectory}reference_images/${folder}`;

  const dirInfo = await FileSystem.getInfoAsync(refDir);
  if (!dirInfo.exists) {
    if (__DEV__) console.log('[LeafScan] Reference folder not found:', folder);
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

/** Load reference images on web by fetching from /reference_images/ */
async function loadReferenceImagesWeb(folder: string): Promise<string[]> {
  const base64Images: string[] = [];

  for (let i = 1; i <= 2; i++) {
    try {
      const url = `/reference_images/${folder}/ref_${i}.jpg`;
      const response = await fetch(url);
      if (!response.ok) continue;
      const blob = await response.blob();
      const b64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const dataUrl = reader.result as string;
          // Strip "data:image/jpeg;base64," prefix — we only need the raw base64
          resolve(dataUrl.split(',')[1] || '');
        };
        reader.readAsDataURL(blob);
      });
      if (b64) base64Images.push(b64);
    } catch {
      // Image not available, skip
    }
  }

  if (__DEV__) console.log('[LeafScan] Web reference images loaded:', base64Images.length, 'for', folder);
  return base64Images;
}

// VERIFY_PROMPT is now server-side only

/**
 * Verifies a diagnosis by comparing the user's image with reference images.
 * Returns the original result (possibly with adjusted confidence) or null if no ref images available.
 */
export async function verifyDiagnosis(
  userImageBase64: string,
  diagnosis: DiagnosisResult,
): Promise<{ verified: boolean; confidence: number; alternative: string | null } | null> {
  const SERVER_URL = process.env.EXPO_PUBLIC_API_PROXY_URL || 'https://leafscan.de';
  const API_URL = Platform.OS === 'web' ? '/api/scan' : `${SERVER_URL}/api/scan`;

  const folder = diagnosisToRefFolder(diagnosis.primaryDiagnosis);
  if (!folder) {
    if (__DEV__) console.log('[LeafScan] No reference folder for:', diagnosis.primaryDiagnosis);
    return null;
  }

  const refImages = await loadReferenceImages(folder);
  if (refImages.length === 0) {
    if (__DEV__) console.log('[LeafScan] No reference images found for:', folder);
    return null;
  }

  const { getSessionToken } = require('./quota');
  const sessionToken: string | null = await getSessionToken();

  if (__DEV__) console.log('[LeafScan] Verifying diagnosis with', refImages.length, 'reference images for', folder);

  // Build image data URIs: user image first, then reference images
  const allImages = [
    `data:image/jpeg;base64,${userImageBase64}`,
    ...refImages.map((b64) => `data:image/jpeg;base64,${b64}`),
  ];

  /** Build fetch headers — include session token for premium check */
  function apiHeaders(token?: string | null): Record<string, string> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    } else if (Platform.OS === 'web' && typeof window !== 'undefined') {
      try {
        const raw = window.localStorage.getItem('leafscan_session_token');
        if (raw) {
          headers['Authorization'] = `Bearer ${raw}`;
        }
      } catch {}
    }
    return headers;
  }

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: apiHeaders(sessionToken),
      body: JSON.stringify({
        mode: 'verify',
        images: allImages,
        diagnosis: diagnosis.primaryDiagnosis,
      }),
    });

    if (!response.ok) {
      if (__DEV__) console.log('[LeafScan] Verify API error:', response.status);
      return null;
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) return null;

    if (__DEV__) console.log('[LeafScan] Verify response:', content.substring(0, 300));

    // Extract JSON from response
    let jsonStr = content.trim();
    if (jsonStr.startsWith('```')) {
      jsonStr = jsonStr.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
    }
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(jsonStr);
    } catch {
      const firstBrace = jsonStr.indexOf('{');
      const lastBrace = jsonStr.lastIndexOf('}');
      if (firstBrace !== -1 && lastBrace > firstBrace) {
        parsed = JSON.parse(jsonStr.substring(firstBrace, lastBrace + 1));
      } else {
        throw new Error('Invalid JSON in verify response');
      }
    }

    return {
      verified: !!parsed.verified,
      confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.5,
      alternative: (typeof parsed.alternative === 'string' ? parsed.alternative : null) as string | null,
    };
  } catch (err: unknown) {
    if (__DEV__) console.log('[LeafScan] Verify error:', (err as Error).message);
    return null;
  }
}
