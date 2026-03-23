import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Image,
  Platform,
  RefreshControl,
  TextInput,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { getPlant, getEntriesForPlant, deleteEntry, savePlant } from '../services/storage';
import { cancelReminder } from '../services/notifications';
import { Plant, DiagnosisEntry, Severity, getEntryImageUris } from '../types';
import { colors } from '../constants/colors';
import { confirmAlert } from '../services/alert';
import { useDiagnosis } from './_layout';
import { t, getLang } from '../services/i18n';

const severityColor: Record<Severity, string> = {
  niedrig: colors.severityLow,
  mittel: colors.severityMedium,
  hoch: colors.severityHigh,
  kritisch: colors.severityCritical,
};

const getSeverityLabel = (): Record<Severity, string> => ({
  niedrig: t('plantDetail.severityLow'),
  mittel: t('plantDetail.severityMedium'),
  hoch: t('plantDetail.severityHigh'),
  kritisch: t('plantDetail.severityCritical'),
});

export default function PlantDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ plantId: string }>();
  const diagnosis = useDiagnosis();
  const [plant, setPlant] = useState<Plant | null>(null);
  const [entries, setEntries] = useState<DiagnosisEntry[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  // Edit mode state
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editStrain, setEditStrain] = useState('');
  const [editImageUri, setEditImageUri] = useState<string | undefined>(undefined);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [params.plantId]),
  );

  const loadData = async () => {
    if (!params.plantId) return;
    const p = await getPlant(params.plantId);
    setPlant(p);
    if (p) {
      const e = await getEntriesForPlant(p.id);
      setEntries(e);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await loadData();
    setRefreshing(false);
  };

  const startEditing = () => {
    if (!plant) return;
    setEditName(plant.name);
    setEditStrain(plant.strain || '');
    setEditImageUri(plant.imageUri);
    setEditing(true);
  };

  const cancelEditing = () => {
    setEditing(false);
  };

  const pickEditImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.7,
      allowsEditing: true,
      aspect: [1, 1],
    });
    if (!result.canceled && result.assets[0]) {
      setEditImageUri(result.assets[0].uri);
    }
  };

  const handleSaveEdit = async () => {
    if (!plant) return;
    const trimmed = editName.trim();
    if (!trimmed) {
      Alert.alert(t('plantDetail.nameMissing'), t('plantDetail.nameRequired'));
      return;
    }
    const updated: Plant = {
      ...plant,
      name: trimmed,
      strain: editStrain.trim() || undefined,
      imageUri: editImageUri,
    };
    await savePlant(updated);
    setPlant(updated);
    setEditing(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const startFollowUp = async () => {
    if (!plant || entries.length === 0) return;
    const latest = entries[0];
    // Cancel the previous follow-up reminder since user is acting on it now
    await cancelReminder(latest.id);
    diagnosis.reset();
    diagnosis.setSelectedPlantId(plant.id);
    diagnosis.setIsFollowUp(true);
    diagnosis.setPreviousResult(latest.result);
    diagnosis.setPreviousDate(latest.date);
    router.push('/camera');
  };

  const startNewDiagnosis = () => {
    if (!plant) return;
    diagnosis.reset();
    diagnosis.setSelectedPlantId(plant.id);
    router.push('/camera');
  };

  const handleDeleteEntry = (entryId: string) => {
    confirmAlert(t('plantDetail.deleteEntry'), t('plantDetail.deleteEntryMsg'), async () => {
      await deleteEntry(entryId);
      loadData();
    });
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    const locale = getLang() === 'en' ? 'en-US' : 'de-DE';
    return d.toLocaleDateString(locale, { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    const locale = getLang() === 'en' ? 'en-US' : 'de-DE';
    return d.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
  };

  const getFollowUpInfo = () => {
    if (entries.length === 0) return null;
    const latest = entries[0];
    const days = typeof latest.result.followUpDays === 'number' ? latest.result.followUpDays : 0;
    if (days <= 0) return null;
    const due = new Date(new Date(latest.date).getTime() + days * 86400000);
    if (isNaN(due.getTime())) return null;
    const now = new Date();
    const daysLeft = Math.ceil((due.getTime() - now.getTime()) / 86400000);
    return { due, daysLeft, isDue: daysLeft <= 0 };
  };

  if (!plant) {
    return (
      <View style={styles.container}>
        <Text style={styles.emptyText}>{t('plantDetail.notFound')}</Text>
      </View>
    );
  }

  const followUp = getFollowUpInfo();

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.accent}
            colors={[colors.accent]}
            progressBackgroundColor={colors.cardDark}
          />
        }
      >
        {/* Plant Header */}
        <View style={styles.header}>
          {editing ? (
            <TouchableOpacity onPress={pickEditImage} activeOpacity={0.7}>
              {editImageUri ? (
                <Image source={{ uri: editImageUri }} style={styles.plantImage} />
              ) : (
                <View style={[styles.plantImage, styles.plantImageEmpty]}>
                  <Ionicons name="camera-outline" size={28} color={colors.textMuted} />
                </View>
              )}
              <View style={styles.editImageOverlay}>
                <Ionicons name="camera-outline" size={16} color="#fff" />
              </View>
            </TouchableOpacity>
          ) : plant.imageUri ? (
            <Image source={{ uri: plant.imageUri }} style={styles.plantImage} />
          ) : (
            <View style={[styles.plantImage, styles.plantImageEmpty]}>
              <Text style={styles.plantImageText}>🌱</Text>
            </View>
          )}
          <View style={styles.headerInfo}>
            {editing ? (
              <>
                <TextInput
                  style={styles.editInput}
                  value={editName}
                  onChangeText={setEditName}
                  placeholder={t('plantDetail.plantName')}
                  placeholderTextColor={colors.textMuted}
                  autoFocus
                />
                <TextInput
                  style={[styles.editInput, styles.editInputSmall]}
                  value={editStrain}
                  onChangeText={setEditStrain}
                  placeholder={t('plantDetail.strainNote')}
                  placeholderTextColor={colors.textMuted}
                />
              </>
            ) : (
              <>
                <View style={styles.nameRow}>
                  <Text style={styles.plantName}>{plant.name}</Text>
                  <TouchableOpacity onPress={startEditing} style={styles.editBtn} activeOpacity={0.7}>
                    <Ionicons name="create-outline" size={20} color={colors.textSecondary} />
                  </TouchableOpacity>
                </View>
                {plant.strain && <Text style={styles.plantStrain}>{plant.strain}</Text>}
              </>
            )}
            <Text style={styles.plantDate}>{t('plantDetail.createdOn', { date: formatDate(plant.createdAt) })}</Text>
          </View>
        </View>

        {/* Edit mode save/cancel buttons */}
        {editing && (
          <View style={styles.editActions}>
            <TouchableOpacity onPress={cancelEditing} style={styles.editCancelBtn} activeOpacity={0.7}>
              <Text style={styles.editCancelBtnText}>{t('plantDetail.cancel')}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleSaveEdit} activeOpacity={0.85}>
              <LinearGradient
                colors={['#5AEF90', '#4ADE80', '#3CC870']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.editSaveBtn}
              >
                <Text style={styles.editSaveBtnText}>{t('plantDetail.save')}</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}

        {/* Follow-Up Banner */}
        {followUp && (
          <View style={[styles.followUpBanner, followUp.isDue && styles.followUpBannerDue]}>
            <Text style={[styles.followUpBannerText, followUp.isDue && styles.followUpBannerTextDue]}>
              {followUp.isDue
                ? t('plantDetail.followUpDue')
                : t('plantDetail.followUpIn', {
                    days: followUp.daysLeft,
                    unit: followUp.daysLeft === 1 ? t('plantDetail.day') : t('plantDetail.days'),
                  })}
            </Text>
            {followUp.isDue && (
              <TouchableOpacity onPress={startFollowUp} style={styles.followUpBannerBtn}>
                <Text style={styles.followUpBannerBtnText}>{t('plantDetail.startNow')}</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Severity Trend Chart */}
        {entries.length > 0 &&
          (() => {
            const CHART_HEIGHT = 120;
            const DOT_SIZE = 10;
            const severityPosition: Record<Severity, number> = {
              niedrig: 0,
              mittel: 0.33,
              hoch: 0.66,
              kritisch: 1,
            };
            // Take last 8 entries, reversed so oldest is first (left)
            const chartEntries = entries.slice(0, 8).reverse();
            const pointCount = chartEntries.length;

            return (
              <View style={styles.trendSection}>
                <Text style={styles.sectionTitle}>{t('plantDetail.healthTrend')}</Text>
                <View style={styles.trendCard}>
                  {/* Y-axis labels */}
                  <View style={styles.trendYAxis}>
                    <Text style={[styles.trendYLabel, { top: 0 }]}>{t('plantDetail.severityCritical')}</Text>
                    <Text style={[styles.trendYLabel, { top: CHART_HEIGHT * 0.34 - 6 }]}>
                      {t('plantDetail.severityHigh')}
                    </Text>
                    <Text style={[styles.trendYLabel, { top: CHART_HEIGHT * 0.67 - 6 }]}>
                      {t('plantDetail.severityMedium')}
                    </Text>
                    <Text style={[styles.trendYLabel, { bottom: 0 }]}>{t('plantDetail.severityLow')}</Text>
                  </View>

                  {/* Chart area */}
                  <View style={[styles.trendChartArea, { height: CHART_HEIGHT }]}>
                    {/* Grid lines */}
                    {[0, 0.33, 0.66, 1].map((pos, i) => (
                      <View
                        key={`grid-${i}`}
                        style={{
                          position: 'absolute',
                          left: 0,
                          right: 0,
                          bottom: pos * (CHART_HEIGHT - DOT_SIZE),
                          height: 1,
                          backgroundColor: colors.border,
                        }}
                      />
                    ))}

                    {/* Connecting lines */}
                    {pointCount > 1 &&
                      chartEntries.map((entry, index) => {
                        if (index === 0) return null;
                        const prev = chartEntries[index - 1];
                        const prevX = (index - 1) / (pointCount - 1);
                        const currX = index / (pointCount - 1);
                        const prevY = severityPosition[prev.result.severity];
                        const currY = severityPosition[entry.result.severity];

                        const x1Pct = prevX * 100;
                        const x2Pct = currX * 100;
                        const y1 = prevY * (CHART_HEIGHT - DOT_SIZE);
                        const y2 = currY * (CHART_HEIGHT - DOT_SIZE);
                        const midColor = severityColor[entry.result.severity];

                        return (
                          <View
                            key={`line-${index}`}
                            style={{
                              position: 'absolute',
                              left: `${x1Pct}%` as any,
                              bottom: Math.min(y1, y2) + DOT_SIZE / 2 - 1,
                              width: `${x2Pct - x1Pct}%` as any,
                              height: Math.abs(y2 - y1) + 2,
                              overflow: 'visible',
                            }}
                          >
                            <View
                              style={{
                                position: 'absolute',
                                left: 0,
                                right: 0,
                                top: y1 > y2 ? 0 : undefined,
                                bottom: y1 <= y2 ? 0 : undefined,
                                height: 2,
                                backgroundColor: midColor,
                                opacity: 0.5,
                                // Diagonal effect: we fake it with a simple horizontal line at midpoint
                              }}
                            />
                          </View>
                        );
                      })}

                    {/* Dots */}
                    {chartEntries.map((entry, index) => {
                      const sev = entry.result.severity;
                      const color = severityColor[sev];
                      const yPos = severityPosition[sev] * (CHART_HEIGHT - DOT_SIZE);
                      const xPct = pointCount > 1 ? (index / (pointCount - 1)) * 100 : 50;

                      return (
                        <View
                          key={`dot-${index}`}
                          style={{
                            position: 'absolute',
                            left: `${xPct}%` as any,
                            bottom: yPos,
                            marginLeft: -DOT_SIZE / 2,
                            width: DOT_SIZE,
                            height: DOT_SIZE,
                            borderRadius: DOT_SIZE / 2,
                            backgroundColor: color,
                            borderWidth: 2,
                            borderColor: colors.cardDark,
                            zIndex: 2,
                          }}
                        />
                      );
                    })}
                  </View>

                  {/* X-axis date labels */}
                  <View style={styles.trendXAxis}>
                    {chartEntries.map((entry, index) => {
                      const xPct = pointCount > 1 ? (index / (pointCount - 1)) * 100 : 50;
                      const d = new Date(entry.date);
                      const label = `${d.getDate()}.${d.getMonth() + 1}`;
                      return (
                        <Text
                          key={`label-${index}`}
                          style={[
                            styles.trendXLabel,
                            {
                              position: 'absolute',
                              left: `${xPct}%` as any,
                              transform: [{ translateX: -16 }],
                            },
                          ]}
                        >
                          {label}
                        </Text>
                      );
                    })}
                  </View>
                </View>
              </View>
            );
          })()}

        {/* Timeline */}
        <Text style={styles.sectionTitle}>{t('plantDetail.diagnosisHistory', { count: entries.length })}</Text>

        {entries.length === 0 ? (
          <View style={styles.emptyTimeline}>
            <Text style={styles.emptyTimelineText}>{t('plantDetail.emptyTimeline')}</Text>
          </View>
        ) : (
          entries.map((entry, index) => {
            const sev = entry.result.severity;
            const color = severityColor[sev];
            return (
              <View key={entry.id} style={styles.timelineItem}>
                {/* Timeline line */}
                <View style={styles.timelineLine}>
                  <View style={[styles.timelineDot, { backgroundColor: color }]} />
                  {index < entries.length - 1 && <View style={styles.timelineConnector} />}
                </View>

                {/* Entry card */}
                <TouchableOpacity
                  style={styles.entryCard}
                  activeOpacity={0.7}
                  onPress={() => {
                    const uris = getEntryImageUris(entry);
                    router.push({
                      pathname: '/results',
                      params: {
                        historyResult: JSON.stringify(entry.result),
                        historyImage: uris[0] || entry.imageUri,
                        historyImages: JSON.stringify(uris),
                      },
                    });
                  }}
                  onLongPress={() => handleDeleteEntry(entry.id)}
                >
                  <View style={styles.entryHeader}>
                    <Text style={styles.entryDate}>{formatDate(entry.date)}</Text>
                    <Text style={styles.entryTime}>{formatTime(entry.date)}</Text>
                    <View style={[styles.severityBadge, { backgroundColor: `${color}18` }]}>
                      <View style={[styles.severityDot, { backgroundColor: color }]} />
                      <Text style={[styles.severityText, { color }]}>{getSeverityLabel()[sev]}</Text>
                    </View>
                  </View>

                  <View style={styles.entryBody}>
                    {(getEntryImageUris(entry)[0] || entry.imageUri) && (
                      <Image
                        source={{ uri: getEntryImageUris(entry)[0] || entry.imageUri }}
                        style={styles.entryThumb}
                      />
                    )}
                    <View style={styles.entryInfo}>
                      <Text style={styles.entryDiagnosis} numberOfLines={2}>
                        {entry.result.primaryDiagnosis}
                      </Text>
                      {entry.result.followUpDays && (
                        <Text style={styles.entryFollowUp}>
                          {t('plantDetail.followUpDays', { days: entry.result.followUpDays })}
                        </Text>
                      )}
                    </View>
                  </View>
                </TouchableOpacity>
              </View>
            );
          })
        )}
      </ScrollView>

      {/* Bottom Actions */}
      <View style={styles.bottomBar}>
        {entries.length > 0 && followUp?.isDue ? (
          <TouchableOpacity onPress={startFollowUp} activeOpacity={0.85}>
            <LinearGradient
              colors={['#5AEF90', '#4ADE80', '#3CC870']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.actionBtn}
            >
              <Text style={styles.actionBtnText}>{t('plantDetail.followUpDiagnosis')}</Text>
            </LinearGradient>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity onPress={startNewDiagnosis} activeOpacity={0.85}>
            <LinearGradient
              colors={['#5AEF90', '#4ADE80', '#3CC870']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.actionBtn}
            >
              <Text style={styles.actionBtnText}>
                {entries.length === 0 ? t('plantDetail.firstDiagnosis') : t('plantDetail.newDiagnosis')}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scrollContent: { padding: 16, paddingBottom: 100 },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  plantImage: {
    width: 72,
    height: 72,
    borderRadius: 22,
  },
  plantImageEmpty: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  plantImageText: { fontSize: 32 },
  headerInfo: { flex: 1, marginLeft: 16 },
  plantName: { fontSize: 22, fontWeight: '600', color: colors.text },
  plantStrain: { fontSize: 14, color: colors.textSecondary, marginTop: 2 },
  plantDate: { fontSize: 12, color: colors.textMuted, marginTop: 4 },

  // Follow-up banner
  followUpBanner: {
    backgroundColor: colors.cardDark,
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  followUpBannerDue: {
    backgroundColor: colors.accentGlow,
    borderColor: colors.borderAccent,
  },
  followUpBannerText: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  followUpBannerTextDue: {
    color: colors.accent,
  },
  followUpBannerBtn: {
    marginTop: 10,
    backgroundColor: colors.accentSubtle,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 16,
    alignSelf: 'flex-start',
  },
  followUpBannerBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.accent,
  },

  // Section
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 16,
  },

  // Severity Trend Chart
  trendSection: {
    marginBottom: 20,
  },
  trendCard: {
    backgroundColor: colors.cardDark,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    paddingLeft: 52,
  },
  trendYAxis: {
    position: 'absolute',
    left: 8,
    top: 16,
    bottom: 36,
    width: 40,
    justifyContent: 'space-between',
  },
  trendYLabel: {
    fontSize: 9,
    color: colors.textMuted,
    position: 'absolute',
    left: 0,
  },
  trendChartArea: {
    position: 'relative',
    width: '100%',
  },
  trendXAxis: {
    position: 'relative',
    height: 20,
    marginTop: 8,
  },
  trendXLabel: {
    fontSize: 10,
    color: colors.textMuted,
    width: 32,
    textAlign: 'center',
  },

  // Empty
  emptyText: { color: colors.textMuted, fontSize: 16, textAlign: 'center', marginTop: 60 },
  emptyTimeline: {
    padding: 24,
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderRadius: 16,
  },
  emptyTimelineText: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
  },

  // Timeline
  timelineItem: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  timelineLine: {
    width: 24,
    alignItems: 'center',
    paddingTop: 6,
  },
  timelineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  timelineConnector: {
    width: 2,
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
    marginTop: 4,
  },

  // Entry card
  entryCard: {
    flex: 1,
    marginLeft: 8,
    backgroundColor: colors.cardDark,
    borderRadius: 16,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.border,
    ...Platform.select({
      web: { boxShadow: '0 2px 10px rgba(0,0,0,0.2)' },
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 8 },
      android: { elevation: 3 },
    }),
  },
  entryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  entryDate: { fontSize: 13, fontWeight: '600', color: colors.text },
  entryTime: { fontSize: 12, color: colors.textMuted, marginLeft: 8 },
  severityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 'auto',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  severityDot: { width: 6, height: 6, borderRadius: 3, marginRight: 5 },
  severityText: { fontSize: 11, fontWeight: '600', letterSpacing: 0.5 },

  entryBody: { flexDirection: 'row' },
  entryThumb: {
    width: 48,
    height: 48,
    borderRadius: 12,
  },
  entryInfo: { flex: 1, marginLeft: 12 },
  entryDiagnosis: { fontSize: 13, color: colors.textSecondary, lineHeight: 18 },
  entryFollowUp: { fontSize: 11, color: colors.textMuted, marginTop: 4 },

  // Bottom
  bottomBar: { padding: 16, paddingBottom: 24 },
  actionBtn: {
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    ...Platform.select({
      web: { boxShadow: '0 4px 20px rgba(74,222,128,0.2)' },
      ios: {
        shadowColor: 'rgba(74,222,128,0.4)',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 1,
        shadowRadius: 12,
      },
      android: { elevation: 6 },
    }),
  },
  actionBtnText: { color: colors.textOnAccent, fontSize: 15, fontWeight: '600', letterSpacing: 0.3 },

  // Edit mode
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  editBtn: {
    marginLeft: 8,
    padding: 4,
  },
  editImageOverlay: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 12,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editInput: {
    backgroundColor: colors.cardDark,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.accent,
    marginBottom: 6,
  },
  editInputSmall: {
    fontSize: 14,
    fontWeight: '400',
    paddingVertical: 6,
  },
  editActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginBottom: 20,
    marginTop: -8,
  },
  editCancelBtn: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.cardDark,
  },
  editCancelBtnText: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '500',
  },
  editSaveBtn: {
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 10,
  },
  editSaveBtnText: {
    color: colors.textOnAccent,
    fontSize: 14,
    fontWeight: '600',
  },
});
