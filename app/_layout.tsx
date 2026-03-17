import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { QuestionnaireData, DiagnosisResult } from '../types';
import { colors } from '../constants/colors';
import { setupNotificationHandler } from '../services/notifications';
import { optimizeImage, initReferenceImages } from '../services/claude';
import { cleanupStorage } from '../services/storage';
import { initLanguage } from '../services/i18n';
import { initPurchases } from '../services/purchases';
import CookieConsent from '../components/CookieConsent';

SplashScreen.preventAutoHideAsync();
setupNotificationHandler();

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
      console.log('[LeafScan] Pre-optimizing', uris.length, 'images in background...');
      Promise.all(uris.map(optimizeImage))
        .then((optimized) => {
          setOptimizedImageUris(optimized);
          console.log('[LeafScan] Pre-optimization complete');
        })
        .catch((err) => {
          console.log('[LeafScan] Pre-optimization failed:', err);
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
    setQuestionnaire({ ...emptyQuestionnaire });
    setResult(null);
    setSelectedPlantId(null);
    setIsFollowUp(false);
    setPreviousResult(null);
    setPreviousDate(null);
  };

  useEffect(() => {
    SplashScreen.hideAsync();
    // Copy bundled reference images to documentDirectory on first launch
    initReferenceImages().catch((err) =>
      console.log('[LeafScan] initReferenceImages error:', err)
    );
    // Init language from device/storage
    initLanguage().catch(() => {});
    // Init RevenueCat purchases
    initPurchases().catch(() => {});
    // Cleanup old storage entries
    cleanupStorage().then(({ archived, deleted }) => {
      if (archived > 0 || deleted > 0) {
        console.log(`[LeafScan] Storage cleanup: ${archived} archived, ${deleted} deleted`);
      }
    }).catch(() => {});

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
        apple.href = '/assets/icon.png';
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
          html, body, #root { background: #0A0E0D; }
          @media (min-width: 768px) {
            body { background: #050805; }
            #root {
              max-width: 480px !important;
              margin: 0 auto !important;
              min-height: 100vh;
              box-shadow: 0 0 60px rgba(0,0,0,0.5);
              border-left: 1px solid rgba(74,222,128,0.08);
              border-right: 1px solid rgba(74,222,128,0.08);
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
        imageUri, setImageUri,
        imageUris, setImageUris,
        optimizedImageUris,
        questionnaire, setQuestionnaire,
        result, setResult,
        selectedPlantId, setSelectedPlantId,
        isFollowUp, setIsFollowUp,
        previousResult, setPreviousResult,
        previousDate, setPreviousDate,
        reset,
      }}
    >
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.background },
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
        <Stack.Screen name="camera" options={{ title: 'Foto aufnehmen' }} />
        <Stack.Screen name="questionnaire" options={{ title: 'Fragebogen', headerShown: false }} />
        <Stack.Screen name="analyzing" options={{ title: 'Analyse', headerBackVisible: false }} />
        <Stack.Screen name="results" options={{ title: 'Ergebnisse' }} />
        <Stack.Screen name="history" options={{ title: 'Verlauf' }} />
        <Stack.Screen name="plants" options={{ title: 'Meine Pflanzen' }} />
        <Stack.Screen name="plant-detail" options={{ title: 'Pflanze' }} />
        <Stack.Screen name="add-plant" options={{ title: 'Neue Pflanze' }} />
        <Stack.Screen name="library" options={{ title: 'Bibliothek' }} />
        <Stack.Screen name="privacy" options={{ title: 'Datenschutz' }} />
        <Stack.Screen name="paywall" options={{ title: 'Premium', presentation: 'modal', headerShown: false }} />
        <Stack.Screen name="impressum" options={{ title: 'Impressum' }} />
        <Stack.Screen name="terms" options={{ title: 'Nutzungsbedingungen' }} />
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
});
