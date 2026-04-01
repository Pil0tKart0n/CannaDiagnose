import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const SESSION_TOKEN_KEY = 'leafscan_session_token';
const PREMIUM_KEY = 'leafscan_premium';

// Server URL for native API calls
export const SERVER_URL = process.env.EXPO_PUBLIC_API_PROXY_URL || 'https://leafscan.de';

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

/** Get or create device ID for promo tracking */
async function getDeviceId(): Promise<string> {
  try {
    const key = 'leafscan_device_id';
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      let id = window.localStorage.getItem(key);
      if (!id) {
        id = 'dev_' + Math.random().toString(36).slice(2) + Date.now().toString(36);
        window.localStorage.setItem(key, id);
      }
      return id;
    }
    let id = await AsyncStorage.getItem(key);
    if (!id) {
      id = 'dev_' + Math.random().toString(36).slice(2) + Date.now().toString(36);
      await AsyncStorage.setItem(key, id);
    }
    return id;
  } catch {
    return '';
  }
}

/** Build headers for API requests */
export async function buildHeaders(token?: string | null): Promise<Record<string, string>> {
  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const deviceId = await getDeviceId();
  if (deviceId) headers['X-Device-Id'] = deviceId;
  return headers;
}

/** Check quota — sends auth token for logged-in user quota */
export async function canScan(): Promise<{ allowed: boolean; remaining: number; isPremium: boolean }> {
  try {
    const { getAuthToken } = require('./auth');
    const authToken = await getAuthToken();
    const headers: Record<string, string> = {};
    if (authToken) headers['Authorization'] = `Bearer ${authToken}`;

    const quotaUrl = Platform.OS === 'web' ? '/api/quota' : `${SERVER_URL}/api/quota`;
    const res = await fetch(quotaUrl, { headers });
    if (res.ok) {
      const data = await res.json();
      return {
        allowed: data.allowed,
        remaining: Math.max(0, data.limit - data.scansToday),
        isPremium: false,
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

/** Set premium flag locally (for immediate UI feedback after purchase) */
export async function setPremium(premium: boolean): Promise<void> {
  try {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.localStorage.setItem(PREMIUM_KEY, JSON.stringify(premium));
    } else {
      await AsyncStorage.setItem(PREMIUM_KEY, JSON.stringify(premium));
    }
  } catch {}
}

/** Get display info for the quota — sends auth token for user-specific quota */
export async function getQuotaDisplay(): Promise<{
  text: string;
  scansLeft: number;
  isPremium: boolean;
}> {
  try {
    const { getAuthToken } = require('./auth');
    const authToken = await getAuthToken();
    const headers: Record<string, string> = {};
    if (authToken) headers['Authorization'] = `Bearer ${authToken}`;

    const quotaUrl = Platform.OS === 'web' ? '/api/quota' : `${SERVER_URL}/api/quota`;
    const res = await fetch(quotaUrl, { headers });
    if (res.ok) {
      const data = await res.json();
      const left = Math.max(0, data.limit - data.scansToday);
      if (data.isLoggedIn) {
        if (left > 0) {
          return { text: `${left} von ${data.limit} Diagnosen heute`, scansLeft: left, isPremium: false };
        }
        return { text: 'Tageslimit erreicht', scansLeft: 0, isPremium: false };
      }
      // Anonymous
      if (left > 0) {
        return { text: '1 Scan alle 48h – Registriere dich für mehr', scansLeft: left, isPremium: false };
      }
      return { text: 'Nächster Scan in 48h – Registriere dich für 5/Tag', scansLeft: 0, isPremium: false };
    }
  } catch {}

  // Fallback: server unreachable
  return { text: 'Server nicht erreichbar', scansLeft: 0, isPremium: false };
}
