import React, { createContext, useContext, useState, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { QuestionnaireData, DiagnosisResult } from '../types';
import { colors } from '../constants/colors';
import { setupNotificationHandler } from '../services/notifications';

SplashScreen.preventAutoHideAsync();
setupNotificationHandler();

interface DiagnosisContextType {
  imageUri: string | null;
  setImageUri: (uri: string | null) => void;
  imageUris: string[];
  setImageUris: (uris: string[]) => void;
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
  plantAgeWeeks: null,
  substrateType: null,
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
  const [imageUris, setImageUris] = useState<string[]>([]);
  const [questionnaire, setQuestionnaire] = useState<QuestionnaireData>({ ...emptyQuestionnaire });
  const [result, setResult] = useState<DiagnosisResult | null>(null);
  const [selectedPlantId, setSelectedPlantId] = useState<string | null>(null);
  const [isFollowUp, setIsFollowUp] = useState(false);
  const [previousResult, setPreviousResult] = useState<DiagnosisResult | null>(null);
  const [previousDate, setPreviousDate] = useState<string | null>(null);

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
    setQuestionnaire({ ...emptyQuestionnaire });
    setResult(null);
    setSelectedPlantId(null);
    setIsFollowUp(false);
    setPreviousResult(null);
    setPreviousDate(null);
  };

  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  return (
    <View style={rootStyles.container}>
    <DiagnosisContext.Provider
      value={{
        imageUri, setImageUri,
        imageUris, setImageUris,
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
        <Stack.Screen name="camera" options={{ title: 'Foto aufnehmen' }} />
        <Stack.Screen name="questionnaire" options={{ title: 'Fragebogen', headerShown: false }} />
        <Stack.Screen name="analyzing" options={{ title: 'Analyse', headerBackVisible: false }} />
        <Stack.Screen name="results" options={{ title: 'Ergebnisse' }} />
        <Stack.Screen name="history" options={{ title: 'Verlauf' }} />
        <Stack.Screen name="plants" options={{ title: 'Meine Pflanzen' }} />
        <Stack.Screen name="plant-detail" options={{ title: 'Pflanze' }} />
        <Stack.Screen name="add-plant" options={{ title: 'Neue Pflanze' }} />
        <Stack.Screen name="library" options={{ title: 'Bibliothek' }} />
      </Stack>
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
