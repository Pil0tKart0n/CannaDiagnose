import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform, NativeModules } from 'react-native';
import de from '../constants/translations/de.json';
import en from '../constants/translations/en.json';

const LANG_KEY = 'leafscan_language';

export type Language = 'de' | 'en';

let currentLanguage: Language = 'de';
const listeners: ((lang: Language) => void)[] = [];

const translations: Record<Language, Record<string, string>> = { de, en };

/** Get device language */
function getDeviceLanguage(): Language {
  try {
    let locale = 'de';
    if (Platform.OS === 'web' && typeof navigator !== 'undefined') {
      locale = navigator.language || 'de';
    } else if (Platform.OS === 'ios') {
      locale =
        NativeModules.SettingsManager?.settings?.AppleLocale ||
        NativeModules.SettingsManager?.settings?.AppleLanguages?.[0] ||
        'de';
    } else if (Platform.OS === 'android') {
      locale = NativeModules.I18nManager?.localeIdentifier || 'de';
    }
    return locale.startsWith('en') ? 'en' : 'de';
  } catch {
    return 'de';
  }
}

/** Initialize language from storage or device */
export async function initLanguage(): Promise<Language> {
  const stored = await AsyncStorage.getItem(LANG_KEY);
  if (stored === 'en' || stored === 'de') {
    currentLanguage = stored;
  } else {
    currentLanguage = getDeviceLanguage();
  }
  return currentLanguage;
}

/** Get current language */
export function getLang(): Language {
  return currentLanguage;
}

/** Set language and persist */
export async function setLang(lang: Language): Promise<void> {
  currentLanguage = lang;
  await AsyncStorage.setItem(LANG_KEY, lang);
  listeners.forEach((fn) => fn(lang));
}

/** Subscribe to language changes */
export function onLangChange(fn: (lang: Language) => void): () => void {
  listeners.push(fn);
  return () => {
    const idx = listeners.indexOf(fn);
    if (idx >= 0) listeners.splice(idx, 1);
  };
}

/** Get a translated string */
export function t(key: string, params?: Record<string, string | number>): string {
  let str = translations[currentLanguage]?.[key] || translations.de[key] || key;
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      str = str.replace(`{${k}}`, String(v));
    }
  }
  return str;
}
