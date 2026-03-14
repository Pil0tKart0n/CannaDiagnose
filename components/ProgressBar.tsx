import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
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
    fontSize: 14,
    fontWeight: '600',
    color: colors.accent,
  },
  count: {
    fontSize: 14,
    color: colors.textMuted,
  },
  track: {
    height: 6,
    backgroundColor: colors.cardDark,
    borderRadius: 3,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    backgroundColor: colors.accent,
    borderRadius: 3,
  },
});
