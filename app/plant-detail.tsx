import React, { useCallback, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, Image, Alert, Platform, RefreshControl,
} from 'react-native';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { getPlant, getEntriesForPlant, deleteEntry } from '../services/storage';
import { Plant, DiagnosisEntry, Severity } from '../types';
import { colors } from '../constants/colors';
import { useDiagnosis } from './_layout';

const severityColor: Record<Severity, string> = {
  niedrig: colors.severityLow,
  mittel: colors.severityMedium,
  hoch: colors.severityHigh,
  kritisch: colors.severityCritical,
};

const severityLabel: Record<Severity, string> = {
  niedrig: 'Niedrig',
  mittel: 'Mittel',
  hoch: 'Hoch',
  kritisch: 'Kritisch',
};

export default function PlantDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ plantId: string }>();
  const diagnosis = useDiagnosis();
  const [plant, setPlant] = useState<Plant | null>(null);
  const [entries, setEntries] = useState<DiagnosisEntry[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [params.plantId])
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

  const startFollowUp = () => {
    if (!plant || entries.length === 0) return;
    const latest = entries[0];
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
    Alert.alert('Diagnose löschen?', 'Diese Diagnose wird unwiderruflich gelöscht.', [
      { text: 'Abbrechen', style: 'cancel' },
      {
        text: 'Löschen', style: 'destructive',
        onPress: async () => { await deleteEntry(entryId); loadData(); },
      },
    ]);
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
  };

  const getFollowUpInfo = () => {
    if (entries.length === 0) return null;
    const latest = entries[0];
    if (!latest.result.followUpDays) return null;
    const due = new Date(new Date(latest.date).getTime() + latest.result.followUpDays * 86400000);
    const now = new Date();
    const daysLeft = Math.ceil((due.getTime() - now.getTime()) / 86400000);
    return { due, daysLeft, isDue: daysLeft <= 0 };
  };

  if (!plant) {
    return (
      <View style={styles.container}>
        <Text style={styles.emptyText}>Pflanze nicht gefunden.</Text>
      </View>
    );
  }

  const followUp = getFollowUpInfo();

  return (
    <View style={styles.container}>
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
          {plant.imageUri ? (
            <Image source={{ uri: plant.imageUri }} style={styles.plantImage} />
          ) : (
            <View style={[styles.plantImage, styles.plantImageEmpty]}>
              <Text style={styles.plantImageText}>🌱</Text>
            </View>
          )}
          <View style={styles.headerInfo}>
            <Text style={styles.plantName}>{plant.name}</Text>
            {plant.strain && <Text style={styles.plantStrain}>{plant.strain}</Text>}
            <Text style={styles.plantDate}>
              Angelegt am {formatDate(plant.createdAt)}
            </Text>
          </View>
        </View>

        {/* Follow-Up Banner */}
        {followUp && (
          <View style={[styles.followUpBanner, followUp.isDue && styles.followUpBannerDue]}>
            <Text style={[styles.followUpBannerText, followUp.isDue && styles.followUpBannerTextDue]}>
              {followUp.isDue
                ? 'Follow-up fällig – Zeit für ein neues Foto'
                : `Nächstes Follow-up in ${followUp.daysLeft} ${followUp.daysLeft === 1 ? 'Tag' : 'Tagen'}`}
            </Text>
            {followUp.isDue && (
              <TouchableOpacity onPress={startFollowUp} style={styles.followUpBannerBtn}>
                <Text style={styles.followUpBannerBtnText}>Jetzt starten</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Timeline */}
        <Text style={styles.sectionTitle}>
          Diagnose-Verlauf ({entries.length})
        </Text>

        {entries.length === 0 ? (
          <View style={styles.emptyTimeline}>
            <Text style={styles.emptyTimelineText}>
              Noch keine Diagnosen. Starte die erste Analyse für diese Pflanze.
            </Text>
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
                  onPress={() => router.push({
                    pathname: '/results',
                    params: {
                      historyResult: JSON.stringify(entry.result),
                      historyImage: entry.imageUri,
                    },
                  })}
                  onLongPress={() => handleDeleteEntry(entry.id)}
                >
                  <View style={styles.entryHeader}>
                    <Text style={styles.entryDate}>{formatDate(entry.date)}</Text>
                    <Text style={styles.entryTime}>{formatTime(entry.date)}</Text>
                    <View style={[styles.severityBadge, { backgroundColor: `${color}18` }]}>
                      <View style={[styles.severityDot, { backgroundColor: color }]} />
                      <Text style={[styles.severityText, { color }]}>
                        {severityLabel[sev]}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.entryBody}>
                    {entry.imageUri && (
                      <Image source={{ uri: entry.imageUri }} style={styles.entryThumb} />
                    )}
                    <View style={styles.entryInfo}>
                      <Text style={styles.entryDiagnosis} numberOfLines={2}>
                        {entry.result.primaryDiagnosis}
                      </Text>
                      {entry.result.followUpDays && (
                        <Text style={styles.entryFollowUp}>
                          Follow-up: {entry.result.followUpDays} Tage
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
              <Text style={styles.actionBtnText}>Follow-up Diagnose</Text>
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
                {entries.length === 0 ? 'Erste Diagnose starten' : 'Neue Diagnose'}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        )}
      </View>
    </View>
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
    width: 72, height: 72, borderRadius: 22,
  },
  plantImageEmpty: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center', justifyContent: 'center',
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
    fontSize: 14, color: colors.textSecondary, fontWeight: '600',
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
    fontSize: 13, fontWeight: '600', color: colors.accent,
  },

  // Section
  sectionTitle: {
    fontSize: 12, fontWeight: '600', color: colors.textSecondary, letterSpacing: 1.5, textTransform: 'uppercase',
    marginBottom: 16,
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
    fontSize: 14, color: colors.textMuted, textAlign: 'center', lineHeight: 20,
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
    width: 10, height: 10, borderRadius: 5,
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
    width: 48, height: 48, borderRadius: 12,
  },
  entryInfo: { flex: 1, marginLeft: 12 },
  entryDiagnosis: { fontSize: 13, color: colors.textSecondary, lineHeight: 18 },
  entryFollowUp: { fontSize: 11, color: colors.textMuted, marginTop: 4 },

  // Bottom
  bottomBar: { padding: 16, paddingBottom: 24 },
  actionBtn: {
    borderRadius: 12, paddingVertical: 16, alignItems: 'center',
    ...Platform.select({
      web: { boxShadow: '0 4px 20px rgba(0,230,118,0.2)' },
      ios: { shadowColor: 'rgba(0,230,118,0.4)', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 1, shadowRadius: 12 },
      android: { elevation: 6 },
    }),
  },
  actionBtnText: { color: colors.textOnAccent, fontSize: 15, fontWeight: '600', letterSpacing: 0.3 },
});
