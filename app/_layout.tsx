import React, { createContext, useContext, useState } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { QuestionnaireData, DiagnosisResult } from '../types';
import { colors } from '../constants/colors';

interface DiagnosisContextType {
  imageUri: string | null;
  setImageUri: (uri: string | null) => void;
  questionnaire: QuestionnaireData;
  setQuestionnaire: (data: QuestionnaireData) => void;
  result: DiagnosisResult | null;
  setResult: (result: DiagnosisResult | null) => void;
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
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [questionnaire, setQuestionnaire] = useState<QuestionnaireData>({ ...emptyQuestionnaire });
  const [result, setResult] = useState<DiagnosisResult | null>(null);

  const reset = () => {
    setImageUri(null);
    setQuestionnaire({ ...emptyQuestionnaire });
    setResult(null);
  };

  return (
    <DiagnosisContext.Provider
      value={{ imageUri, setImageUri, questionnaire, setQuestionnaire, result, setResult, reset }}
    >
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.accent,
          headerTitleStyle: { fontWeight: '600', color: colors.white },
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="camera" options={{ title: 'Foto aufnehmen' }} />
        <Stack.Screen name="questionnaire" options={{ title: 'Fragebogen' }} />
        <Stack.Screen
          name="analyzing"
          options={{ title: 'Analyse', headerBackVisible: false }}
        />
        <Stack.Screen name="results" options={{ title: 'Ergebnisse' }} />
        <Stack.Screen name="history" options={{ title: 'Verlauf' }} />
      </Stack>
    </DiagnosisContext.Provider>
  );
}
