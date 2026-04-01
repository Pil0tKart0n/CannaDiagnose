import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const AUTH_TOKEN_KEY = 'leafscan_auth_token';
const AUTH_USER_KEY = 'leafscan_auth_user';

const SERVER_URL = process.env.EXPO_PUBLIC_API_PROXY_URL || 'https://leafscan.de';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
}

type AuthListener = (user: AuthUser | null) => void;
const listeners: AuthListener[] = [];

export function onAuthChange(fn: AuthListener): () => void {
  listeners.push(fn);
  return () => {
    const idx = listeners.indexOf(fn);
    if (idx >= 0) listeners.splice(idx, 1);
  };
}

function notifyListeners(user: AuthUser | null) {
  for (const fn of listeners) fn(user);
}

export async function getAuthToken(): Promise<string | null> {
  try {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      return window.localStorage.getItem(AUTH_TOKEN_KEY);
    }
    return await AsyncStorage.getItem(AUTH_TOKEN_KEY);
  } catch {
    return null;
  }
}

export async function getUser(): Promise<AuthUser | null> {
  try {
    const raw =
      Platform.OS === 'web' && typeof window !== 'undefined'
        ? window.localStorage.getItem(AUTH_USER_KEY)
        : await AsyncStorage.getItem(AUTH_USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export async function register(
  name: string,
  email: string,
  password: string,
): Promise<{ user: AuthUser; token: string }> {
  const url = Platform.OS === 'web' ? '/api/auth/register' : `${SERVER_URL}/api/auth/register`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, email, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Registrierung fehlgeschlagen');
  await saveAuth(data.token, data.user);
  notifyListeners(data.user);
  return data;
}

export async function login(
  email: string,
  password: string,
): Promise<{ user: AuthUser; token: string }> {
  const url = Platform.OS === 'web' ? '/api/auth/login' : `${SERVER_URL}/api/auth/login`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Login fehlgeschlagen');
  await saveAuth(data.token, data.user);
  notifyListeners(data.user);
  return data;
}

export async function logout(): Promise<void> {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    window.localStorage.removeItem(AUTH_TOKEN_KEY);
    window.localStorage.removeItem(AUTH_USER_KEY);
  } else {
    await AsyncStorage.multiRemove([AUTH_TOKEN_KEY, AUTH_USER_KEY]);
  }
  notifyListeners(null);
}

async function saveAuth(token: string, user: AuthUser): Promise<void> {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    window.localStorage.setItem(AUTH_TOKEN_KEY, token);
    window.localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
  } else {
    await AsyncStorage.setItem(AUTH_TOKEN_KEY, token);
    await AsyncStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
  }
}

export async function isLoggedIn(): Promise<boolean> {
  const token = await getAuthToken();
  return !!token;
}
