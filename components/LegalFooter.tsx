import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors } from '../constants/colors';
import { t } from '../services/i18n';

interface LegalFooterProps {
  onNavigate: (path: string) => void;
}

export default function LegalFooter({ onNavigate }: LegalFooterProps) {
  return (
    <>
      <View style={styles.legalFooter}>
        <Text style={styles.legalText}>{t('home.internetRequired')}</Text>
      </View>
      <View style={styles.legalFooter}>
        <TouchableOpacity onPress={() => onNavigate('/privacy')}>
          <Text style={styles.legalLink}>{t('home.privacy')}</Text>
        </TouchableOpacity>
        <Text style={styles.legalDot}>&middot;</Text>
        <TouchableOpacity onPress={() => onNavigate('/terms')}>
          <Text style={styles.legalLink}>{t('home.terms')}</Text>
        </TouchableOpacity>
        <Text style={styles.legalDot}>&middot;</Text>
        <TouchableOpacity onPress={() => onNavigate('/impressum')}>
          <Text style={styles.legalLink}>{t('home.impressum')}</Text>
        </TouchableOpacity>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  legalFooter: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  legalText: {
    fontSize: 10,
    color: colors.textMuted,
    letterSpacing: 0.2,
  },
  legalLink: {
    fontSize: 10,
    color: colors.textMuted,
    letterSpacing: 0.2,
    textDecorationLine: 'underline',
  },
  legalDot: {
    fontSize: 10,
    color: colors.textMuted,
  },
});
