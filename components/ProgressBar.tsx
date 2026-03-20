import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { colors } from '../constants/colors';

interface ProgressBarProps {
  current: number;
  total: number;
  sectionName: string;
}

export default function ProgressBar({ current, total, sectionName }: ProgressBarProps) {
  const progress = current / total;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.section}>{sectionName}</Text>
        <Text style={styles.count}>
          {current} / {total}
        </Text>
      </View>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${progress * 100}%` }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  section: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.accent,
    letterSpacing: 0.5,
  },
  count: {
    fontSize: 13,
    color: colors.textMuted,
    fontWeight: '500',
  },
  track: {
    height: 4,
    backgroundColor: colors.cardMid,
    borderRadius: 2,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    backgroundColor: colors.accent,
    borderRadius: 2,
    ...Platform.select({
      web: {
        boxShadow: '0 0 8px rgba(92,232,146,0.3)',
        transition: 'width 0.3s ease',
      },
      default: {},
    }),
  },
});
