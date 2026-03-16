import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform, NativeModules } from 'react-native';

const LANG_KEY = 'cannadiagnose_language';

export type Language = 'de' | 'en';

let currentLanguage: Language = 'de';
const listeners: Array<(lang: Language) => void> = [];

/** Get device language */
function getDeviceLanguage(): Language {
  try {
    let locale = 'de';
    if (Platform.OS === 'web' && typeof navigator !== 'undefined') {
      locale = navigator.language || 'de';
    } else if (Platform.OS === 'ios') {
      locale = NativeModules.SettingsManager?.settings?.AppleLocale
        || NativeModules.SettingsManager?.settings?.AppleLanguages?.[0]
        || 'de';
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

// ── Translation strings ──

const translations: Record<Language, Record<string, string>> = {
  de: {
    // Home
    'home.startDiagnosis': 'Diagnose starten',
    'home.myPlants': 'Meine Pflanzen',
    'home.history': 'Verlauf',
    'home.library': 'Bibliothek',
    'home.howItWorks': "Wie funktioniert's?",
    'home.internetRequired': 'Internetverbindung erforderlich',
    'home.privacy': 'Datenschutz',

    // How it works modal
    'modal.howTitle': "So funktioniert's",
    'modal.howText': 'Mach ein Foto von der betroffenen Stelle –\nBlatt, Stängel oder die ganze Pflanze.\n\nBeantworte ein paar kurze Fragen zu\ndeinem Setup.\n\nDu bekommst eine Diagnose mit konkreten\nSchritten, was du jetzt tun kannst.',
    'modal.understood': 'Verstanden',

    // Analyzing
    'analyzing.image': 'Analysiere Bild...',
    'analyzing.symptoms': 'Erkenne Symptome...',
    'analyzing.conditions': 'Prüfe Anbaubedingungen...',
    'analyzing.crossRef': 'Kreuz-referenziere Faktoren...',
    'analyzing.verify': 'Verifiziere mit Referenzbildern...',
    'analyzing.creating': 'Erstelle Diagnose...',
    'analyzing.wait': 'Dies kann einige Sekunden dauern...',
    'analyzing.attempt': 'Versuch {attempt} von {max}...',
    'analyzing.noConnection': 'Keine Verbindung',
    'analyzing.error': 'Fehler bei der Analyse',
    'analyzing.retry': 'Erneut versuchen',
    'analyzing.back': 'Zurück zum Fragebogen',
    'analyzing.quotaReached': 'Du hast deine kostenlose Diagnose für heute bereits verwendet. Schalte Premium frei für unbegrenzte Scans.',
    'analyzing.noImage': 'Kein Bild vorhanden.',

    // Results
    'results.share': 'Diagnose teilen',
    'results.disclaimer': 'Diese Diagnose wurde durch KI erstellt und kann fehlerhaft sein. Kein Ersatz für professionelle Beratung. Nutzung auf eigene Verantwortung.',
    'results.newDiagnosis': 'Neue Diagnose',
    'results.toPlant': 'Zur Pflanze',

    // Quota
    'quota.free': '{n} kostenlose Diagnose heute',
    'quota.freePlural': '{n} kostenlose Diagnosen heute',
    'quota.reached': 'Tageslimit erreicht',
    'quota.premium': 'Premium – Unbegrenzte Scans',

    // Onboarding
    'onboarding.step1title': 'Foto aufnehmen',
    'onboarding.step1sub': 'Schritt 1',
    'onboarding.step1desc': 'Fotografiere das betroffene Blatt, den Stängel oder die ganze Pflanze. Bis zu 3 Fotos für eine genauere Diagnose.',
    'onboarding.step2title': 'Setup beschreiben',
    'onboarding.step2sub': 'Schritt 2',
    'onboarding.step2desc': 'Beantworte ein paar Fragen zu deinem Grow: Substrat, Dünger, pH, Temperatur. Je mehr Infos, desto präziser die Diagnose.',
    'onboarding.step3title': 'KI-Diagnose erhalten',
    'onboarding.step3sub': 'Schritt 3',
    'onboarding.step3desc': 'Unsere KI analysiert deine Fotos zusammen mit deinen Angaben und liefert dir eine Diagnose mit konkretem Aktionsplan.',
    'onboarding.step4title': 'Pflanzen verwalten',
    'onboarding.step4sub': 'Extra',
    'onboarding.step4desc': 'Lege Profile für deine Pflanzen an und verfolge ihren Gesundheitsverlauf über die Zeit. So siehst du ob deine Behandlung wirkt.',
    'onboarding.step5title': 'Wichtiger Hinweis',
    'onboarding.step5sub': 'Bevor es losgeht',
    'onboarding.step5desc': 'Die App benötigt eine Internetverbindung für Diagnosen. Du bekommst 1 kostenlose Diagnose pro Tag. Die Bibliothek ist offline verfügbar.\n\nDie Diagnosen sind KI-gestützt und ersetzen keine professionelle Beratung.',
    'onboarding.skip': 'Überspringen',
    'onboarding.next': 'Weiter',
    'onboarding.start': "Los geht's!",

    // Camera
    'camera.takePhoto': 'Foto aufnehmen',
    'camera.or': 'oder',
    'camera.gallery': 'Aus Galerie wählen',
    'camera.upload': 'Foto hochladen',

    // Navigation
    'nav.photo': 'Foto aufnehmen',
    'nav.questionnaire': 'Fragebogen',
    'nav.analysis': 'Analyse',
    'nav.results': 'Ergebnisse',
    'nav.history': 'Verlauf',
    'nav.plants': 'Meine Pflanzen',
    'nav.plant': 'Pflanze',
    'nav.addPlant': 'Neue Pflanze',
    'nav.library': 'Bibliothek',
    'nav.privacy': 'Datenschutz',
  },

  en: {
    // Home
    'home.startDiagnosis': 'Start Diagnosis',
    'home.myPlants': 'My Plants',
    'home.history': 'History',
    'home.library': 'Library',
    'home.howItWorks': 'How does it work?',
    'home.internetRequired': 'Internet connection required',
    'home.privacy': 'Privacy',

    // How it works modal
    'modal.howTitle': 'How it works',
    'modal.howText': "Take a photo of the affected area –\nleaf, stem, or the whole plant.\n\nAnswer a few quick questions about\nyour setup.\n\nYou'll get a diagnosis with concrete\nsteps on what to do next.",
    'modal.understood': 'Got it',

    // Analyzing
    'analyzing.image': 'Analyzing image...',
    'analyzing.symptoms': 'Detecting symptoms...',
    'analyzing.conditions': 'Checking grow conditions...',
    'analyzing.crossRef': 'Cross-referencing factors...',
    'analyzing.verify': 'Verifying with reference images...',
    'analyzing.creating': 'Creating diagnosis...',
    'analyzing.wait': 'This may take a few seconds...',
    'analyzing.attempt': 'Attempt {attempt} of {max}...',
    'analyzing.noConnection': 'No Connection',
    'analyzing.error': 'Analysis Error',
    'analyzing.retry': 'Try Again',
    'analyzing.back': 'Back to Questionnaire',
    'analyzing.quotaReached': "You've already used your free diagnosis for today. Unlock Premium for unlimited scans.",
    'analyzing.noImage': 'No image available.',

    // Results
    'results.share': 'Share Diagnosis',
    'results.disclaimer': 'This diagnosis was created by AI and may be inaccurate. Not a substitute for professional advice. Use at your own risk.',
    'results.newDiagnosis': 'New Diagnosis',
    'results.toPlant': 'Go to Plant',

    // Quota
    'quota.free': '{n} free diagnosis today',
    'quota.freePlural': '{n} free diagnoses today',
    'quota.reached': 'Daily limit reached',
    'quota.premium': 'Premium – Unlimited Scans',

    // Onboarding
    'onboarding.step1title': 'Take a Photo',
    'onboarding.step1sub': 'Step 1',
    'onboarding.step1desc': 'Photograph the affected leaf, stem, or the whole plant. Up to 3 photos for a more accurate diagnosis.',
    'onboarding.step2title': 'Describe Your Setup',
    'onboarding.step2sub': 'Step 2',
    'onboarding.step2desc': 'Answer a few questions about your grow: substrate, nutrients, pH, temperature. More info means a more precise diagnosis.',
    'onboarding.step3title': 'Get AI Diagnosis',
    'onboarding.step3sub': 'Step 3',
    'onboarding.step3desc': 'Our AI analyzes your photos along with your data and delivers a diagnosis with a concrete action plan.',
    'onboarding.step4title': 'Manage Plants',
    'onboarding.step4sub': 'Extra',
    'onboarding.step4desc': 'Create profiles for your plants and track their health over time. See if your treatment is working.',
    'onboarding.step5title': 'Important Notice',
    'onboarding.step5sub': 'Before we start',
    'onboarding.step5desc': "The app requires an internet connection for diagnoses. You get 1 free diagnosis per day. The library is available offline.\n\nDiagnoses are AI-powered and don't replace professional advice.",
    'onboarding.skip': 'Skip',
    'onboarding.next': 'Next',
    'onboarding.start': "Let's go!",

    // Camera
    'camera.takePhoto': 'Take Photo',
    'camera.or': 'or',
    'camera.gallery': 'Choose from Gallery',
    'camera.upload': 'Upload Photo',

    // Navigation
    'nav.photo': 'Take Photo',
    'nav.questionnaire': 'Questionnaire',
    'nav.analysis': 'Analysis',
    'nav.results': 'Results',
    'nav.history': 'History',
    'nav.plants': 'My Plants',
    'nav.plant': 'Plant',
    'nav.addPlant': 'New Plant',
    'nav.library': 'Library',
    'nav.privacy': 'Privacy',
  },
};

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
