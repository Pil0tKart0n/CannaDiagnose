import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { ActionStep, ContributingFactor } from '../types';
import { colors } from '../constants/colors';
import { getLang } from '../services/i18n';

export function FactorsList({ factors }: { factors: ContributingFactor[] }) {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>{getLang() === 'en' ? 'Contributing Factors' : 'Beitragende Faktoren'}</Text>
      {factors.map((f, i) => (
        <View key={i} style={styles.factorRow}>
          <View style={styles.dot} />
          <View style={styles.factorContent}>
            <Text style={styles.factorName}>{f.factor}</Text>
            <Text style={styles.factorImpact}>{f.impact}</Text>
          </View>
        </View>
      ))}
    </View>
  );
}

export function ActionPlan({ steps }: { steps: ActionStep[] }) {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>{getLang() === 'en' ? 'Action Plan' : 'Aktionsplan'}</Text>
      {steps.map((step, i) => (
        <View key={i} style={styles.stepRow}>
          <View style={styles.stepNumber}>
            <Text style={styles.stepNumberText}>{step.priority}</Text>
          </View>
          <View style={styles.stepContent}>
            <Text style={styles.stepAction}>{step.action}</Text>
            <Text style={styles.stepDetails}>{step.details}</Text>
          </View>
        </View>
      ))}
    </View>
  );
}

export function PreventiveTips({ tips }: { tips: string[] }) {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>{getLang() === 'en' ? 'Prevention Tips' : 'Präventionstipps'}</Text>
      {tips.map((tip, i) => (
        <View key={i} style={styles.tipRow}>
          <View style={styles.tipDot} />
          <Text style={styles.tipText}>{tip}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.cardDark,
    borderRadius: 20,
    padding: 24,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(92,232,146,0.06)',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.45,
        shadowRadius: 24,
      },
      android: { elevation: 10 },
      web: {
        boxShadow: '0 12px 40px rgba(0,0,0,0.3), 0 2px 6px rgba(0,0,0,0.15), inset 0 1px 0 rgba(92,232,146,0.04)',
        backdropFilter: 'blur(8px)',
      },
    }),
  },
  title: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textMuted,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 18,
  },
  // Factors
  factorRow: {
    flexDirection: 'row',
    marginBottom: 14,
    gap: 12,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.warning,
    marginTop: 6,
  },
  factorContent: {
    flex: 1,
  },
  factorName: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 3,
  },
  factorImpact: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  // Action Plan
  stepRow: {
    flexDirection: 'row',
    marginBottom: 18,
    gap: 14,
  },
  stepNumber: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: colors.primaryAccent,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.borderAccent,
  },
  stepNumberText: {
    color: colors.accent,
    fontWeight: '700',
    fontSize: 14,
  },
  stepContent: {
    flex: 1,
  },
  stepAction: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  stepDetails: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  // Tips
  tipRow: {
    flexDirection: 'row',
    marginBottom: 12,
    gap: 10,
    alignItems: 'flex-start',
  },
  tipDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.accent,
    marginTop: 7,
  },
  tipText: {
    flex: 1,
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 20,
  },
});
