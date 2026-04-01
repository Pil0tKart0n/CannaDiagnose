import React, { useState, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView,
  ActivityIndicator, Platform, Modal, KeyboardAvoidingView, Alert,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../constants/colors';
import { getAuthToken } from '../services/auth';
import { t } from '../services/i18n';

const SERVER_URL = process.env.EXPO_PUBLIC_API_PROXY_URL || 'https://leafscan.de';

interface DiaryEntry {
  id: number;
  plant_name: string;
  title: string;
  note: string;
  grow_phase: string | null;
  height_cm: number | null;
  ph_value: number | null;
  ec_value: number | null;
  temperature: number | null;
  humidity: number | null;
  watered: number;
  nutrients_given: number;
  created_at: string;
}

const GROW_PHASES = ['Keimling', 'Vegetation', 'Blüte', 'Ernte', 'Trocknung'];

export default function DiaryScreen() {
  const router = useRouter();
  const [entries, setEntries] = useState<DiaryEntry[]>([]);
  const [plants, setPlants] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [filterPlant, setFilterPlant] = useState<string | null>(null);

  // Form state
  const [plantName, setPlantName] = useState('');
  const [title, setTitle] = useState('');
  const [note, setNote] = useState('');
  const [growPhase, setGrowPhase] = useState<string | null>(null);
  const [heightCm, setHeightCm] = useState('');
  const [phValue, setPhValue] = useState('');
  const [ecValue, setEcValue] = useState('');
  const [temperature, setTemperature] = useState('');
  const [humidity, setHumidity] = useState('');
  const [watered, setWatered] = useState(false);
  const [nutrientsGiven, setNutrientsGiven] = useState(false);
  const [saving, setSaving] = useState(false);

  const fetchDiary = useCallback(async () => {
    try {
      const token = await getAuthToken();
      if (!token) { router.replace('/login'); return; }
      const url = Platform.OS === 'web' ? '/api/diary' : `${SERVER_URL}/api/diary`;
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const data = await res.json();
        setEntries(data.entries);
        setPlants(data.plants);
      }
    } catch {} finally { setLoading(false); }
  }, []);

  useFocusEffect(useCallback(() => { fetchDiary(); }, [fetchDiary]));

  const resetForm = () => {
    setTitle('');
    setNote('');
    setGrowPhase(null);
    setHeightCm('');
    setPhValue('');
    setEcValue('');
    setTemperature('');
    setHumidity('');
    setWatered(false);
    setNutrientsGiven(false);
  };

  const handleSave = async () => {
    if (!plantName.trim()) return;
    setSaving(true);
    try {
      const token = await getAuthToken();
      const url = Platform.OS === 'web' ? '/api/diary' : `${SERVER_URL}/api/diary`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          plantName: plantName.trim(),
          title: title.trim(),
          note: note.trim(),
          growPhase,
          heightCm: heightCm ? parseFloat(heightCm) : null,
          phValue: phValue ? parseFloat(phValue) : null,
          ecValue: ecValue ? parseFloat(ecValue) : null,
          temperature: temperature ? parseFloat(temperature) : null,
          humidity: humidity ? parseFloat(humidity) : null,
          watered,
          nutrientsGiven,
        }),
      });
      if (res.ok) {
        resetForm();
        setShowForm(false);
        fetchDiary();
      }
    } catch {} finally { setSaving(false); }
  };

  const handleDelete = async (id: number) => {
    const doDelete = async () => {
      const token = await getAuthToken();
      const url = Platform.OS === 'web' ? `/api/diary/${id}` : `${SERVER_URL}/api/diary/${id}`;
      await fetch(url, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
      fetchDiary();
    };
    if (Platform.OS === 'web') {
      if (confirm(t('diary.confirmDelete'))) doDelete();
    } else {
      Alert.alert(t('diary.deleteTitle'), t('diary.confirmDelete'), [
        { text: t('diary.cancel'), style: 'cancel' },
        { text: t('diary.delete'), style: 'destructive', onPress: doDelete },
      ]);
    }
  };

  const filtered = filterPlant
    ? entries.filter(e => e.plant_name === filterPlant)
    : entries;

  const formatDate = (iso: string) => {
    const d = new Date(iso + 'Z');
    return d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color={colors.accent} style={{ marginTop: 60 }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Header */}
        <View style={styles.headerRow}>
          <Text style={styles.title}>{t('diary.title')}</Text>
          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => setShowForm(true)}
            activeOpacity={0.7}
          >
            <Ionicons name="add" size={22} color={colors.textOnAccent} />
          </TouchableOpacity>
        </View>

        {/* Plant filter chips */}
        {plants.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
            <TouchableOpacity
              style={[styles.chip, !filterPlant && styles.chipActive]}
              onPress={() => setFilterPlant(null)}
            >
              <Text style={[styles.chipText, !filterPlant && styles.chipTextActive]}>
                {t('diary.all')}
              </Text>
            </TouchableOpacity>
            {plants.map(p => (
              <TouchableOpacity
                key={p}
                style={[styles.chip, filterPlant === p && styles.chipActive]}
                onPress={() => setFilterPlant(filterPlant === p ? null : p)}
              >
                <Text style={[styles.chipText, filterPlant === p && styles.chipTextActive]}>{p}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {/* Entries */}
        {filtered.length === 0 ? (
          <View style={styles.emptyBox}>
            <Ionicons name="book-outline" size={40} color={colors.textMuted} />
            <Text style={styles.emptyText}>{t('diary.empty')}</Text>
            <Text style={styles.emptySubtext}>{t('diary.emptyHint')}</Text>
          </View>
        ) : (
          filtered.map(entry => (
            <View key={entry.id} style={styles.entryCard}>
              <View style={styles.entryHeader}>
                <View style={styles.entryMeta}>
                  <Text style={styles.entryPlant}>{entry.plant_name}</Text>
                  {entry.grow_phase && (
                    <View style={styles.phaseBadge}>
                      <Text style={styles.phaseText}>{entry.grow_phase}</Text>
                    </View>
                  )}
                </View>
                <TouchableOpacity onPress={() => handleDelete(entry.id)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                  <Ionicons name="trash-outline" size={16} color={colors.textMuted} />
                </TouchableOpacity>
              </View>
              {entry.title ? <Text style={styles.entryTitle}>{entry.title}</Text> : null}
              {entry.note ? <Text style={styles.entryNote}>{entry.note}</Text> : null}

              {/* Measurements */}
              <View style={styles.measurements}>
                {entry.height_cm != null && (
                  <View style={styles.measureItem}>
                    <Ionicons name="resize-outline" size={14} color={colors.accent} />
                    <Text style={styles.measureText}>{entry.height_cm} cm</Text>
                  </View>
                )}
                {entry.ph_value != null && (
                  <View style={styles.measureItem}>
                    <Text style={styles.measureLabel}>pH</Text>
                    <Text style={styles.measureText}>{entry.ph_value}</Text>
                  </View>
                )}
                {entry.ec_value != null && (
                  <View style={styles.measureItem}>
                    <Text style={styles.measureLabel}>EC</Text>
                    <Text style={styles.measureText}>{entry.ec_value}</Text>
                  </View>
                )}
                {entry.temperature != null && (
                  <View style={styles.measureItem}>
                    <Ionicons name="thermometer-outline" size={14} color={colors.accent} />
                    <Text style={styles.measureText}>{entry.temperature}°C</Text>
                  </View>
                )}
                {entry.humidity != null && (
                  <View style={styles.measureItem}>
                    <Ionicons name="water-outline" size={14} color={colors.accent} />
                    <Text style={styles.measureText}>{entry.humidity}%</Text>
                  </View>
                )}
                {entry.watered === 1 && (
                  <View style={styles.measureItem}>
                    <Ionicons name="water" size={14} color="#38BDF8" />
                    <Text style={styles.measureText}>{t('diary.watered')}</Text>
                  </View>
                )}
                {entry.nutrients_given === 1 && (
                  <View style={styles.measureItem}>
                    <Ionicons name="leaf" size={14} color={colors.accent} />
                    <Text style={styles.measureText}>{t('diary.nutrients')}</Text>
                  </View>
                )}
              </View>

              <Text style={styles.entryDate}>{formatDate(entry.created_at)}</Text>
            </View>
          ))
        )}
      </ScrollView>

      {/* Add Entry Modal */}
      <Modal visible={showForm} animationType="slide" transparent>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ScrollView keyboardShouldPersistTaps="handled">
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{t('diary.newEntry')}</Text>
                <TouchableOpacity onPress={() => { resetForm(); setShowForm(false); }}>
                  <Ionicons name="close" size={24} color={colors.text} />
                </TouchableOpacity>
              </View>

              <Text style={styles.label}>{t('diary.plantName')} *</Text>
              <TextInput
                style={styles.input}
                value={plantName}
                onChangeText={setPlantName}
                placeholder={t('diary.plantNamePlaceholder')}
                placeholderTextColor={colors.textMuted}
              />

              <Text style={styles.label}>{t('diary.growPhaseLabel')}</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.phaseRow}>
                {GROW_PHASES.map(phase => (
                  <TouchableOpacity
                    key={phase}
                    style={[styles.chip, growPhase === phase && styles.chipActive]}
                    onPress={() => setGrowPhase(growPhase === phase ? null : phase)}
                  >
                    <Text style={[styles.chipText, growPhase === phase && styles.chipTextActive]}>{phase}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={styles.label}>{t('diary.titleLabel')}</Text>
              <TextInput
                style={styles.input}
                value={title}
                onChangeText={setTitle}
                placeholder={t('diary.titlePlaceholder')}
                placeholderTextColor={colors.textMuted}
              />

              <Text style={styles.label}>{t('diary.noteLabel')}</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={note}
                onChangeText={setNote}
                placeholder={t('diary.notePlaceholder')}
                placeholderTextColor={colors.textMuted}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />

              {/* Measurements row */}
              <Text style={styles.label}>{t('diary.measurements')}</Text>
              <View style={styles.measureGrid}>
                <View style={styles.measureField}>
                  <Text style={styles.measureFieldLabel}>{t('diary.height')}</Text>
                  <TextInput style={styles.measureInput} value={heightCm} onChangeText={setHeightCm}
                    placeholder="cm" placeholderTextColor={colors.textMuted} keyboardType="numeric" />
                </View>
                <View style={styles.measureField}>
                  <Text style={styles.measureFieldLabel}>pH</Text>
                  <TextInput style={styles.measureInput} value={phValue} onChangeText={setPhValue}
                    placeholder="6.0" placeholderTextColor={colors.textMuted} keyboardType="numeric" />
                </View>
                <View style={styles.measureField}>
                  <Text style={styles.measureFieldLabel}>EC</Text>
                  <TextInput style={styles.measureInput} value={ecValue} onChangeText={setEcValue}
                    placeholder="1.2" placeholderTextColor={colors.textMuted} keyboardType="numeric" />
                </View>
                <View style={styles.measureField}>
                  <Text style={styles.measureFieldLabel}>{t('diary.temp')}</Text>
                  <TextInput style={styles.measureInput} value={temperature} onChangeText={setTemperature}
                    placeholder="°C" placeholderTextColor={colors.textMuted} keyboardType="numeric" />
                </View>
                <View style={styles.measureField}>
                  <Text style={styles.measureFieldLabel}>{t('diary.humid')}</Text>
                  <TextInput style={styles.measureInput} value={humidity} onChangeText={setHumidity}
                    placeholder="%" placeholderTextColor={colors.textMuted} keyboardType="numeric" />
                </View>
              </View>

              {/* Toggle buttons */}
              <View style={styles.toggleRow}>
                <TouchableOpacity
                  style={[styles.toggleBtn, watered && styles.toggleBtnActive]}
                  onPress={() => setWatered(!watered)}
                >
                  <Ionicons name="water" size={16} color={watered ? '#fff' : colors.textMuted} />
                  <Text style={[styles.toggleText, watered && styles.toggleTextActive]}>{t('diary.watered')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.toggleBtn, nutrientsGiven && styles.toggleBtnActive]}
                  onPress={() => setNutrientsGiven(!nutrientsGiven)}
                >
                  <Ionicons name="leaf" size={16} color={nutrientsGiven ? '#fff' : colors.textMuted} />
                  <Text style={[styles.toggleText, nutrientsGiven && styles.toggleTextActive]}>{t('diary.nutrients')}</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
                onPress={handleSave}
                disabled={saving}
                activeOpacity={0.8}
              >
                {saving ? (
                  <ActivityIndicator color={colors.textOnAccent} />
                ) : (
                  <Text style={styles.saveBtnText}>{t('diary.save')}</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: 20, paddingBottom: 40 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  title: { fontSize: 24, fontWeight: '700', color: colors.text },
  addBtn: {
    backgroundColor: colors.accent,
    width: 40, height: 40, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center',
  },
  chipScroll: { marginBottom: 16 },
  chip: {
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20,
    backgroundColor: colors.surface, marginRight: 8,
    borderWidth: 1, borderColor: colors.border,
  },
  chipActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  chipText: { fontSize: 13, color: colors.textSecondary },
  chipTextActive: { color: colors.textOnAccent, fontWeight: '600' },
  emptyBox: { alignItems: 'center', marginTop: 60, gap: 12 },
  emptyText: { fontSize: 16, color: colors.textSecondary, fontWeight: '500' },
  emptySubtext: { fontSize: 13, color: colors.textMuted, textAlign: 'center', maxWidth: 260 },
  entryCard: {
    backgroundColor: colors.surface,
    borderRadius: 14, padding: 16, marginBottom: 12,
    borderWidth: 1, borderColor: colors.border,
  },
  entryHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 },
  entryMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  entryPlant: { fontSize: 15, fontWeight: '600', color: colors.accent },
  phaseBadge: {
    paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8,
    backgroundColor: 'rgba(92,232,146,0.10)',
  },
  phaseText: { fontSize: 11, color: colors.accent, fontWeight: '500' },
  entryTitle: { fontSize: 15, fontWeight: '600', color: colors.text, marginBottom: 4 },
  entryNote: { fontSize: 14, color: colors.textSecondary, lineHeight: 20, marginBottom: 8 },
  measurements: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 8 },
  measureItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  measureLabel: { fontSize: 11, color: colors.accent, fontWeight: '700' },
  measureText: { fontSize: 13, color: colors.textSecondary },
  entryDate: { fontSize: 11, color: colors.textMuted },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalContent: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, maxHeight: '90%',
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: '700', color: colors.text },
  label: { fontSize: 13, color: colors.textSecondary, marginBottom: 6, marginTop: 14 },
  input: {
    backgroundColor: colors.surface, borderRadius: 10, padding: 12,
    fontSize: 16, color: colors.text, borderWidth: 1, borderColor: colors.border,
  },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  phaseRow: { marginBottom: 4 },
  measureGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  measureField: { width: '30%', minWidth: 80 },
  measureFieldLabel: { fontSize: 11, color: colors.textMuted, marginBottom: 4 },
  measureInput: {
    backgroundColor: colors.surface, borderRadius: 8, padding: 10,
    fontSize: 14, color: colors.text, borderWidth: 1, borderColor: colors.border,
    textAlign: 'center',
  },
  toggleRow: { flexDirection: 'row', gap: 10, marginTop: 16 },
  toggleBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10,
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
  },
  toggleBtnActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  toggleText: { fontSize: 13, color: colors.textMuted },
  toggleTextActive: { color: '#fff', fontWeight: '600' },
  saveBtn: {
    backgroundColor: colors.accent, borderRadius: 12, padding: 16,
    alignItems: 'center', marginTop: 24, marginBottom: 20,
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { fontSize: 16, fontWeight: '700', color: colors.textOnAccent },
});
