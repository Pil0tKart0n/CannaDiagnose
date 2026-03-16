import AsyncStorage from '@react-native-async-storage/async-storage';
import { DiagnosisEntry, Plant } from '../types';

const ENTRIES_KEY = 'leafscan_history';
const PLANTS_KEY = 'leafscan_plants';

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

// === Storage Management ===

const MAX_ENTRIES = 200;
const ARCHIVE_AFTER_DAYS = 60;

/**
 * Archive old entries: remove image URIs from entries older than ARCHIVE_AFTER_DAYS
 * and cap total entries at MAX_ENTRIES. This keeps storage lean.
 * Should be called on app startup.
 */
export async function cleanupStorage(): Promise<{ archived: number; deleted: number }> {
  const entries = await getEntries();
  if (entries.length === 0) return { archived: 0, deleted: 0 };

  const now = Date.now();
  const archiveThreshold = ARCHIVE_AFTER_DAYS * 24 * 60 * 60 * 1000;
  let archived = 0;

  // Archive old entries: strip image URIs to save space
  for (const entry of entries) {
    const age = now - new Date(entry.date).getTime();
    if (age > archiveThreshold && (entry.imageUri || (entry.imageUris && entry.imageUris.length > 0))) {
      entry.imageUri = '';
      entry.imageUris = [];
      archived++;
    }
  }

  // Cap total entries
  let deleted = 0;
  let capped = entries;
  if (entries.length > MAX_ENTRIES) {
    deleted = entries.length - MAX_ENTRIES;
    capped = entries.slice(0, MAX_ENTRIES); // Keep newest (unshift adds to front)
  }

  if (archived > 0 || deleted > 0) {
    await AsyncStorage.setItem(ENTRIES_KEY, JSON.stringify(capped));
  }

  return { archived, deleted };
}

/** Get approximate storage usage in bytes */
export async function getStorageSize(): Promise<{ entries: number; plants: number; total: number }> {
  const entriesData = await AsyncStorage.getItem(ENTRIES_KEY);
  const plantsData = await AsyncStorage.getItem(PLANTS_KEY);
  const entriesSize = entriesData ? new Blob([entriesData]).size : 0;
  const plantsSize = plantsData ? new Blob([plantsData]).size : 0;
  return {
    entries: entriesSize,
    plants: plantsSize,
    total: entriesSize + plantsSize,
  };
}
