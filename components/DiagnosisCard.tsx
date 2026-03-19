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
  const confPercent = Math.round(result.confidence * 100);
  const confColor = confPercent >= 70 ? colors.severityLow    // grün
                  : confPercent >= 40 ? colors.severityMedium  // gelb/orange
                  : colors.severityCritical;                    // rot

  return (
    <View style={styles.card}>
      {/* Color accent line on left edge */}
      <View style={[styles.severityStripe, { backgroundColor: sevColor }]} />
      <View style={[styles.severityBadge, { backgroundColor: sevColor }]}>
        <Text style={styles.severityText}>
          {severityLabels[result.severity]}
        </Text>
      </View>

      <Text style={styles.diagnosis}>{result.primaryDiagnosis}</Text>

      <View style={styles.confidenceRow}>
        <Text style={styles.confidenceLabel}>Konfidenz</Text>
        <View style={styles.confidenceBar}>
          <View
            style={[
              styles.confidenceFill,
              { width: `${confPercent}%`, backgroundColor: confColor },
            ]}
          />
        </View>
        <Text style={[styles.confidenceValue, { color: confColor }]}>
          {confPercent}%
        </Text>
      </View>

      {result.rootCauseAnalysis ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Ursachenanalyse</Text>
          <Text style={styles.sectionBody}>{result.rootCauseAnalysis}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.cardDark,
    borderRadius: 16,
    padding: 20,
    paddingLeft: 24,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
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
  severityStripe: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    borderTopLeftRadius: 16,
    borderBottomLeftRadius: 16,
  },
  severityBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 8,
    marginBottom: 14,
  },
  severityText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  diagnosis: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 16,
    lineHeight: 24,
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
    fontWeight: '600',
    width: 40,
    textAlign: 'right',
  },
  section: {
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  sectionBody: {
    fontSize: 15,
    color: colors.textSecondary,
    lineHeight: 24,
  },
});
