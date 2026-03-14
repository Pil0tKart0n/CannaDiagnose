import React, { useCallback, useState } from 'react';
import { View, Text, FlatList, StyleSheet, Alert, RefreshControl } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import * as Haptics from 'expo-haptics';
import HistoryItem from '../components/HistoryItem';
import { getEntries, deleteEntry } from '../services/storage';
import { DiagnosisEntry } from '../types';
import { colors } from '../constants/colors';
import { useDiagnosis } from './_layout';

export default function HistoryScreen() {
  const router = useRouter();
  const { setResult, setImageUri } = useDiagnosis();
  const [entries, setEntries] = useState<DiagnosisEntry[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadEntries();
    }, [])
  );

  const loadEntries = async () => {
    const data = await getEntries();
    setEntries(data);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await loadEntries();
    setRefreshing(false);
  };

  const handleDelete = (id: string) => {
    Alert.alert('Diagnose löschen?', 'Diese Aktion kann nicht rückgängig gemacht werden.', [
      { text: 'Abbrechen', style: 'cancel' },
      {
        text: 'Löschen',
        style: 'destructive',
        onPress: async () => {
          await deleteEntry(id);
          loadEntries();
        },
      },
    ]);
  };

  const handlePress = (entry: DiagnosisEntry) => {
    setResult(entry.result);
    setImageUri(entry.imageUri);
    router.push({
      pathname: '/results',
      params: {
        historyResult: JSON.stringify(entry.result),
        historyImage: entry.imageUri,
      },
    });
  };

  if (entries.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <View style={styles.emptyIcon}>
          <Text style={styles.emptyIconText}>📋</Text>
        </View>
        <Text style={styles.emptyTitle}>Noch keine Diagnosen</Text>
        <Text style={styles.emptyText}>
          Starte deine erste Diagnose, um sie hier zu sehen.
        </Text>
      </View>
    );
  }

  return (
    <FlatList
      data={entries}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <HistoryItem
          entry={item}
          onPress={() => handlePress(item)}
          onDelete={() => handleDelete(item.id)}
        />
      )}
      contentContainerStyle={styles.list}
      style={styles.container}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={colors.accent}
          colors={[colors.accent]}
          progressBackgroundColor={colors.cardDark}
        />
      }
    />
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  list: {
    padding: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: colors.background,
  },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 24,
    backgroundColor: colors.cardDark,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  emptyIconText: {
    fontSize: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
  },
});
