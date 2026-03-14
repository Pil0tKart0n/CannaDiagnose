import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { DiagnosisResult, Severity } from '../types';
import { colors } from '../constants/colors';

interface DiagnosisCardProps {
  result: DiagnosisResult;
}

const severityColors: Record<Severity, string> = {
  niedrig: colors.severityLow,
  mittel: colors.severityMedium,
  hoch: colors.severityHigh,
  kritisch: colors.severityCritical,
};

const severityLabels: Record<Severity, string> = {
  niedrig: 'Niedrig',
  mittel: 'Mittel',
  hoch: 'Hoch',
  kritisch: 'Kritisch',
};

export default function DiagnosisCard({ result }: DiagnosisCardProps) {
  const sevColor = severityColors[result.severity] || colors.textMuted;

  return (
    <View style={styles.card}>
      <View style={[styles.severityBadge, { backgroundColor: sevColor }]}>
        <Text style={styles.severityText}>
          Schweregrad: {severityLabels[result.severity]}
        </Text>
      </View>

      <Text style={styles.diagnosis}>{result.primaryDiagnosis}</Text>

      <View style={styles.confidenceRow}>
        <Text style={styles.confidenceLabel}>Konfidenz</Text>
        <View style={styles.confidenceBar}>
          <View
            style={[
              styles.confidenceFill,
              { width: `${result.confidence * 100}%`, backgroundColor: sevColor },
            ]}
          />
        </View>
        <Text style={[styles.confidenceValue, { color: sevColor }]}>
          {Math.round(result.confidence * 100)}%
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Ursachenanalyse</Text>
        <Text style={styles.sectionBody}>{result.rootCauseAnalysis}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.cardDark,
    borderRadius: 20,
    padding: 22,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: colors.border,
    ...Platform.select({
      ios: {
        shadowColor: colors.shadowDark,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 1,
        shadowRadius: 12,
      },
      android: { elevation: 6 },
      web: {
        boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
      },
    }),
  },
  severityBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 14,
  },
  severityText: {
    color: colors.white,
    fontSize: 13,
    fontWeight: '700',
  },
  diagnosis: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 16,
    lineHeight: 26,
  },
  confidenceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
    gap: 10,
  },
  confidenceLabel: {
    fontSize: 13,
    color: colors.textMuted,
  },
  confidenceBar: {
    flex: 1,
    height: 8,
    backgroundColor: colors.cardMid,
    borderRadius: 4,
    overflow: 'hidden',
  },
  confidenceFill: {
    height: '100%',
    borderRadius: 4,
  },
  confidenceValue: {
    fontSize: 14,
    fontWeight: '700',
    width: 40,
    textAlign: 'right',
  },
  section: {
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.accent,
    marginBottom: 8,
  },
  sectionBody: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 22,
  },
});
