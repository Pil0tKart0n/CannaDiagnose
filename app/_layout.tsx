import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, Platform, Linking, Alert, TouchableOpacity } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { QuestionnaireData, DiagnosisResult } from '../types';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors } from '../constants/colors';
import { PHONE_FRAME_WIDTH } from '../constants/webStyles';
import { setupNotificationHandler } from '../services/notifications';
import { optimizeImage, initReferenceImages } from '../services/claude';
import { cleanupStorage } from '../services/storage';
import { initLanguage, t, getLang, onLangChange } from '../services/i18n';
import { initPurchases } from '../services/purchases';
import { setPremium, setSessionToken } from '../services/quota';
import CookieConsent from '../components/CookieConsent';

SplashScreen.preventAutoHideAsync();
setupNotificationHandler();

const LAST_QUESTIONNAIRE_KEY = 'leafscan_last_questionnaire';

interface DiagnosisContextType {
  imageUri: string | null;
  setImageUri: (uri: string | null) => void;
  imageUris: string[];
  setImageUris: (uris: string[]) => void;
  optimizedImageUris: string[];
  questionnaire: QuestionnaireData;
  setQuestionnaire: (data: QuestionnaireData) => void;
  result: DiagnosisResult | null;
  setResult: (result: DiagnosisResult | null) => void;
  selectedPlantId: string | null;
  setSelectedPlantId: (id: string | null) => void;
  isFollowUp: boolean;
  setIsFollowUp: (v: boolean) => void;
  previousResult: DiagnosisResult | null;
  setPreviousResult: (r: DiagnosisResult | null) => void;
  previousDate: string | null;
  setPreviousDate: (d: string | null) => void;
  reset: () => void;
}

const emptyQuestionnaire: QuestionnaireData = {
  growPhase: null,
  plantAgeWeeks: null,
  substrateType: null,
  perliteAdded: false,
  perlitePercent: null,
  fertilizerType: null,
  fertilizerCategory: null,
  organicMethod: null,
  organicTea: null,
  organicMycorrhiza: null,
  organicPotSize: null,
  organicWaterType: null,
  livingsoilAmendments: [],
  livingsoilTea: null,
  livingsoilMulch: null,
  waterTempCelsius: null,
  substrateTempCelsius: null,
  phFeed: null,
  ecPpm: null,
  lightType: null,
  lightDistanceCm: null,
  roomTempCelsius: null,
  humidityPercent: null,
  symptomDurationDays: null,
  recentChanges: [],
};

const DiagnosisContext = createContext<DiagnosisContextType | null>(null);

export function useDiagnosis() {
  const ctx = useContext(DiagnosisContext);
  if (!ctx) throw new Error('useDiagnosis must be used within DiagnosisProvider');
  return ctx;
}

export default function RootLayout() {
  const [_lang, setLangState] = useState(getLang());
  useEffect(() => {
    const unsub = onLangChange((l) => setLangState(l));
    return unsub;
  }, []);

  const [announcement, setAnnouncement] = useState<{ message: string; type: string } | null>(null);
  const [imageUris, setImageUrisState] = useState<string[]>([]);
  const [optimizedImageUris, setOptimizedImageUris] = useState<string[]>([]);
  const [questionnaire, setQuestionnaire] = useState<QuestionnaireData>({ ...emptyQuestionnaire });
  const [result, setResult] = useState<DiagnosisResult | null>(null);
  const [selectedPlantId, setSelectedPlantId] = useState<string | null>(null);
  const [isFollowUp, setIsFollowUp] = useState(false);
  const [previousResult, setPreviousResult] = useState<DiagnosisResult | null>(null);
  const [previousDate, setPreviousDate] = useState<string | null>(null);

  // Pre-optimize images in background as soon as they're selected
  const setImageUris = useCallback((uris: string[]) => {
    setImageUrisState(uris);
    setOptimizedImageUris([]); // Reset optimized versions
    if (uris.length > 0) {
      if (__DEV__) console.log('[LeafScan] Pre-optimizing', uris.length, 'images in background...');
      Promise.all(uris.map(optimizeImage))
        .then((optimized) => {
          setOptimizedImageUris(optimized);
          if (__DEV__) console.log('[LeafScan] Pre-optimization complete');
        })
        .catch((err) => {
          console.warn('[LeafScan] Pre-optimization failed:', err);
        });
    }
  }, []);

  // backward-compat helper: imageUri = first image
  const imageUri = imageUris.length > 0 ? imageUris[0] : null;
  const setImageUri = (uri: string | null) => {
    if (uri) {
      setImageUris([uri]);
    } else {
      setImageUris([]);
    }
  };

  const reset = () => {
    setImageUris([]);
    setOptimizedImageUris([]);
    setResult(null);
    setSelectedPlantId(null);
    setIsFollowUp(false);
    setPreviousResult(null);
    setPreviousDate(null);
    // Load last questionnaire answers as defaults
    AsyncStorage.getItem(LAST_QUESTIONNAIRE_KEY)
      .then((json) => {
        if (json) {
          try {
            const saved = JSON.parse(json) as QuestionnaireData;
            // Clear plantAgeWeeks since its options depend on growPhase + lightType
            // and user may change those — safer to let them re-select
            saved.plantAgeWeeks = null;
            // Clear context fields that change per diagnosis
            saved.symptomDurationDays = null;
            saved.recentChanges = [];
            setQuestionnaire({ ...emptyQuestionnaire, ...saved });
          } catch {
            setQuestionnaire({ ...emptyQuestionnaire });
          }
        } else {
          setQuestionnaire({ ...emptyQuestionnaire });
        }
      })
      .catch(() => {
        setQuestionnaire({ ...emptyQuestionnaire });
      });
  };

  useEffect(() => {
    // Run all init tasks in parallel, hide splash when critical ones complete
    Promise.all([initLanguage().catch(() => {}), initPurchases().catch(() => {})])
      .then(() => SplashScreen.hideAsync())
      .catch(() => SplashScreen.hideAsync());

    // DISABLED: Stripe deep-link handler (payments temporarily deactivated)
    if (false && Platform.OS !== 'web') {
      const cleanupDeepLink = () => {};
      // Store cleanup — we'll call it via return
      (globalThis as any).__deepLinkCleanup = cleanupDeepLink;
    }

    // Check for active announcement
    const announcementUrl =
      Platform.OS === 'web'
        ? '/api/announcement'
        : `${process.env.EXPO_PUBLIC_API_PROXY_URL || 'https://leafscan.de'}/api/announcement`;
    fetch(announcementUrl)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.message) setAnnouncement(data);
      })
      .catch(() => {});

    // Non-critical: run in background without blocking splash
    initReferenceImages().catch((err) => console.warn('[LeafScan] initReferenceImages error:', err));
    cleanupStorage()
      .then(({ archived, deleted }) => {
        if (archived > 0 || deleted > 0) {
          if (__DEV__) console.log(`[LeafScan] Storage cleanup: ${archived} archived, ${deleted} deleted`);
        }
      })
      .catch(() => {});

    // Web PWA setup: register service worker + inject manifest link + responsive CSS
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      // Manifest link
      if (!document.querySelector('link[rel="manifest"]')) {
        const link = document.createElement('link');
        link.rel = 'manifest';
        link.href = '/manifest.json';
        document.head.appendChild(link);
      }
      // Apple touch icon
      if (!document.querySelector('link[rel="apple-touch-icon"]')) {
        const apple = document.createElement('link');
        apple.rel = 'apple-touch-icon';
        apple.href = '/icon-512.png';
        document.head.appendChild(apple);
      }
      // Apple web app meta
      if (!document.querySelector('meta[name="apple-mobile-web-app-capable"]')) {
        const meta = document.createElement('meta');
        meta.name = 'apple-mobile-web-app-capable';
        meta.content = 'yes';
        document.head.appendChild(meta);
      }
      // Responsive desktop container CSS
      if (!document.getElementById('pwa-responsive-css')) {
        const style = document.createElement('style');
        style.id = 'pwa-responsive-css';
        style.textContent = `
          html, body, #root { background: #080C0A; }
          @media (min-width: 768px) {
            body { background: #000000; }
            #root {
              max-width: ${PHONE_FRAME_WIDTH}px;
              margin: 20px auto;
              min-height: calc(100vh - 40px);
              border-radius: 24px;
              box-shadow:
                0 0 40px rgba(92,232,146,0.06),
                0 0 80px rgba(92,232,146,0.03),
                0 0 160px rgba(92,232,146,0.015);
              overflow: hidden;
              position: relative;
            }
          }
          ::-webkit-scrollbar { width: 0; height: 0; }
          * { -webkit-tap-highlight-color: transparent; }
        `;
        document.head.appendChild(style);
      }
    }
  }, []);

  return (
    <View style={rootStyles.container}>
      <DiagnosisContext.Provider
        value={{
          imageUri,
          setImageUri,
          imageUris,
          setImageUris,
          optimizedImageUris,
          questionnaire,
          setQuestionnaire,
          result,
          setResult,
          selectedPlantId,
          setSelectedPlantId,
          isFollowUp,
          setIsFollowUp,
          previousResult,
          setPreviousResult,
          previousDate,
          setPreviousDate,
          reset,
        }}
      >
        <StatusBar style="light" />
        {announcement && (
          <View
            style={[
              rootStyles.banner,
              announcement.type === 'warning'
                ? rootStyles.bannerWarning
                : announcement.type === 'success'
                  ? rootStyles.bannerSuccess
                  : rootStyles.bannerInfo,
            ]}
          >
            <Text style={rootStyles.bannerText}>{announcement.message}</Text>
            <TouchableOpacity
              onPress={() => setAnnouncement(null)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Text style={rootStyles.bannerClose}>✕</Text>
            </TouchableOpacity>
          </View>
        )}
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: colors.background },
            headerShadowVisible: false,
            headerTintColor: colors.accent,
            headerTitleStyle: { fontWeight: '500', color: colors.text },
            contentStyle: { backgroundColor: colors.background },
            animation: 'fade',
            animationDuration: 150,
            navigationBarColor: colors.background,
            presentation: 'card',
          }}
        >
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="onboarding" options={{ headerShown: false, animation: 'fade' }} />
          <Stack.Screen name="camera" options={{ title: t('nav.camera') }} />
          <Stack.Screen name="questionnaire" options={{ title: t('nav.questionnaire'), headerShown: false }} />
          <Stack.Screen name="analyzing" options={{ title: t('nav.analysis'), headerBackVisible: false }} />
          <Stack.Screen name="results" options={{ title: t('nav.results') }} />
          <Stack.Screen name="history" options={{ title: t('nav.history') }} />
          <Stack.Screen name="plants" options={{ title: t('nav.plants') }} />
          <Stack.Screen name="plant-detail" options={{ title: t('nav.plant') }} />
          <Stack.Screen name="add-plant" options={{ title: t('nav.addPlant') }} />
          <Stack.Screen name="library" options={{ title: t('nav.library') }} />
          <Stack.Screen name="privacy" options={{ title: t('nav.privacy') }} />
          <Stack.Screen
            name="paywall"
            options={{ title: t('nav.premium'), presentation: 'modal', headerShown: false }}
          />
          <Stack.Screen name="login" options={{ headerShown: false }} />
          <Stack.Screen name="register" options={{ headerShown: false }} />
          <Stack.Screen name="diary" options={{ title: t('nav.diary') }} />
          <Stack.Screen name="impressum" options={{ title: t('nav.impressum') }} />
          <Stack.Screen name="terms" options={{ title: t('nav.terms') }} />
        </Stack>
        {Platform.OS === 'web' && <CookieConsent />}
      </DiagnosisContext.Provider>
    </View>
  );
}

const rootStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 10,
  },
  bannerInfo: { backgroundColor: '#1565C0' },
  bannerWarning: { backgroundColor: '#E65100' },
  bannerSuccess: { backgroundColor: '#2E7D32' },
  bannerText: { flex: 1, color: '#fff', fontSize: 13, fontWeight: '500' },
  bannerClose: { color: 'rgba(255,255,255,0.7)', fontSize: 16, fontWeight: '700' },
});
