import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors } from '../constants/colors';
import { t } from '../services/i18n';

const CONSENT_KEY = 'leafscan_cookie_consent';

export default function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Only show on web
    if (Platform.OS !== 'web') return;
    AsyncStorage.getItem(CONSENT_KEY)
      .then((val) => {
        if (!val) setVisible(true);
      })
      .catch(() => setVisible(true));
  }, []);

  const handleAccept = async () => {
    await AsyncStorage.setItem(CONSENT_KEY, 'accepted');
    setVisible(false);
  };

  const handleDecline = async () => {
    await AsyncStorage.setItem(CONSENT_KEY, 'declined');
    setVisible(false);
    // Unregister service worker if user declines
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      for (const reg of registrations) {
        await reg.unregister();
      }
    }
    // Clear caches
    if ('caches' in window) {
      const keys = await caches.keys();
      for (const key of keys) {
        await caches.delete(key);
      }
    }
  };

  if (!visible) return null;

  return (
    <View style={styles.overlay}>
      <View style={styles.banner}>
        <Text style={styles.text}>{t('cookie.text')}</Text>
        <View style={styles.buttons}>
          <TouchableOpacity onPress={handleDecline} style={styles.declineBtn}>
            <Text style={styles.declineBtnText}>{t('cookie.decline')}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleAccept} style={styles.acceptBtn}>
            <Text style={styles.acceptBtnText}>{t('cookie.accept')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 9999,
    padding: 12,
  },
  banner: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    ...Platform.select({
      web: {
        boxShadow: '0 -4px 24px rgba(0,0,0,0.4)',
        backdropFilter: 'blur(20px)',
      },
    }),
  },
  text: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: 12,
  },
  buttons: {
    flexDirection: 'row',
    gap: 10,
  },
  declineBtn: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  declineBtnText: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.textMuted,
  },
  acceptBtn: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: colors.accent,
  },
  acceptBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textOnAccent,
  },
});
