import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, ViewStyle, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../constants/colors';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline';
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
}

export default function Button({
  title,
  onPress,
  variant = 'primary',
  disabled = false,
  loading = false,
  style,
}: ButtonProps) {
  const isPrimary = variant === 'primary';

  if (isPrimary) {
    return (
      <TouchableOpacity onPress={onPress} disabled={disabled || loading} activeOpacity={0.85} style={style}>
        <LinearGradient
          colors={disabled ? ['#1E2420', '#181E1B'] : ['#6AF09E', '#5CE892', '#44C878']}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={[styles.base, styles.primaryGradient]}
        >
          {loading ? (
            <ActivityIndicator color={colors.textOnAccent} />
          ) : (
            <Text style={styles.textPrimary}>{title}</Text>
          )}
        </LinearGradient>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      style={[
        styles.base,
        variant === 'secondary' && styles.secondary,
        variant === 'outline' && styles.outline,
        disabled && styles.disabled,
        style,
      ]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.7}
    >
      {loading ? (
        <ActivityIndicator color={colors.accent} />
      ) : (
        <Text
          style={[
            styles.text,
            variant === 'secondary' && styles.textSecondary,
            variant === 'outline' && styles.textOutline,
          ]}
        >
          {title}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
  },
  primaryGradient: {
    ...Platform.select({
      ios: {
        shadowColor: '#5CE892',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.25,
        shadowRadius: 16,
      },
      android: { elevation: 8 },
      web: {
        boxShadow: '0 4px 20px rgba(92,232,146,0.2), inset 0 1px 0 rgba(255,255,255,0.15)',
      },
    }),
  },
  secondary: {
    backgroundColor: colors.cardDark,
    borderWidth: 1,
    borderColor: colors.border,
  },
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.border,
  },
  disabled: {
    opacity: 0.4,
  },
  text: {
    fontSize: 15,
    fontWeight: '600',
  },
  textPrimary: {
    color: colors.textOnAccent,
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  textSecondary: {
    color: colors.textSecondary,
  },
  textOutline: {
    color: colors.accent,
  },
});
