import AsyncStorage from '@react-native-async-storage/async-storage';
import { DiagnosisEntry } from '../types';

const STORAGE_KEY = 'cannadiagnose_history';

export async function saveEntry(entry: DiagnosisEntry): Promise<void> {
  const existing = await getEntries();
  existing.unshift(entry);
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(existing));
}

export async function getEntries(): Promise<DiagnosisEntry[]> {
  const data = await AsyncStorage.getItem(STORAGE_KEY);
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
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
}
