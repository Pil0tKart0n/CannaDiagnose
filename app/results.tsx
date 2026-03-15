import React, { useState, useRef } from 'react';
import { ScrollView, View, Image, StyleSheet, Text, TouchableOpacity, ActivityIndicator, Alert, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import DiagnosisCard from '../components/DiagnosisCard';
import { FactorsList, ActionPlan, PreventiveTips } from '../components/RecommendationCard';
import Button from '../components/Button';
import { colors } from '../constants/colors';
import { useDiagnosis } from './_layout';
import { DiagnosisResult } from '../types';
import { shareDiagnosis } from '../services/export';
import { refineDiagnosis } from '../services/claude';
import { getFertilizerNames } from '../constants/fertilizers';

export default function ResultsScreen() {
  const router = useRouter();
  const { result, setResult, questionnaire, imageUri, imageUris, reset, selectedPlantId, isFollowUp } = useDiagnosis();
  const params = useLocalSearchParams<{ historyResult?: string; historyImage?: string; historyImages?: string }>();
  const [sharing, setSharing] = useState(false);
  const [refineOpen, setRefineOpen] = useState(false);
  const [refineLoading, setRefineLoading] = useState(false);
  const [refined, setRefined] = useState(false);
  const [phInput, setPhInput] = useState('');
  const [ecInput, setEcInput] = useState('');
  const [fertilizerInput, setFertilizerInput] = useState<string | null>(null);
  const [fertilizerPickerOpen, setFertilizerPickerOpen] = useState(false);
  const [fertilizerSearch, setFertilizerSearch] = useState('');
  const scrollRef = useRef<ScrollView>(null);
  const refineYRef = useRef(0);

  const [refinedResult, setRefinedResult] = useState<DiagnosisResult | null>(null);

  const displayResult: DiagnosisResult | null = refinedResult
    ? refinedResult
    : params.historyResult
      ? JSON.parse(params.historyResult)
      : result;

  const displayImage = params.historyImage || imageUri;
  const historyImagesParsed: string[] = params.historyImages ? JSON.parse(params.historyImages) : [];
  const displayImages = historyImagesParsed.length > 0
    ? historyImagesParsed
    : imageUris.length > 0
      ? imageUris
      : (displayImage ? [displayImage] : []);
  const isFromHistory = !!params.historyResult;

  console.log('[CannaDiagnose] Results - displayResult:', JSON.stringify(displayResult)?.substring(0, 300));
  console.log('[CannaDiagnose] Results - context result:', JSON.stringify(result)?.substring(0, 300));

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

  const handleRefine = async () => {
    if (!phInput && !ecInput) {
      Alert.alert('Fehlende Daten', 'Bitte gib mindestens einen pH- oder EC-Wert ein.');
      return;
    }
    setRefineLoading(true);
    try {
      const allUris = imageUris.length > 0 ? imageUris : (displayImage ? [displayImage] : []);
      const refined = await refineDiagnosis(
        allUris,
        displayResult!,
        questionnaire.substrateType,
        phInput || null,
        ecInput || null,
        fertilizerInput,
        questionnaire.plantAgeWeeks,
      );
      setRefinedResult(refined);
      setRefined(true);
      setRefineOpen(false);
    } catch (err: any) {
      Alert.alert('Fehler', err.message || 'Verfeinerung fehlgeschlagen.');
    } finally {
      setRefineLoading(false);
    }
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
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
    <ScrollView
      ref={scrollRef}
      style={styles.scrollView}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
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

      {/* Refine Card */}
      {!isFromHistory && !refined && (
        <View
          style={styles.refineCard}
          onLayout={(e) => { refineYRef.current = e.nativeEvent.layout.y; }}
        >
          <TouchableOpacity
            onPress={() => setRefineOpen(!refineOpen)}
            style={styles.refineHeader}
            activeOpacity={0.7}
          >
            <View style={styles.refineHeaderLeft}>
              <Ionicons name="flask-outline" size={18} color={colors.accent} />
              <Text style={styles.refineTitle}>pH & EC nachtragen</Text>
            </View>
            <Ionicons
              name={refineOpen ? 'chevron-up' : 'chevron-down'}
              size={18}
              color={colors.textMuted}
            />
          </TouchableOpacity>

          {refineOpen && (
            <View style={styles.refineBody}>
              <Text style={styles.refineHint}>
                Für eine präzisere Diagnose — miss jetzt pH und EC und trag die Werte hier ein.
              </Text>

              <View style={styles.refineInputRow}>
                <View style={styles.refineInputGroup}>
                  <Text style={styles.refineLabel}>pH-Wert</Text>
                  <TextInput
                    style={styles.refineInput}
                    placeholder="z.B. 5.9"
                    placeholderTextColor={colors.textMuted}
                    keyboardType="decimal-pad"
                    value={phInput}
                    onChangeText={setPhInput}
                    onFocus={() => {
                      setTimeout(() => {
                        scrollRef.current?.scrollTo({ y: refineYRef.current, animated: true });
                      }, 300);
                    }}
                  />
                </View>
                <View style={styles.refineInputGroup}>
                  <Text style={styles.refineLabel}>EC / PPM</Text>
                  <TextInput
                    style={styles.refineInput}
                    placeholder="z.B. 1.2"
                    placeholderTextColor={colors.textMuted}
                    keyboardType="decimal-pad"
                    value={ecInput}
                    onChangeText={setEcInput}
                    onFocus={() => {
                      setTimeout(() => {
                        scrollRef.current?.scrollTo({ y: refineYRef.current, animated: true });
                      }, 300);
                    }}
                  />
                </View>
              </View>

              {/* Fertilizer selector */}
              <View style={styles.refineInputGroup}>
                <Text style={styles.refineLabel}>Dünger (optional)</Text>
                <TouchableOpacity
                  onPress={() => {
                    setFertilizerPickerOpen(!fertilizerPickerOpen);
                    if (!fertilizerPickerOpen) setFertilizerSearch('');
                  }}
                  style={styles.refineSelect}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.refineSelectText, !fertilizerInput && { color: colors.textMuted }]}>
                    {fertilizerInput || 'Dünger suchen & auswählen...'}
                  </Text>
                  <Ionicons
                    name={fertilizerPickerOpen ? 'chevron-up' : 'chevron-down'}
                    size={16}
                    color={colors.textMuted}
                  />
                </TouchableOpacity>
                {fertilizerPickerOpen && (
                  <View style={styles.fertilizerList}>
                    <TextInput
                      style={styles.fertilizerSearchInput}
                      placeholder="Dünger suchen..."
                      placeholderTextColor={colors.textMuted}
                      value={fertilizerSearch}
                      onChangeText={setFertilizerSearch}
                      autoFocus
                      onFocus={() => {
                        setTimeout(() => {
                          scrollRef.current?.scrollTo({ y: refineYRef.current + 100, animated: true });
                        }, 300);
                      }}
                    />
                    <ScrollView nestedScrollEnabled style={styles.fertilizerScroll}>
                      {getFertilizerNames()
                        .filter((name) => name.toLowerCase().includes(fertilizerSearch.toLowerCase()))
                        .map((name) => (
                        <TouchableOpacity
                          key={name}
                          onPress={() => {
                            setFertilizerInput(name === 'Anderer Dünger' || name === 'Kein Dünger / nur Wasser' ? null : name);
                            setFertilizerPickerOpen(false);
                            setFertilizerSearch('');
                          }}
                          style={[
                            styles.fertilizerOption,
                            fertilizerInput === name && styles.fertilizerOptionSelected,
                          ]}
                          activeOpacity={0.7}
                        >
                          <Text style={[
                            styles.fertilizerOptionText,
                            fertilizerInput === name && styles.fertilizerOptionTextSelected,
                          ]}>
                            {name}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                )}
              </View>

              <TouchableOpacity
                onPress={handleRefine}
                style={[styles.refineButton, refineLoading && styles.refineButtonDisabled]}
                activeOpacity={0.7}
                disabled={refineLoading}
              >
                {refineLoading ? (
                  <ActivityIndicator size="small" color={colors.textOnAccent} />
                ) : (
                  <>
                    <Ionicons name="refresh-outline" size={16} color={colors.textOnAccent} />
                    <Text style={styles.refineButtonText}>Analyse verfeinern</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}

      {refined && (
        <View style={styles.refinedBadge}>
          <Ionicons name="checkmark-circle" size={16} color={colors.accent} />
          <Text style={styles.refinedBadgeText}>Diagnose verfeinert mit pH/EC-Daten</Text>
        </View>
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
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
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
  refineCard: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.borderAccent,
    marginTop: 16,
    overflow: 'hidden',
  },
  refineHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
  },
  refineHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  refineTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.accent,
  },
  refineBody: {
    paddingHorizontal: 14,
    paddingBottom: 14,
    gap: 12,
  },
  refineHint: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  refineInputRow: {
    flexDirection: 'row',
    gap: 12,
  },
  refineInputGroup: {
    flex: 1,
    gap: 4,
  },
  refineLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  refineInput: {
    backgroundColor: colors.backgroundElevated,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    fontSize: 16,
    color: colors.text,
  },
  refineButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.accent,
    borderRadius: 10,
    paddingVertical: 12,
    marginTop: 4,
  },
  refineButtonDisabled: {
    opacity: 0.6,
  },
  refineButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textOnAccent,
  },
  refineSelect: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.backgroundElevated,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
  },
  refineSelectText: {
    fontSize: 14,
    color: colors.text,
    flex: 1,
  },
  fertilizerSearchInput: {
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingVertical: 10,
    paddingHorizontal: 14,
    fontSize: 14,
    color: colors.text,
  },
  fertilizerList: {
    backgroundColor: colors.backgroundElevated,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: 4,
    overflow: 'hidden',
  },
  fertilizerScroll: {
    maxHeight: 180,
  },
  fertilizerOption: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  fertilizerOptionSelected: {
    backgroundColor: colors.accentGlow,
  },
  fertilizerOptionText: {
    fontSize: 14,
    color: colors.text,
  },
  fertilizerOptionTextSelected: {
    color: colors.accent,
    fontWeight: '600',
  },
  refinedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.accentGlow,
    borderRadius: 10,
    padding: 12,
    marginTop: 12,
    borderWidth: 1,
    borderColor: colors.borderAccent,
  },
  refinedBadgeText: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.accent,
    flex: 1,
  },
});
