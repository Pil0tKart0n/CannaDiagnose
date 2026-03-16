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
    return uri.split(',')[1];
  }

  // Web: blob URI or http URI → fetch + FileReader
  const response = await fetch(uri);
  const blob = await response.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      resolve(result.split(',')[1]); // strip "data:...;base64," prefix
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
