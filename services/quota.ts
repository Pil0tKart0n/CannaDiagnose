import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const QUOTA_KEY = 'leafscan_quota';
const SESSION_TOKEN_KEY = 'leafscan_session_token';
const FREE_SCANS_PER_DAY = 1;

// Server URL for native API calls
const SERVER_URL = process.env.EXPO_PUBLIC_API_PROXY_URL || 'https://leafscan.de';

export interface QuotaState {
  usedToday: number;
  lastResetDate: string;
  isPremium: boolean;
}

function todayDateString(): string {
  return new Date().toISOString().split('T')[0];
}

/** Get stored session token for premium users */
export async function getSessionToken(): Promise<string | null> {
  try {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      return window.localStorage.getItem(SESSION_TOKEN_KEY);
    }
    return await AsyncStorage.getItem(SESSION_TOKEN_KEY);
  } catch {
    return null;
  }
}

/** Store session token after payment verification */
export async function setSessionToken(token: string | null): Promise<void> {
  try {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      if (token) {
        window.localStorage.setItem(SESSION_TOKEN_KEY, token);
      } else {
        window.localStorage.removeItem(SESSION_TOKEN_KEY);
      }
    } else {
      if (token) {
        await AsyncStorage.setItem(SESSION_TOKEN_KEY, token);
      } else {
        await AsyncStorage.removeItem(SESSION_TOKEN_KEY);
      }
    }
  } catch (err) {
    console.warn('[LeafScan] setSessionToken failed:', err);
  }
}

/** Check quota — always asks the server (all platforms route through server) */
export async function canScan(): Promise<{ allowed: boolean; remaining: number; isPremium: boolean }> {
  try {
    const token = await getSessionToken();
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const quotaUrl = Platform.OS === 'web' ? '/api/quota' : `${SERVER_URL}/api/quota`;
    const res = await fetch(quotaUrl, { headers });
    if (res.ok) {
      const data = await res.json();
      return {
        allowed: data.allowed,
        remaining: data.isPremium ? Infinity : Math.max(0, data.limit - data.scansToday),
        isPremium: data.isPremium,
      };
    }
  } catch {
    // Server unreachable — fail closed (don't allow scans without server validation)
    return { allowed: false, remaining: 0, isPremium: false };
  }

  return { allowed: false, remaining: 0, isPremium: false };
}

/** Record scan — server handles this for all platforms via /api/scan */
export async function recordScan(): Promise<void> {
  // Server records scans in /api/scan endpoint — no local tracking needed
}

/** Set premium status — stores token on web, flag on native */
export async function setPremium(premium: boolean): Promise<void> {
  const state = await loadQuota();
  state.isPremium = premium;
  await saveQuota(state);
}

/** Get display info for the quota — always checks server */
export async function getQuotaDisplay(): Promise<{
  text: string;
  scansLeft: number;
  isPremium: boolean;
}> {
  try {
    const token = await getSessionToken();
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const quotaUrl = Platform.OS === 'web' ? '/api/quota' : `${SERVER_URL}/api/quota`;
    const res = await fetch(quotaUrl, { headers });
    if (res.ok) {
      const data = await res.json();
      if (data.isPremium) {
        return { text: 'Premium – Unbegrenzte Scans', scansLeft: Infinity, isPremium: true };
      }
      const left = Math.max(0, data.limit - data.scansToday);
      if (left > 0) {
        return { text: `${left} kostenlose${left === 1 ? ' Diagnose' : ' Diagnosen'} heute`, scansLeft: left, isPremium: false };
      }
      return { text: 'Tageslimit erreicht', scansLeft: 0, isPremium: false };
    }
  } catch {}

  // Fallback: server unreachable
  return { text: 'Server nicht erreichbar', scansLeft: 0, isPremium: false };
}

export async function getQuotaState(): Promise<QuotaState> {
  return loadQuota();
}

// ── Local storage helpers (native fallback) ──
async function loadQuota(): Promise<QuotaState> {
  const raw = await AsyncStorage.getItem(QUOTA_KEY);
  if (!raw) return { usedToday: 0, lastResetDate: todayDateString(), isPremium: false };
  let state: QuotaState;
  try {
    state = JSON.parse(raw);
  } catch {
    return { usedToday: 0, lastResetDate: todayDateString(), isPremium: false };
  }
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
