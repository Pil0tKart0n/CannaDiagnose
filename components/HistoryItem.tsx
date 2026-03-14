import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { DiagnosisEntry, Severity } from '../types';
import { colors } from '../constants/colors';

interface HistoryItemProps {
  entry: DiagnosisEntry;
  onPress: () => void;
  onDelete: () => void;
}

const severityColors: Record<Severity, string> = {
  niedrig: colors.severityLow,
  mittel: colors.severityMedium,
  hoch: colors.severityHigh,
  kritisch: colors.severityCritical,
};

export default function HistoryItem({ entry, onPress, onDelete }: HistoryItemProps) {
  const sevColor = severityColors[entry.result.severity] || colors.textMuted;
  const dateStr = new Date(entry.date).toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <TouchableOpacity style={styles.container} onPress={onPress} activeOpacity={0.7}>
      <Image source={{ uri: entry.imageUri }} style={styles.thumbnail} />
      <View style={styles.content}>
        <Text style={styles.date}>{dateStr}</Text>
        <Text style={styles.diagnosis} numberOfLines={2}>
          {entry.result.primaryDiagnosis}
        </Text>
        <View style={[styles.badge, { backgroundColor: sevColor }]}>
          <Text style={styles.badgeText}>{entry.result.severity}</Text>
        </View>
      </View>
      <TouchableOpacity style={styles.deleteBtn} onPress={onDelete}>
        <Text style={styles.deleteText}>✕</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: colors.cardDark,
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.border,
    ...Platform.select({
      ios: {
        shadowColor: colors.shadowDark,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 1,
        shadowRadius: 8,
      },
      android: { elevation: 4 },
      web: {
        boxShadow: '0 2px 10px rgba(0,0,0,0.25)',
      },
    }),
  },
  thumbnail: {
    width: 56,
    height: 56,
    borderRadius: 14,
    backgroundColor: colors.cardMid,
  },
  content: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'center',
  },
  date: {
    fontSize: 11,
    color: colors.textMuted,
    marginBottom: 4,
  },
  diagnosis: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 6,
  },
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  badgeText: {
    color: colors.white,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  deleteBtn: {
    alignSelf: 'center',
    padding: 8,
  },
  deleteText: {
    fontSize: 16,
    color: colors.textMuted,
  },
});
