import React, { useCallback, useState } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity, Alert, Image, Platform,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { getPlants, deletePlant, getEntriesForPlant } from '../services/storage';
import { Plant, DiagnosisEntry } from '../types';
import { colors } from '../constants/colors';

interface PlantWithLatest extends Plant {
  latestEntry?: DiagnosisEntry;
  entryCount: number;
}

export default function PlantsScreen() {
  const router = useRouter();
  const [plants, setPlants] = useState<PlantWithLatest[]>([]);

  useFocusEffect(
    useCallback(() => {
      loadPlants();
    }, [])
  );

  const loadPlants = async () => {
    const allPlants = await getPlants();
    const withEntries: PlantWithLatest[] = await Promise.all(
      allPlants.map(async (p) => {
        const entries = await getEntriesForPlant(p.id);
        return {
          ...p,
          latestEntry: entries[0],
          entryCount: entries.length,
        };
      })
    );
    setPlants(withEntries);
  };

  const handleDelete = (id: string, name: string) => {
    Alert.alert(
      `"${name}" löschen?`,
      'Alle Diagnosen dieser Pflanze werden gelöscht.',
      [
        { text: 'Abbrechen', style: 'cancel' },
        {
          text: 'Löschen', style: 'destructive',
          onPress: async () => { await deletePlant(id); loadPlants(); },
        },
      ]
    );
  };

  const renderItem = ({ item }: { item: PlantWithLatest }) => {
    const hasFollowUp = item.latestEntry?.result.followUpDays;
    const followUpDate = hasFollowUp && item.latestEntry
      ? new Date(new Date(item.latestEntry.date).getTime() + (item.latestEntry.result.followUpDays! * 86400000))
      : null;
    const isFollowUpDue = followUpDate && followUpDate <= new Date();

    return (
      <TouchableOpacity
        style={styles.plantCard}
        onPress={() => router.push({ pathname: '/plant-detail', params: { plantId: item.id } })}
        activeOpacity={0.7}
      >
        {item.imageUri ? (
          <Image source={{ uri: item.imageUri }} style={styles.plantThumb} />
        ) : (
          <View style={[styles.plantThumb, styles.plantThumbEmpty]}>
            <Text style={styles.plantThumbText}>🌱</Text>
          </View>
        )}
        <View style={styles.plantInfo}>
          <Text style={styles.plantName}>{item.name}</Text>
          <Text style={styles.plantMeta}>
            {item.entryCount} {item.entryCount === 1 ? 'Diagnose' : 'Diagnosen'}
          </Text>
          {isFollowUpDue && (
            <View style={styles.followUpBadge}>
              <Text style={styles.followUpText}>Follow-up fällig</Text>
            </View>
          )}
        </View>
        <TouchableOpacity
          style={styles.deleteBtn}
          onPress={() => handleDelete(item.id, item.name)}
        >
          <Text style={styles.deleteText}>✕</Text>
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={plants}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyTitle}>Noch keine Pflanzen</Text>
            <Text style={styles.emptyText}>
              Füge deine erste Pflanze hinzu, um ihre Gesundheit zu tracken.
            </Text>
          </View>
        }
      />
      <View style={styles.bottomBar}>
        <TouchableOpacity onPress={() => router.push('/add-plant')} activeOpacity={0.85}>
          <LinearGradient
            colors={['#00E676', '#00C853', '#00A844']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.addBtn}
          >
            <Text style={styles.addBtnText}>+ Pflanze hinzufügen</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  list: { padding: 16, paddingBottom: 100 },
  plantCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 18,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.04)',
    ...Platform.select({
      web: { boxShadow: '0 2px 10px rgba(0,0,0,0.2)' },
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 8 },
      android: { elevation: 3 },
    }),
  },
  plantThumb: {
    width: 52, height: 52, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.05)',
  },
  plantThumbEmpty: {
    alignItems: 'center', justifyContent: 'center',
  },
  plantThumbText: { fontSize: 24 },
  plantInfo: { flex: 1, marginLeft: 14 },
  plantName: { fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: 3 },
  plantMeta: { fontSize: 12, color: colors.textMuted },
  followUpBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(0,230,118,0.12)',
    paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: 8, marginTop: 6,
    borderWidth: 1, borderColor: 'rgba(0,230,118,0.2)',
  },
  followUpText: { fontSize: 11, fontWeight: '700', color: colors.accent },
  deleteBtn: { padding: 8 },
  deleteText: { fontSize: 16, color: colors.textMuted },
  bottomBar: { padding: 16, paddingBottom: 24 },
  addBtn: {
    borderRadius: 16, paddingVertical: 16, alignItems: 'center',
    ...Platform.select({
      web: { boxShadow: '0 4px 20px rgba(0,230,118,0.2)' },
      ios: { shadowColor: 'rgba(0,230,118,0.4)', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 1, shadowRadius: 12 },
      android: { elevation: 6 },
    }),
  },
  addBtnText: { color: colors.white, fontSize: 15, fontWeight: '700', letterSpacing: 0.3 },
  emptyContainer: { alignItems: 'center', paddingTop: 60 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: 8 },
  emptyText: { fontSize: 14, color: colors.textMuted, textAlign: 'center', lineHeight: 20 },
});
