import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { DiagnosisResult, Severity } from '../types';
import { colors } from '../constants/colors';
import { getLang } from '../services/i18n';

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

function getSeverityLabel(sev: Severity): string {
  const labels: Record<Language, Record<Severity, string>> = {
    de: { niedrig: 'Niedrig', mittel: 'Mittel', hoch: 'Hoch', kritisch: 'Kritisch' },
    en: { niedrig: 'Low', mittel: 'Medium', hoch: 'High', kritisch: 'Critical' },
  };
  return labels[getLang()]?.[sev] || sev;
}

type Language = 'de' | 'en';

const TIPS_DE = [
  'Fotos unter weissem Licht oder mit Blitz ermoeglichen eine deutlich genauere Diagnose.',
  'Verfeinere die Diagnose mit deinen pH- und EC-Werten fuer ein praeziseres Ergebnis.',
  'Nahaufnahmen einzelner Blaetter liefern bessere Ergebnisse als Fotos der ganzen Pflanze.',
  'Regelmaessige Scans helfen dir, Probleme frueh zu erkennen bevor sie ernst werden.',
  'Achte darauf, dass das Blatt scharf und gut beleuchtet im Bild ist.',
  'Scanne bei Unsicherheit mehrere Blaetter von verschiedenen Stellen der Pflanze.',
];

const TIPS_EN = [
  'Photos under white light or with flash enable a much more accurate diagnosis.',
  'Refine the diagnosis with your pH and EC values for a more precise result.',
  'Close-up shots of individual leaves yield better results than photos of the whole plant.',
  'Regular scans help you detect problems early before they become serious.',
  'Make sure the leaf is sharp and well-lit in the image.',
  'If unsure, scan multiple leaves from different spots on the plant.',
];

function getTips(): string[] {
  return getLang() === 'en' ? TIPS_EN : TIPS_DE;
}

export default function DiagnosisCard({ result, isRefined }: DiagnosisCardProps) {
  const sevColor = severityColors[result.severity] || colors.textMuted;
  const confPercent = Math.round(result.confidence * 100);
  const confColor =
    confPercent >= 70 ? colors.severityLow : confPercent >= 40 ? colors.severityMedium : colors.severityCritical;

  const tips = getTips();
  const randomTip = useMemo(() => tips[Math.floor(Math.random() * tips.length)], []);

  return (
    <View style={styles.card}>
      {/* Accent stripe */}
      <View style={[styles.severityStripe, { backgroundColor: sevColor }]} />

      {/* Top row: badge */}
      <View style={[styles.severityBadge, { backgroundColor: sevColor }]}>
        <Text style={styles.severityText}>{getSeverityLabel(result.severity)}</Text>
      </View>

      <Text style={styles.diagnosis}>{result.primaryDiagnosis}</Text>

      {/* Confidence */}
      <View style={styles.confidenceRow}>
        <Text style={styles.confidenceLabel}>Konfidenz</Text>
        <View style={styles.confidenceBar}>
          <View style={[styles.confidenceFill, { width: `${confPercent}%`, backgroundColor: confColor }]} />
        </View>
        <Text style={[styles.confidenceValue, { color: confColor }]}>{confPercent}%</Text>
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
    borderRadius: 20,
    padding: 24,
    paddingLeft: 28,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(92,232,146,0.08)',
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.5,
        shadowRadius: 24,
      },
      android: { elevation: 10 },
      web: {
        boxShadow: '0 12px 40px rgba(0,0,0,0.35), 0 2px 6px rgba(0,0,0,0.2), inset 0 1px 0 rgba(92,232,146,0.05)',
        backdropFilter: 'blur(8px)',
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
