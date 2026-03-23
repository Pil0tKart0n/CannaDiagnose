import { Platform } from 'react-native';

/**
 * Cross-platform base64 reader.
 * Native: uses expo-file-system
 * Web: uses fetch + FileReader (handles blob: and data: URIs)
 */
export async function readAsBase64(uri: string): Promise<string> {
  if (Platform.OS !== 'web') {
    const FileSystem = require('expo-file-system/legacy');
    const base64 = await FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    return base64;
  }

  // Web: data URI → strip prefix
  if (uri.startsWith('data:')) {
    const commaIdx = uri.indexOf(',');
    if (commaIdx === -1) throw new Error('Malformed data URI');
    return uri.substring(commaIdx + 1);
  }

  // Web: blob URI or http URI → fetch + FileReader
  const response = await fetch(uri);
  const blob = await response.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      if (!result) {
        reject(new Error('FileReader returned null'));
        return;
      }
      const commaIdx = result.indexOf(',');
      resolve(commaIdx >= 0 ? result.substring(commaIdx + 1) : result);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
