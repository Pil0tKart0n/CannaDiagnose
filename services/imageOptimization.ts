import { Platform } from 'react-native';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { readAsBase64 } from './fileSystemWeb';

// Claude API resizes images internally to max 1568px.
// Resizing locally saves 80-90% upload time with zero quality loss.
const MAX_IMAGE_DIMENSION = 1568;

// Cache base64 conversions to avoid re-reading the same file multiple times
// (validation call, main diagnosis, verification all need the same base64)
// Limit to 3 entries (= max photos per scan) to keep memory bounded (~6-15 MB)
const MAX_CACHE_ENTRIES = 3;
const base64Cache = new Map<string, string>();

export async function cachedReadAsBase64(uri: string): Promise<string> {
  const cached = base64Cache.get(uri);
  if (cached) return cached;
  const data = await readAsBase64(uri);
  // Evict oldest entries before adding new one
  while (base64Cache.size >= MAX_CACHE_ENTRIES) {
    const firstKey = base64Cache.keys().next().value;
    if (firstKey) base64Cache.delete(firstKey);
    else break;
  }
  base64Cache.set(uri, data);
  return data;
}

/** Clear base64 cache (call after diagnosis flow completes) */
export function clearImageCache(): void {
  base64Cache.clear();
}

/**
 * Resize an image so its longest side is at most MAX_IMAGE_DIMENSION pixels.
 * Returns the URI of the resized image (JPEG, quality 0.95 for minimal loss).
 */
export async function optimizeImage(uri: string): Promise<string> {
  // On web, expo-image-manipulator can be unreliable — use Canvas API for resizing
  if (Platform.OS === 'web') {
    try {
      return await optimizeImageWeb(uri);
    } catch (err) {
      if (__DEV__) console.log('[LeafScan] Web image optimize failed, using original:', err);
      return uri;
    }
  }

  try {
    // Get original dimensions via manipulateAsync with no actions
    const probe = await manipulateAsync(uri, []);
    const { width, height } = probe;

    // Skip resize if already small enough
    if (width <= MAX_IMAGE_DIMENSION && height <= MAX_IMAGE_DIMENSION) {
      // Still convert to JPEG for consistent format & slight compression
      const result = await manipulateAsync(uri, [], {
        compress: 0.85,
        format: SaveFormat.JPEG,
      });
      return result.uri;
    }

    // Calculate resize dimensions (maintain aspect ratio)
    const scale = MAX_IMAGE_DIMENSION / Math.max(width, height);
    const newWidth = Math.round(width * scale);
    const newHeight = Math.round(height * scale);

    const result = await manipulateAsync(uri, [{ resize: { width: newWidth, height: newHeight } }], {
      compress: 0.85,
      format: SaveFormat.JPEG,
    });

    console.log(`[LeafScan] Image resized: ${width}x${height} → ${newWidth}x${newHeight}`);
    return result.uri;
  } catch (err) {
    if (__DEV__) console.log('[LeafScan] Image optimize failed, using original:', err);
    return uri; // Fallback: use original
  }
}

/** Web-native image optimization using Canvas API */
async function optimizeImageWeb(uri: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      let { width, height } = img;
      if (width > MAX_IMAGE_DIMENSION || height > MAX_IMAGE_DIMENSION) {
        const scale = MAX_IMAGE_DIMENSION / Math.max(width, height);
        width = Math.round(width * scale);
        height = Math.round(height * scale);
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('No canvas context'));
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
      console.log(`[LeafScan] Web image resized: ${img.naturalWidth}x${img.naturalHeight} → ${width}x${height}`);
      resolve(dataUrl);
    };
    img.onerror = () => reject(new Error('Image load failed'));
    img.src = uri;
  });
}
