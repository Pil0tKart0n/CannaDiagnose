import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { ActionStep, ContributingFactor } from '../types';
import { colors } from '../constants/colors';

export function FactorsList({ factors }: { factors: ContributingFactor[] }) {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>Beitragende Faktoren</Text>
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
      <Text style={styles.title}>Aktionsplan</Text>
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
      <Text style={styles.title}>Präventionstipps</Text>
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
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
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
  title: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 16,
  },
  // Factors
  factorRow: {
    flexDirection: 'row',
    marginBottom: 14,
    gap: 12,
  },
  dot: {
    width: 8,
    height: 8,
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
    marginBottom: 16,
    gap: 12,
  },
  stepNumber: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: colors.primaryAccent,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  stepNumberText: {
    color: colors.accent,
    fontWeight: '600',
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
    width: 6,
    height: 6,
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
