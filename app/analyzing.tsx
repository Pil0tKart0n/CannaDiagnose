import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { analyzePlant } from '../services/claude';
import { saveEntry, addEntryToPlant } from '../services/storage';
import { colors } from '../constants/colors';
import { useDiagnosis } from './_layout';

const loadingTexts = [
  'Analysiere Bild...',
  'Erkenne Symptome...',
  'Prüfe Anbaubedingungen...',
  'Kreuz-referenziere Faktoren...',
  'Erstelle Diagnose...',
];

export default function AnalyzingScreen() {
  const router = useRouter();
  const {
    imageUri, questionnaire, setResult,
    selectedPlantId, isFollowUp, previousResult, previousDate,
  } = useDiagnosis();
  const [textIndex, setTextIndex] = useState(0);
  const hasStarted = useRef(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setTextIndex((i) => (i + 1) % loadingTexts.length);
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (hasStarted.current) return;
    hasStarted.current = true;

    if (!imageUri) {
      Alert.alert('Fehler', 'Kein Bild vorhanden.');
      router.back();
      return;
    }

    analyzePlant(imageUri, questionnaire, {
      isFollowUp,
      previousResult: previousResult ?? undefined,
      previousDate: previousDate ?? undefined,
    })
      .then(async (result) => {
        setResult(result);
        const entryId = Date.now().toString();
        await saveEntry({
          id: entryId,
          date: new Date().toISOString(),
          imageUri,
          questionnaire,
          result,
          plantId: selectedPlantId ?? undefined,
        });
        if (selectedPlantId) {
          await addEntryToPlant(selectedPlantId, entryId);
        }
        router.replace('/results');
      })
      .catch((err) => {
        Alert.alert('Fehler bei der Analyse', err.message || 'Bitte versuche es erneut.', [
          { text: 'OK', onPress: () => router.back() },
        ]);
      });
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.pulseRing}>
        <View style={styles.pulseInner}>
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      </View>
      <Text style={styles.text}>{loadingTexts[textIndex]}</Text>
      <Text style={styles.sub}>Dies kann einige Sekunden dauern...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
    padding: 24,
  },
  pulseRing: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.accentGlow,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
    borderWidth: 1,
    borderColor: colors.borderAccent,
  },
  pulseInner: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.cardDark,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  text: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.accent,
    marginBottom: 8,
    textAlign: 'center',
  },
  sub: {
    fontSize: 14,
    color: colors.textMuted,
  },
});
