import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors } from '../constants/colors';
import { t } from '../services/i18n';

interface InstallBannerProps {
  installPrompt: { prompt: () => void; userChoice: Promise<{ outcome: string }> } | null;
  onInstallComplete: () => void;
  onClearPrompt: () => void;
  onDismiss: () => void;
}

export default function InstallBanner({
  installPrompt,
  onInstallComplete,
  onClearPrompt,
  onDismiss,
}: InstallBannerProps) {
  return (
    <View style={styles.installBanner}>
      {installPrompt ? (
        <TouchableOpacity
          style={styles.installBtn}
          onPress={async () => {
            installPrompt.prompt();
            const result = await installPrompt.userChoice;
            if (result.outcome === 'accepted') {
              onInstallComplete();
            }
            onClearPrompt();
          }}
          activeOpacity={0.7}
        >
          <Text style={styles.installBtnText}>{t('home.install')}</Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity
          style={styles.installBtn}
          onPress={() => {
            if (typeof window !== 'undefined') {
              window.open('/download/leafscan.apk', '_blank');
            }
          }}
          activeOpacity={0.7}
        >
          <Text style={styles.installBtnText}>{t('home.downloadAndroid')}</Text>
        </TouchableOpacity>
      )}
      <TouchableOpacity onPress={onDismiss} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
        <Text style={styles.installDismiss}>{t('home.notNow')}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  installBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  installBtn: {
    backgroundColor: colors.accentSubtle,
    borderWidth: 1,
    borderColor: colors.accent,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  installBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.accent,
  },
  installDismiss: {
    fontSize: 12,
    color: colors.textMuted,
  },
});
