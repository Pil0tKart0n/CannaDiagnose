import { Platform } from 'react-native';

const SERVER_URL = process.env.EXPO_PUBLIC_API_PROXY_URL || 'https://leafscan.de';
const EVENT_URL = Platform.OS === 'web' ? '/api/event' : `${SERVER_URL}/api/event`;

/** Fire-and-forget event tracking for funnel analytics */
export function trackEvent(event: string, meta?: Record<string, any>) {
  fetch(EVENT_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ event, meta }),
  }).catch(() => {});
}
