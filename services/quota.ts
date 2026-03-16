import AsyncStorage from '@react-native-async-storage/async-storage';

const QUOTA_KEY = 'leafscan_quota';
const FREE_SCANS_PER_DAY = 1;

export interface QuotaState {
  /** Scans used today */
  usedToday: number;
  /** ISO date string of last reset */
  lastResetDate: string;
  /** Whether user has premium (future: set by purchase/subscription) */
  isPremium: boolean;
}

function todayDateString(): string {
  return new Date().toISOString().split('T')[0]; // "2026-03-16"
}

async function loadQuota(): Promise<QuotaState> {
  const raw = await AsyncStorage.getItem(QUOTA_KEY);
  if (!raw) {
    return { usedToday: 0, lastResetDate: todayDateString(), isPremium: false };
  }
  const state: QuotaState = JSON.parse(raw);
  // Reset counter if day changed
  const today = todayDateString();
  if (state.lastResetDate !== today) {
    state.usedToday = 0;
    state.lastResetDate = today;
    await AsyncStorage.setItem(QUOTA_KEY, JSON.stringify(state));
  }
  return state;
}

async function saveQuota(state: QuotaState): Promise<void> {
  await AsyncStorage.setItem(QUOTA_KEY, JSON.stringify(state));
}

/** Check if the user can perform a scan right now */
export async function canScan(): Promise<{ allowed: boolean; remaining: number; isPremium: boolean }> {
  const state = await loadQuota();
  if (state.isPremium) {
    return { allowed: true, remaining: Infinity, isPremium: true };
  }
  const remaining = Math.max(0, FREE_SCANS_PER_DAY - state.usedToday);
  return { allowed: remaining > 0, remaining, isPremium: false };
}

/** Record that a scan was used */
export async function recordScan(): Promise<void> {
  const state = await loadQuota();
  state.usedToday += 1;
  await saveQuota(state);
}

/** Get current quota state for display */
export async function getQuotaState(): Promise<QuotaState> {
  return loadQuota();
}

/** Unlock premium (future: called after purchase verification) */
export async function setPremium(premium: boolean): Promise<void> {
  const state = await loadQuota();
  state.isPremium = premium;
  await saveQuota(state);
}

/** Get display info for the quota */
export async function getQuotaDisplay(): Promise<{
  text: string;
  scansLeft: number;
  isPremium: boolean;
}> {
  const state = await loadQuota();
  if (state.isPremium) {
    return { text: 'Premium – Unbegrenzte Scans', scansLeft: Infinity, isPremium: true };
  }
  const left = Math.max(0, FREE_SCANS_PER_DAY - state.usedToday);
  if (left > 0) {
    return {
      text: `${left} kostenlose${left === 1 ? ' Diagnose' : ' Diagnosen'} heute`,
      scansLeft: left,
      isPremium: false,
    };
  }
  return {
    text: 'Tageslimit erreicht',
    scansLeft: 0,
    isPremium: false,
  };
}
