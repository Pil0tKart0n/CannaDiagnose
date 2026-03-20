import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { DiagnosisResult, Severity } from '../types';
import { colors } from '../constants/colors';

interface DiagnosisCardProps {
  result: DiagnosisResult;
  isRefined?: boolean;
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

const TIPS = [
  'Fotos unter weissem Licht oder mit Blitz ermoeglichen eine deutlich genauere Diagnose.',
  'Verfeinere die Diagnose mit deinen pH- und EC-Werten fuer ein praeziseres Ergebnis.',
  'Nahaufnahmen einzelner Blaetter liefern bessere Ergebnisse als Fotos der ganzen Pflanze.',
  'Regelmaessige Scans helfen dir, Probleme frueh zu erkennen bevor sie ernst werden.',
  'Achte darauf, dass das Blatt scharf und gut beleuchtet im Bild ist.',
  'Scanne bei Unsicherheit mehrere Blaetter von verschiedenen Stellen der Pflanze.',
];

export default function DiagnosisCard({ result, isRefined }: DiagnosisCardProps) {
  const sevColor = severityColors[result.severity] || colors.textMuted;
  const confPercent = Math.round(result.confidence * 100);
  const confColor = confPercent >= 70 ? colors.severityLow
                  : confPercent >= 40 ? colors.severityMedium
                  : colors.severityCritical;

  const randomTip = useMemo(() => TIPS[Math.floor(Math.random() * TIPS.length)], []);

  return (
    <View style={styles.card}>
      {/* Accent stripe */}
      <View style={[styles.severityStripe, { backgroundColor: sevColor }]} />

      {/* Top row: badge */}
      <View style={[styles.severityBadge, { backgroundColor: sevColor }]}>
        <Text style={styles.severityText}>
          {severityLabels[result.severity]}
        </Text>
      </View>

      <Text style={styles.diagnosis}>{result.primaryDiagnosis}</Text>

      {/* Confidence */}
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

      {/* Divider */}
      <View style={styles.cardDivider} />

      {isRefined && result.rootCauseAnalysis ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Ursachenanalyse</Text>
          <Text style={styles.sectionBody}>{result.rootCauseAnalysis}</Text>
        </View>
      ) : (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tipp</Text>
          <Text style={styles.sectionBody}>{randomTip}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.cardDark,
    borderRadius: 18,
    padding: 22,
    paddingLeft: 26,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.4,
        shadowRadius: 20,
      },
      android: { elevation: 8 },
      web: {
        boxShadow: '0 8px 32px rgba(0,0,0,0.3), 0 1px 3px rgba(0,0,0,0.2)',
      },
    }),
  },
  severityStripe: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    borderTopLeftRadius: 18,
    borderBottomLeftRadius: 18,
  },
  severityBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 8,
    marginBottom: 14,
  },
  severityText: {
    color: colors.white,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  diagnosis: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 18,
    lineHeight: 25,
  },
  confidenceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
    gap: 10,
  },
  confidenceLabel: {
    fontSize: 12,
    color: colors.textMuted,
    letterSpacing: 0.3,
  },
  confidenceBar: {
    flex: 1,
    height: 6,
    backgroundColor: colors.cardMid,
    borderRadius: 3,
    overflow: 'hidden',
  },
  confidenceFill: {
    height: '100%',
    borderRadius: 3,
  },
  confidenceValue: {
    fontSize: 14,
    fontWeight: '700',
    width: 40,
    textAlign: 'right',
  },
  cardDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginBottom: 16,
  },
  section: {
    marginTop: 0,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textMuted,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  sectionBody: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 22,
  },
});
