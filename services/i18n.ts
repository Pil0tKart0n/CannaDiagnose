import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform, NativeModules } from 'react-native';

const LANG_KEY = 'leafscan_language';

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

// ── Translation strings ──

const translations: Record<Language, Record<string, string>> = {
  de: {
    // Home
    'home.scan': 'Pflanze scannen',
    'home.plants': 'Pflanzen',
    'home.history': 'Verlauf',
    'home.library': 'Bibliothek',
    'home.internetRequired': 'Internetverbindung erforderlich',
    'home.privacy': 'Datenschutz',
    'home.terms': 'AGB',
    'home.impressum': 'Impressum',
    'home.install': 'App installieren',
    'home.downloadAndroid': 'Android App herunterladen',
    'home.notNow': 'Nicht jetzt',
    'home.unlockPremium': 'Premium freischalten',

    // How it works modal
    'modal.howTitle': "So funktioniert's",
    'modal.howText':
      'Mach ein Foto von der betroffenen Stelle –\nBlatt, Stängel oder die ganze Pflanze.\n\nBeantworte ein paar kurze Fragen zu\ndeinem Setup.\n\nDu bekommst eine Diagnose mit konkreten\nSchritten, was du jetzt tun kannst.',
    'modal.understood': 'Verstanden',

    // Camera
    'camera.permissionTitle': 'Berechtigung benötigt',
    'camera.permissionCamera': 'Bitte erlaube den Kamerazugriff in den Einstellungen.',
    'camera.permissionGallery': 'Bitte erlaube den Zugriff auf die Galerie.',
    'camera.photos': 'Fotos',
    'camera.photoTaken': 'Foto aufgenommen',
    'camera.leafStemPlant': 'Blatt, Stängel oder Pflanze',
    'camera.takeAnother': 'Weiteres Foto aufnehmen',
    'camera.takePhoto': 'Foto aufnehmen',
    'camera.or': 'oder',
    'camera.uploadAnother': 'Weiteres Foto hochladen',
    'camera.upload': 'Foto hochladen',
    'camera.gallery': 'Aus Galerie wählen',
    'camera.next': 'Weiter',

    // Analyzing
    'analyzing.leafStructure': 'Analysiere Blattstruktur...',
    'analyzing.colorPatterns': 'Erkenne Farbmuster...',
    'analyzing.nutrientSymptoms': 'Prüfe Nährstoff-Symptome...',
    'analyzing.crossRef': 'Gleiche mit Referenzdaten ab...',
    'analyzing.envFactors': 'Bewerte Umgebungsfaktoren...',
    'analyzing.actionPlan': 'Erstelle Aktionsplan...',
    'analyzing.wait': 'Dies kann einige Sekunden dauern',
    'analyzing.attempt': 'Versuch {attempt} von {max}...',
    'analyzing.noImage': 'Kein Bild vorhanden.',
    'analyzing.unknownError': 'Ein unbekannter Fehler ist aufgetreten.',
    'analyzing.dailyLimit': 'Tageslimit erreicht',
    'analyzing.noPlant': 'Keine Pflanze erkannt',
    'analyzing.noConnection': 'Keine Verbindung',
    'analyzing.analysisError': 'Fehler bei der Analyse',
    'analyzing.quotaUsed': 'Du hast deine kostenlose Diagnose für heute bereits verwendet.',
    'analyzing.noPlantDesc':
      'Auf dem Foto ist keine passende Pflanze erkennbar. Bitte mache ein neues Foto von deiner Pflanze.',
    'analyzing.unlockPremium': 'Premium freischalten',
    'analyzing.newPhoto': 'Neues Foto aufnehmen',
    'analyzing.retry': 'Erneut versuchen',
    'analyzing.backToQuestionnaire': 'Zurück zum Fragebogen',
    'analyzing.yourPlant': 'deine Pflanze',
    'analyzing.plant': 'Pflanze',

    // Results
    'results.noDiagnosis': 'Keine Diagnose vorhanden.',
    'results.back': 'Zurück',
    'results.share': 'Diagnose teilen',
    'results.refineTitle': 'Diagnose verfeinern',
    'results.refineHintDefault': 'Farbe korrigieren oder pH/EC nachtragen für eine präzisere Diagnose.',
    'results.refineHintLivingSoil': 'Farbe, pH-Wert oder Bodentemperatur nachtragen für eine präzisere Diagnose.',
    'results.leafColor': 'Blattfarbe',
    'results.colorPlaceholder': 'z.B. violett, braun, gelb...',
    'results.phValue': 'pH-Wert',
    'results.ecPpm': 'EC / PPM',
    'results.soilTemp': 'Bodentemp. °C',
    'results.fertilizerFromQ': 'Dünger (aus Fragebogen)',
    'results.fertilizerOptional': 'Dünger (optional)',
    'results.fertilizerSearch': 'Dünger suchen & auswählen...',
    'results.fertilizerSearchPlaceholder': 'Dünger suchen...',
    'results.refineAnalysis': 'Analyse verfeinern',
    'results.refinedColor': 'Diagnose angepasst basierend auf Farbangabe',
    'results.refinedColorAndData': 'Diagnose verfeinert mit Farbangabe + pH/EC-Daten',
    'results.refinedData': 'Diagnose verfeinert mit pH/EC-Daten',
    'results.followUpReminder': 'Follow-up in {days} Tagen – du wirst erinnert',
    'results.libraryLink': 'Mehr über {name} in der Bibliothek',
    'results.feedbackQuestion': 'War die Diagnose hilfreich?',
    'results.disclaimer':
      'Diese Diagnose kann fehlerhaft sein. Kein Ersatz für professionelle Beratung. Nutzung auf eigene Verantwortung.',
    'results.toPlant': 'Zur Pflanze',
    'results.scanAnother': 'Weiteres Blatt scannen',
    'results.newDiagnosis': 'Neue Diagnose',
    'results.missingDataOrganic': 'Bitte gib einen pH-Wert oder eine Bodentemperatur ein.',
    'results.missingDataMineral': 'Bitte gib mindestens einen pH- oder EC-Wert ein.',
    'results.missingDataTitle': 'Fehlende Daten',
    'results.invalidPh': 'Bitte gib einen gültigen pH-Wert ein (0–14).',
    'results.invalidEc': 'Bitte gib einen gültigen EC-Wert ein (0–15).',
    'results.invalidValue': 'Ungültiger Wert',
    'results.refineFailed': 'Verfeinerung fehlgeschlagen.',
    'results.shareFailed': 'Teilen fehlgeschlagen.',
    'results.error': 'Fehler',

    // Plants
    'plants.deleteTitle': '"{name}" löschen?',
    'plants.deleteMessage': 'Alle Diagnosen dieser Pflanze werden gelöscht.',
    'plants.diagnosis': 'Diagnose',
    'plants.diagnoses': 'Diagnosen',
    'plants.followUpDue': 'Follow-up fällig',
    'plants.emptyTitle': 'Noch keine Pflanzen',
    'plants.emptyText': 'Füge deine erste Pflanze hinzu, um ihre Gesundheit zu tracken.',
    'plants.addPlant': '+ Pflanze hinzufügen',

    // Plant Detail
    'plantDetail.severityLow': 'Niedrig',
    'plantDetail.severityMedium': 'Mittel',
    'plantDetail.severityHigh': 'Hoch',
    'plantDetail.severityCritical': 'Kritisch',
    'plantDetail.nameMissing': 'Name fehlt',
    'plantDetail.nameRequired': 'Gib deiner Pflanze einen Namen.',
    'plantDetail.createdOn': 'Angelegt am {date}',
    'plantDetail.cancel': 'Abbrechen',
    'plantDetail.save': 'Speichern',
    'plantDetail.followUpDue': 'Follow-up fällig – Zeit für ein neues Foto',
    'plantDetail.followUpIn': 'Nächstes Follow-up in {days} {unit}',
    'plantDetail.day': 'Tag',
    'plantDetail.days': 'Tagen',
    'plantDetail.startNow': 'Jetzt starten',
    'plantDetail.healthTrend': 'GESUNDHEITSVERLAUF',
    'plantDetail.diagnosisHistory': 'Diagnose-Verlauf ({count})',
    'plantDetail.emptyTimeline': 'Noch keine Diagnosen. Starte die erste Analyse für diese Pflanze.',
    'plantDetail.deleteEntry': 'Diagnose löschen?',
    'plantDetail.deleteEntryMsg': 'Diese Diagnose wird unwiderruflich gelöscht.',
    'plantDetail.followUpDays': 'Follow-up: {days} Tage',
    'plantDetail.followUpDiagnosis': 'Follow-up Diagnose',
    'plantDetail.firstDiagnosis': 'Erste Diagnose starten',
    'plantDetail.newDiagnosis': 'Neue Diagnose',
    'plantDetail.notFound': 'Pflanze nicht gefunden.',
    'plantDetail.plantName': 'Pflanzenname',
    'plantDetail.strainNote': 'Sorte / Notiz (optional)',

    // Add Plant
    'addPlant.addPhoto': 'Foto hinzufügen',
    'addPlant.nameLabel': 'Sorte / Name',
    'addPlant.namePlaceholder': 'z.B. Northern Lights, Pflanze #1...',
    'addPlant.addMore': '+ Weitere Infos hinzufügen',
    'addPlant.noteLabel': 'Notiz (optional)',
    'addPlant.notePlaceholder': 'z.B. Zelt 2, Fensterbank, Autoflower...',
    'addPlant.save': 'Pflanze speichern',

    // History
    'history.emptyTitle': 'Noch keine Diagnosen',
    'history.emptyText': 'Starte deine erste Diagnose, um sie hier zu sehen.',
    'history.deleteTitle': 'Diagnose löschen?',
    'history.deleteMessage': 'Diese Aktion kann nicht rückgängig gemacht werden.',

    // Paywall
    'paywall.unlockPremium': 'Premium freischalten',
    'paywall.subtitle': 'Mehr Diagnosen, mehr Möglichkeiten',
    'paywall.freeIncluded': 'Kostenlos enthalten:',
    'paywall.free1': '1 Diagnose pro Tag',
    'paywall.free2': '3 Pflanzenprofile',
    'paywall.free3': 'Bibliothek & Nachschlagewerk',
    'paywall.grower1': '10 Diagnosen pro Tag',
    'paywall.grower2': 'Unbegrenzte Pflanzen',
    'paywall.grower3': 'PDF-Export',
    'paywall.pro1': 'Unbegrenzte Diagnosen',
    'paywall.pro2': 'Unbegrenzte Pflanzen',
    'paywall.pro3': 'PDF-Export',
    'paywall.pro4': 'Prioritäts-Analyse',
    'paywall.pro5': 'Detaillierte Berichte',
    'paywall.popular': 'Beliebt',
    'paywall.perMonth': '/ Monat',
    'paywall.includes': '{plan} enthält:',
    'paywall.purchaseBtn': '{plan} für {price}/Monat',
    'paywall.loading': 'Laden...',
    'paywall.redeemCode': 'Code einlösen',
    'paywall.redeem': 'Einlösen',
    'paywall.codeInvalid': 'Code ungültig.',
    'paywall.redeemError': 'Fehler beim Einlösen. Bitte versuche es erneut.',
    'paywall.premiumActivated': 'Premium aktiviert!',
    'paywall.enjoyDiagnoses': 'Viel Spaß mit unbegrenzten Diagnosen.',
    'paywall.premiumSuccess': 'Premium aktiviert! Viel Spaß beim Diagnostizieren.',
    'paywall.toHome': 'Zur Startseite',
    'paywall.welcome': 'Willkommen!',
    'paywall.welcomeMsg': 'Premium wurde aktiviert. Viel Spaß mit unbegrenzten Diagnosen!',
    'paywall.great': 'Super!',
    'paywall.note': 'Hinweis',
    'paywall.error': 'Fehler',
    'paywall.productUnavailable': 'Produkt nicht verfügbar.',
    'paywall.checkoutFailed': 'Checkout konnte nicht gestartet werden. Bitte versuche es erneut.',
    'paywall.restoring': 'Wird wiederhergestellt...',
    'paywall.restore': 'Käufe wiederherstellen',
    'paywall.restored': 'Wiederhergestellt!',
    'paywall.restoredMsg': 'Dein Premium-Abo wurde wiederhergestellt.',
    'paywall.noSubscription': 'Kein Abo gefunden',
    'paywall.noSubscriptionMsg': 'Es wurde kein aktives Abonnement gefunden.',
    'paywall.restoreError': 'Käufe konnten nicht wiederhergestellt werden. Bitte versuche es erneut.',
    'paywall.legalWeb':
      'Das Abo verlängert sich automatisch. Du kannst es jederzeit über dein Stripe-Kundenkonto kündigen. Die Bezahlung erfolgt sicher über Stripe.',
    'paywall.legalNative':
      'Das Abo verlängert sich automatisch, sofern es nicht mindestens 24 Stunden vor Ablauf des aktuellen Zeitraums gekündigt wird. Du kannst dein Abo jederzeit in den Einstellungen deines Google Play / App Store Kontos verwalten.',

    // Questionnaire
    'questionnaire.startAnalysis': 'Analyse starten',
    'questionnaire.next': 'Weiter',

    // Cookie Consent
    'cookie.text':
      'Diese App nutzt lokalen Speicher (LocalStorage) und einen Service Worker für Offline-Funktionalität. Es werden keine Tracking-Cookies oder Analysedienste verwendet.',
    'cookie.decline': 'Ablehnen',
    'cookie.accept': 'Akzeptieren',

    // Library
    'library.search': 'Suchen...',
    'library.symptoms': 'Symptome',
    'library.causes': 'Ursachen',
    'library.treatment': 'Behandlung',
    'library.prevention': 'Prävention',

    // QuestionCard
    'questionCard.search': 'Suchen...',
    'questionCard.perliteTip': 'Wenn du Perlite in deinem Substrat hast, kannst du sie hier hinzufügen',
    'questionCard.share': 'Anteil:',

    // Navigation titles
    'nav.camera': 'Foto aufnehmen',
    'nav.questionnaire': 'Fragebogen',
    'nav.analysis': 'Analyse',
    'nav.results': 'Ergebnisse',
    'nav.history': 'Verlauf',
    'nav.plants': 'Meine Pflanzen',
    'nav.plant': 'Pflanze',
    'nav.addPlant': 'Neue Pflanze',
    'nav.library': 'Bibliothek',
    'nav.privacy': 'Datenschutz',
    'nav.premium': 'Premium',
    'nav.impressum': 'Impressum',
    'nav.terms': 'Nutzungsbedingungen',

    // Onboarding
    'onboarding.step1title': 'Foto aufnehmen',
    'onboarding.step1sub': 'Schritt 1',
    'onboarding.step1desc':
      'Fotografiere das betroffene Blatt, den Stängel oder die ganze Pflanze. Bis zu 3 Fotos für eine genauere Diagnose.',
    'onboarding.step2title': 'Setup beschreiben',
    'onboarding.step2sub': 'Schritt 2',
    'onboarding.step2desc':
      'Beantworte ein paar Fragen zu deinem Grow: Substrat, Dünger, pH, Temperatur. Je mehr Infos, desto präziser die Diagnose.',
    'onboarding.step3title': 'KI-Diagnose erhalten',
    'onboarding.step3sub': 'Schritt 3',
    'onboarding.step3desc':
      'Unsere KI analysiert deine Fotos zusammen mit deinen Angaben und liefert dir eine Diagnose mit konkretem Aktionsplan.',
    'onboarding.step4title': 'Pflanzen verwalten',
    'onboarding.step4sub': 'Extra',
    'onboarding.step4desc':
      'Lege Profile für deine Pflanzen an und verfolge ihren Gesundheitsverlauf über die Zeit. So siehst du ob deine Behandlung wirkt.',
    'onboarding.step5title': 'Wichtiger Hinweis',
    'onboarding.step5sub': 'Bevor es losgeht',
    'onboarding.step5desc':
      'Die App benötigt eine Internetverbindung für Diagnosen. Du bekommst 1 kostenlose Diagnose pro Tag. Die Bibliothek ist offline verfügbar.\n\nDie Diagnosen sind KI-gestützt und ersetzen keine professionelle Beratung.',
    'onboarding.skip': 'Überspringen',
    'onboarding.next': 'Weiter',
    'onboarding.start': "Los geht's!",

    // Quota
    'quota.free': '{n} kostenlose Diagnose heute',
    'quota.freePlural': '{n} kostenlose Diagnosen heute',
    'quota.reached': 'Tageslimit erreicht',
    'quota.premium': 'Premium – Unbegrenzte Scans',

    // Language
    'lang.switch': 'EN',
  },

  en: {
    // Home
    'home.scan': 'Scan Plant',
    'home.plants': 'Plants',
    'home.history': 'History',
    'home.library': 'Library',
    'home.internetRequired': 'Internet connection required',
    'home.privacy': 'Privacy',
    'home.terms': 'Terms',
    'home.impressum': 'Legal Notice',
    'home.install': 'Install App',
    'home.downloadAndroid': 'Download Android App',
    'home.notNow': 'Not now',
    'home.unlockPremium': 'Unlock Premium',

    // How it works modal
    'modal.howTitle': 'How it works',
    'modal.howText':
      "Take a photo of the affected area –\nleaf, stem, or the whole plant.\n\nAnswer a few quick questions about\nyour setup.\n\nYou'll get a diagnosis with concrete\nsteps on what to do next.",
    'modal.understood': 'Got it',

    // Camera
    'camera.permissionTitle': 'Permission Required',
    'camera.permissionCamera': 'Please allow camera access in your settings.',
    'camera.permissionGallery': 'Please allow gallery access in your settings.',
    'camera.photos': 'Photos',
    'camera.photoTaken': 'Photo taken',
    'camera.leafStemPlant': 'Leaf, stem, or plant',
    'camera.takeAnother': 'Take another photo',
    'camera.takePhoto': 'Take Photo',
    'camera.or': 'or',
    'camera.uploadAnother': 'Upload another photo',
    'camera.upload': 'Upload Photo',
    'camera.gallery': 'Choose from Gallery',
    'camera.next': 'Next',

    // Analyzing
    'analyzing.leafStructure': 'Analyzing leaf structure...',
    'analyzing.colorPatterns': 'Detecting color patterns...',
    'analyzing.nutrientSymptoms': 'Checking nutrient symptoms...',
    'analyzing.crossRef': 'Cross-referencing with data...',
    'analyzing.envFactors': 'Evaluating environmental factors...',
    'analyzing.actionPlan': 'Creating action plan...',
    'analyzing.wait': 'This may take a few seconds',
    'analyzing.attempt': 'Attempt {attempt} of {max}...',
    'analyzing.noImage': 'No image available.',
    'analyzing.unknownError': 'An unknown error occurred.',
    'analyzing.dailyLimit': 'Daily Limit Reached',
    'analyzing.noPlant': 'No Plant Detected',
    'analyzing.noConnection': 'No Connection',
    'analyzing.analysisError': 'Analysis Error',
    'analyzing.quotaUsed': "You've already used your free diagnosis for today.",
    'analyzing.noPlantDesc': 'No suitable plant was detected in the photo. Please take a new photo of your plant.',
    'analyzing.unlockPremium': 'Unlock Premium',
    'analyzing.newPhoto': 'Take New Photo',
    'analyzing.retry': 'Try Again',
    'analyzing.backToQuestionnaire': 'Back to Questionnaire',
    'analyzing.yourPlant': 'your plant',
    'analyzing.plant': 'Plant',

    // Results
    'results.noDiagnosis': 'No diagnosis available.',
    'results.back': 'Back',
    'results.share': 'Share Diagnosis',
    'results.refineTitle': 'Refine Diagnosis',
    'results.refineHintDefault': 'Correct the color or add pH/EC values for a more precise diagnosis.',
    'results.refineHintLivingSoil': 'Add color, pH value, or soil temperature for a more precise diagnosis.',
    'results.leafColor': 'Leaf Color',
    'results.colorPlaceholder': 'e.g. purple, brown, yellow...',
    'results.phValue': 'pH Value',
    'results.ecPpm': 'EC / PPM',
    'results.soilTemp': 'Soil Temp °C',
    'results.fertilizerFromQ': 'Fertilizer (from questionnaire)',
    'results.fertilizerOptional': 'Fertilizer (optional)',
    'results.fertilizerSearch': 'Search & select fertilizer...',
    'results.fertilizerSearchPlaceholder': 'Search fertilizer...',
    'results.refineAnalysis': 'Refine Analysis',
    'results.refinedColor': 'Diagnosis adjusted based on color input',
    'results.refinedColorAndData': 'Diagnosis refined with color input + pH/EC data',
    'results.refinedData': 'Diagnosis refined with pH/EC data',
    'results.followUpReminder': 'Follow-up in {days} days – you will be reminded',
    'results.libraryLink': 'More about {name} in the Library',
    'results.feedbackQuestion': 'Was the diagnosis helpful?',
    'results.disclaimer':
      'This diagnosis may be inaccurate. Not a substitute for professional advice. Use at your own risk.',
    'results.toPlant': 'Go to Plant',
    'results.scanAnother': 'Scan another leaf',
    'results.newDiagnosis': 'New Diagnosis',
    'results.missingDataOrganic': 'Please enter a pH value or soil temperature.',
    'results.missingDataMineral': 'Please enter at least a pH or EC value.',
    'results.missingDataTitle': 'Missing Data',
    'results.invalidPh': 'Please enter a valid pH value (0–14).',
    'results.invalidEc': 'Please enter a valid EC value (0–15).',
    'results.invalidValue': 'Invalid Value',
    'results.refineFailed': 'Refinement failed.',
    'results.shareFailed': 'Sharing failed.',
    'results.error': 'Error',

    // Plants
    'plants.deleteTitle': 'Delete "{name}"?',
    'plants.deleteMessage': 'All diagnoses for this plant will be deleted.',
    'plants.diagnosis': 'Diagnosis',
    'plants.diagnoses': 'Diagnoses',
    'plants.followUpDue': 'Follow-up due',
    'plants.emptyTitle': 'No plants yet',
    'plants.emptyText': 'Add your first plant to track its health.',
    'plants.addPlant': '+ Add Plant',

    // Plant Detail
    'plantDetail.severityLow': 'Low',
    'plantDetail.severityMedium': 'Medium',
    'plantDetail.severityHigh': 'High',
    'plantDetail.severityCritical': 'Critical',
    'plantDetail.nameMissing': 'Name missing',
    'plantDetail.nameRequired': 'Please give your plant a name.',
    'plantDetail.createdOn': 'Created on {date}',
    'plantDetail.cancel': 'Cancel',
    'plantDetail.save': 'Save',
    'plantDetail.followUpDue': 'Follow-up due – time for a new photo',
    'plantDetail.followUpIn': 'Next follow-up in {days} {unit}',
    'plantDetail.day': 'day',
    'plantDetail.days': 'days',
    'plantDetail.startNow': 'Start now',
    'plantDetail.healthTrend': 'HEALTH TREND',
    'plantDetail.diagnosisHistory': 'Diagnosis History ({count})',
    'plantDetail.emptyTimeline': 'No diagnoses yet. Start the first analysis for this plant.',
    'plantDetail.deleteEntry': 'Delete diagnosis?',
    'plantDetail.deleteEntryMsg': 'This diagnosis will be permanently deleted.',
    'plantDetail.followUpDays': 'Follow-up: {days} days',
    'plantDetail.followUpDiagnosis': 'Follow-up Diagnosis',
    'plantDetail.firstDiagnosis': 'Start First Diagnosis',
    'plantDetail.newDiagnosis': 'New Diagnosis',
    'plantDetail.notFound': 'Plant not found.',
    'plantDetail.plantName': 'Plant name',
    'plantDetail.strainNote': 'Strain / Note (optional)',

    // Add Plant
    'addPlant.addPhoto': 'Add Photo',
    'addPlant.nameLabel': 'Strain / Name',
    'addPlant.namePlaceholder': 'e.g. Northern Lights, Plant #1...',
    'addPlant.addMore': '+ Add more info',
    'addPlant.noteLabel': 'Note (optional)',
    'addPlant.notePlaceholder': 'e.g. Tent 2, Windowsill, Autoflower...',
    'addPlant.save': 'Save Plant',

    // History
    'history.emptyTitle': 'No diagnoses yet',
    'history.emptyText': 'Start your first diagnosis to see it here.',
    'history.deleteTitle': 'Delete diagnosis?',
    'history.deleteMessage': 'This action cannot be undone.',

    // Paywall
    'paywall.unlockPremium': 'Unlock Premium',
    'paywall.subtitle': 'More diagnoses, more possibilities',
    'paywall.freeIncluded': 'Included for free:',
    'paywall.free1': '1 diagnosis per day',
    'paywall.free2': '3 plant profiles',
    'paywall.free3': 'Library & reference guide',
    'paywall.grower1': '10 diagnoses per day',
    'paywall.grower2': 'Unlimited plants',
    'paywall.grower3': 'PDF export',
    'paywall.pro1': 'Unlimited diagnoses',
    'paywall.pro2': 'Unlimited plants',
    'paywall.pro3': 'PDF export',
    'paywall.pro4': 'Priority analysis',
    'paywall.pro5': 'Detailed reports',
    'paywall.popular': 'Popular',
    'paywall.perMonth': '/ month',
    'paywall.includes': '{plan} includes:',
    'paywall.purchaseBtn': '{plan} for {price}/month',
    'paywall.loading': 'Loading...',
    'paywall.redeemCode': 'Redeem Code',
    'paywall.redeem': 'Redeem',
    'paywall.codeInvalid': 'Invalid code.',
    'paywall.redeemError': 'Error redeeming code. Please try again.',
    'paywall.premiumActivated': 'Premium Activated!',
    'paywall.enjoyDiagnoses': 'Enjoy unlimited diagnoses.',
    'paywall.premiumSuccess': 'Premium activated! Enjoy diagnosing.',
    'paywall.toHome': 'Go to Home',
    'paywall.welcome': 'Welcome!',
    'paywall.welcomeMsg': 'Premium has been activated. Enjoy unlimited diagnoses!',
    'paywall.great': 'Great!',
    'paywall.note': 'Note',
    'paywall.error': 'Error',
    'paywall.productUnavailable': 'Product not available.',
    'paywall.checkoutFailed': 'Checkout could not be started. Please try again.',
    'paywall.restoring': 'Restoring...',
    'paywall.restore': 'Restore Purchases',
    'paywall.restored': 'Restored!',
    'paywall.restoredMsg': 'Your premium subscription has been restored.',
    'paywall.noSubscription': 'No Subscription Found',
    'paywall.noSubscriptionMsg': 'No active subscription was found.',
    'paywall.restoreError': 'Purchases could not be restored. Please try again.',
    'paywall.legalWeb':
      'The subscription renews automatically. You can cancel anytime through your Stripe customer account. Payment is processed securely via Stripe.',
    'paywall.legalNative':
      'The subscription renews automatically unless cancelled at least 24 hours before the end of the current period. You can manage your subscription in your Google Play / App Store account settings.',

    // Questionnaire
    'questionnaire.startAnalysis': 'Start Analysis',
    'questionnaire.next': 'Next',

    // Cookie Consent
    'cookie.text':
      'This app uses local storage (LocalStorage) and a Service Worker for offline functionality. No tracking cookies or analytics services are used.',
    'cookie.decline': 'Decline',
    'cookie.accept': 'Accept',

    // Library
    'library.search': 'Search...',
    'library.symptoms': 'Symptoms',
    'library.causes': 'Causes',
    'library.treatment': 'Treatment',
    'library.prevention': 'Prevention',

    // QuestionCard
    'questionCard.search': 'Search...',
    'questionCard.perliteTip': 'If you have perlite in your substrate, you can add it here',
    'questionCard.share': 'Share:',

    // Navigation titles
    'nav.camera': 'Take Photo',
    'nav.questionnaire': 'Questionnaire',
    'nav.analysis': 'Analysis',
    'nav.results': 'Results',
    'nav.history': 'History',
    'nav.plants': 'My Plants',
    'nav.plant': 'Plant',
    'nav.addPlant': 'New Plant',
    'nav.library': 'Library',
    'nav.privacy': 'Privacy',
    'nav.premium': 'Premium',
    'nav.impressum': 'Legal Notice',
    'nav.terms': 'Terms of Service',

    // Onboarding
    'onboarding.step1title': 'Take a Photo',
    'onboarding.step1sub': 'Step 1',
    'onboarding.step1desc':
      'Photograph the affected leaf, stem, or the whole plant. Up to 3 photos for a more accurate diagnosis.',
    'onboarding.step2title': 'Describe Your Setup',
    'onboarding.step2sub': 'Step 2',
    'onboarding.step2desc':
      'Answer a few questions about your grow: substrate, nutrients, pH, temperature. More info means a more precise diagnosis.',
    'onboarding.step3title': 'Get AI Diagnosis',
    'onboarding.step3sub': 'Step 3',
    'onboarding.step3desc':
      'Our AI analyzes your photos along with your data and delivers a diagnosis with a concrete action plan.',
    'onboarding.step4title': 'Manage Plants',
    'onboarding.step4sub': 'Extra',
    'onboarding.step4desc':
      'Create profiles for your plants and track their health over time. See if your treatment is working.',
    'onboarding.step5title': 'Important Notice',
    'onboarding.step5sub': 'Before we start',
    'onboarding.step5desc':
      "The app requires an internet connection for diagnoses. You get 1 free diagnosis per day. The library is available offline.\n\nDiagnoses are AI-powered and don't replace professional advice.",
    'onboarding.skip': 'Skip',
    'onboarding.next': 'Next',
    'onboarding.start': "Let's go!",

    // Quota
    'quota.free': '{n} free diagnosis today',
    'quota.freePlural': '{n} free diagnoses today',
    'quota.reached': 'Daily limit reached',
    'quota.premium': 'Premium – Unlimited Scans',

    // Language
    'lang.switch': 'DE',
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
