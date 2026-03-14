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
  const { result, imageUri, reset, selectedPlantId, isFollowUp } = useDiagnosis();
  const params = useLocalSearchParams<{ historyResult?: string; historyImage?: string }>();

  const displayResult: DiagnosisResult | null = params.historyResult
    ? JSON.parse(params.historyResult)
    : result;

  const displayImage = params.historyImage || imageUri;
  const isFromHistory = !!params.historyResult;

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

      {displayResult.followUpDays && !isFromHistory && (
        <View style={styles.followUpInfo}>
          <Text style={styles.followUpInfoText}>
            Empfohlenes Follow-up in {displayResult.followUpDays} Tagen
          </Text>
        </View>
      )}

      {selectedPlantId && !isFromHistory ? (
        <View style={styles.btnRow}>
          <Button
            title="Zur Pflanze"
            onPress={() => {
              const pid = selectedPlantId;
              reset();
              router.replace({ pathname: '/plant-detail', params: { plantId: pid } });
            }}
            style={styles.newBtn}
          />
          <Button title="Neue Diagnose" onPress={startNew} variant="secondary" style={styles.newBtn} />
        </View>
      ) : (
        <Button title="Neue Diagnose" onPress={startNew} style={styles.newBtn} />
      )}
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
  followUpInfo: {
    backgroundColor: 'rgba(0,230,118,0.08)',
    borderRadius: 14,
    padding: 14,
    marginTop: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,230,118,0.15)',
    alignItems: 'center',
  },
  followUpInfoText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.accent,
  },
  btnRow: {
    gap: 8,
  },
});
