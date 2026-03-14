import AsyncStorage from '@react-native-async-storage/async-storage';
import { DiagnosisEntry, Plant } from '../types';

const ENTRIES_KEY = 'cannadiagnose_history';
const PLANTS_KEY = 'cannadiagnose_plants';

// === Diagnosis Entries ===

export async function saveEntry(entry: DiagnosisEntry): Promise<void> {
  const existing = await getEntries();
  existing.unshift(entry);
  await AsyncStorage.setItem(ENTRIES_KEY, JSON.stringify(existing));
}

export async function getEntries(): Promise<DiagnosisEntry[]> {
  const data = await AsyncStorage.getItem(ENTRIES_KEY);
  if (!data) return [];
  return JSON.parse(data);
}

export async function getEntry(id: string): Promise<DiagnosisEntry | null> {
  const entries = await getEntries();
  return entries.find((e) => e.id === id) ?? null;
}

export async function deleteEntry(id: string): Promise<void> {
  const entries = await getEntries();
  const filtered = entries.filter((e) => e.id !== id);
  await AsyncStorage.setItem(ENTRIES_KEY, JSON.stringify(filtered));
}

export async function getEntriesForPlant(plantId: string): Promise<DiagnosisEntry[]> {
  const entries = await getEntries();
  return entries.filter((e) => e.plantId === plantId);
}

// === Plants ===

export async function savePlant(plant: Plant): Promise<void> {
  const plants = await getPlants();
  const idx = plants.findIndex((p) => p.id === plant.id);
  if (idx >= 0) {
    plants[idx] = plant;
  } else {
    plants.unshift(plant);
  }
  await AsyncStorage.setItem(PLANTS_KEY, JSON.stringify(plants));
}

export async function getPlants(): Promise<Plant[]> {
  const data = await AsyncStorage.getItem(PLANTS_KEY);
  if (!data) return [];
  return JSON.parse(data);
}

export async function getPlant(id: string): Promise<Plant | null> {
  const plants = await getPlants();
  return plants.find((p) => p.id === id) ?? null;
}

export async function deletePlant(id: string): Promise<void> {
  const plants = await getPlants();
  const filtered = plants.filter((p) => p.id !== id);
  await AsyncStorage.setItem(PLANTS_KEY, JSON.stringify(filtered));
  // Also remove all entries linked to this plant
  const entries = await getEntries();
  const filteredEntries = entries.filter((e) => e.plantId !== id);
  await AsyncStorage.setItem(ENTRIES_KEY, JSON.stringify(filteredEntries));
}

export async function addEntryToPlant(plantId: string, entryId: string): Promise<void> {
  const plant = await getPlant(plantId);
  if (!plant) return;
  if (!plant.entries.includes(entryId)) {
    plant.entries.push(entryId);
    await savePlant(plant);
  }
}
