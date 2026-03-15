import React, { useState } from 'react';
import { ScrollView, View, Image, StyleSheet, Text, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import DiagnosisCard from '../components/DiagnosisCard';
import { FactorsList, ActionPlan, PreventiveTips } from '../components/RecommendationCard';
import Button from '../components/Button';
import { colors } from '../constants/colors';
import { useDiagnosis } from './_layout';
import { DiagnosisResult } from '../types';
import { shareDiagnosis } from '../services/export';

export default function ResultsScreen() {
  const router = useRouter();
  const { result, imageUri, imageUris, reset, selectedPlantId, isFollowUp } = useDiagnosis();
  const params = useLocalSearchParams<{ historyResult?: string; historyImage?: string }>();
  const [sharing, setSharing] = useState(false);

  const displayResult: DiagnosisResult | null = params.historyResult
    ? JSON.parse(params.historyResult)
    : result;

  const displayImage = params.historyImage || imageUri;
  const displayImages = imageUris.length > 0 ? imageUris : (displayImage ? [displayImage] : []);
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

  const handleShare = async () => {
    if (sharing) return;
    setSharing(true);
    try {
      await shareDiagnosis(displayResult, displayImage || undefined);
    } catch (err: any) {
      if (!err.message?.includes('abgebrochen') && !err.message?.includes('cancelled')) {
        Alert.alert('Fehler', err.message || 'Teilen fehlgeschlagen.');
      }
    } finally {
      setSharing(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Photos */}
      {displayImages.length > 1 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imageStrip}>
          {displayImages.map((uri, i) => (
            <Image key={`${uri}-${i}`} source={{ uri }} style={styles.imageThumb} resizeMode="cover" />
          ))}
        </ScrollView>
      ) : displayImage ? (
        <Image source={{ uri: displayImage }} style={styles.image} resizeMode="cover" />
      ) : null}

      {/* Share button */}
      <TouchableOpacity onPress={handleShare} style={styles.shareRow} activeOpacity={0.7}>
        {sharing ? (
          <ActivityIndicator size="small" color={colors.accent} />
        ) : (
          <Ionicons name="share-outline" size={18} color={colors.accent} />
        )}
        <Text style={styles.shareText}>Diagnose teilen</Text>
      </TouchableOpacity>

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
          <Ionicons name="notifications-outline" size={16} color={colors.accent} />
          <Text style={styles.followUpInfoText}>
            Follow-up in {displayResult.followUpDays} Tagen – du wirst erinnert
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
    height: 220,
    borderRadius: 16,
    marginBottom: 12,
  },
  imageStrip: {
    marginBottom: 12,
  },
  imageThumb: {
    width: 160,
    height: 160,
    borderRadius: 14,
    marginRight: 10,
  },
  shareRow: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-end',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 4,
    marginBottom: 4,
  },
  shareText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.accent,
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.accentGlow,
    borderRadius: 12,
    padding: 14,
    marginTop: 12,
    borderWidth: 1,
    borderColor: colors.borderAccent,
  },
  followUpInfoText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.accent,
    flex: 1,
  },
  btnRow: {
    gap: 8,
  },
});
