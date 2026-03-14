import React from 'react';
import { ScrollView, View, Image, StyleSheet, Text } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import DiagnosisCard from '../components/DiagnosisCard';
import { FactorsList, ActionPlan, PreventiveTips } from '../components/RecommendationCard';
import Button from '../components/Button';
import { colors } from '../constants/colors';
import { useDiagnosis } from './_layout';
import { DiagnosisResult } from '../types';

export default function ResultsScreen() {
  const router = useRouter();
  const { result, imageUri, reset } = useDiagnosis();
  const params = useLocalSearchParams<{ historyResult?: string; historyImage?: string }>();

  const displayResult: DiagnosisResult | null = params.historyResult
    ? JSON.parse(params.historyResult)
    : result;

  const displayImage = params.historyImage || imageUri;

  if (!displayResult) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>Keine Diagnose vorhanden.</Text>
        <Button title="Zurück" onPress={() => router.back()} />
      </View>
    );
  }

  const startNew = () => {
    reset();
    router.replace('/');
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {displayImage && (
        <Image source={{ uri: displayImage }} style={styles.image} resizeMode="cover" />
      )}

      <DiagnosisCard result={displayResult} />

      {displayResult.contributingFactors?.length > 0 && (
        <FactorsList factors={displayResult.contributingFactors} />
      )}

      {displayResult.actionPlan?.length > 0 && (
        <ActionPlan steps={displayResult.actionPlan} />
      )}

      {displayResult.preventiveTips?.length > 0 && (
        <PreventiveTips tips={displayResult.preventiveTips} />
      )}

      <Button title="Neue Diagnose" onPress={startNew} style={styles.newBtn} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  image: {
    width: '100%',
    height: 200,
    borderRadius: 20,
    marginBottom: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: colors.background,
    gap: 16,
  },
  emptyText: {
    fontSize: 16,
    color: colors.textMuted,
  },
  newBtn: {
    marginTop: 8,
  },
});
