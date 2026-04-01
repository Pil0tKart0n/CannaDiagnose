import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView,
  Platform, ScrollView, ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../constants/colors';
import { register, getAuthToken } from '../services/auth';
import { t } from '../services/i18n';

const SERVER_URL = process.env.EXPO_PUBLIC_API_PROXY_URL || 'https://leafscan.de';

const COUNTRIES = ['Deutschland', 'Österreich', 'Schweiz', 'Niederlande', 'Spanien', 'USA', 'Kanada', 'Andere'];
const GROW_TYPES = [
  { value: 'indoor', label: 'Indoor' },
  { value: 'outdoor', label: 'Outdoor' },
  { value: 'greenhouse', label: 'Gewächshaus' },
];
const EXPERIENCE_LEVELS = [
  { value: 'beginner', label: 'Anfänger (< 1 Jahr)' },
  { value: 'intermediate', label: 'Fortgeschritten (1-3 Jahre)' },
  { value: 'expert', label: 'Experte (3+ Jahre)' },
];
const PLANT_COUNTS = ['1-3', '4-10', '11-25', '25+'];
const SHOP_PREFS = [
  { value: 'online', label: 'Online-Shops' },
  { value: 'local', label: 'Lokaler Growshop' },
  { value: 'both', label: 'Beides' },
];

export default function RegisterScreen() {
  const router = useRouter();
  const [step, setStep] = useState<'register' | 'profile'>('register');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Profile fields
  const [country, setCountry] = useState<string | null>(null);
  const [growType, setGrowType] = useState<string | null>(null);
  const [experience, setExperience] = useState<string | null>(null);
  const [plantCount, setPlantCount] = useState<string | null>(null);
  const [shopPreference, setShopPreference] = useState<string | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);

  const handleRegister = async () => {
    setError('');
    if (!name.trim() || !email.trim() || !password) {
      setError(t('auth.fillAllFields'));
      return;
    }
    if (password.length < 6) {
      setError(t('auth.passwordTooShort'));
      return;
    }
    setLoading(true);
    try {
      await register(name.trim(), email.trim(), password);
      setStep('profile');
    } catch (err: any) {
      setError(err.message || t('auth.registerFailed'));
    } finally {
      setLoading(false);
    }
  };

  const saveProfile = async () => {
    setSavingProfile(true);
    try {
      const token = await getAuthToken();
      const url = Platform.OS === 'web' ? '/api/auth/profile' : `${SERVER_URL}/api/auth/profile`;
      await fetch(url, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ country, growType, experience, plantCount, shopPreference }),
      });
    } catch {} finally {
      setSavingProfile(false);
      router.replace('/');
    }
  };

  if (step === 'profile') {
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <Text style={styles.title}>{t('profile.title')}</Text>
            <Text style={styles.subtitle}>{t('profile.subtitle')}</Text>
          </View>

          <Text style={styles.label}>{t('profile.country')}</Text>
          <View style={styles.chipGrid}>
            {COUNTRIES.map(c => (
              <TouchableOpacity key={c} style={[styles.chip, country === c && styles.chipActive]} onPress={() => setCountry(country === c ? null : c)}>
                <Text style={[styles.chipText, country === c && styles.chipTextActive]}>{c}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.label}>{t('profile.growType')}</Text>
          <View style={styles.chipGrid}>
            {GROW_TYPES.map(g => (
              <TouchableOpacity key={g.value} style={[styles.chip, growType === g.value && styles.chipActive]} onPress={() => setGrowType(growType === g.value ? null : g.value)}>
                <Text style={[styles.chipText, growType === g.value && styles.chipTextActive]}>{g.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.label}>{t('profile.experience')}</Text>
          <View style={styles.chipGrid}>
            {EXPERIENCE_LEVELS.map(e => (
              <TouchableOpacity key={e.value} style={[styles.chip, experience === e.value && styles.chipActive]} onPress={() => setExperience(experience === e.value ? null : e.value)}>
                <Text style={[styles.chipText, experience === e.value && styles.chipTextActive]}>{e.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.label}>{t('profile.plantCount')}</Text>
          <View style={styles.chipGrid}>
            {PLANT_COUNTS.map(p => (
              <TouchableOpacity key={p} style={[styles.chip, plantCount === p && styles.chipActive]} onPress={() => setPlantCount(plantCount === p ? null : p)}>
                <Text style={[styles.chipText, plantCount === p && styles.chipTextActive]}>{p}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.label}>{t('profile.shopPreference')}</Text>
          <View style={styles.chipGrid}>
            {SHOP_PREFS.map(s => (
              <TouchableOpacity key={s.value} style={[styles.chip, shopPreference === s.value && styles.chipActive]} onPress={() => setShopPreference(shopPreference === s.value ? null : s.value)}>
                <Text style={[styles.chipText, shopPreference === s.value && styles.chipTextActive]}>{s.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity style={styles.submitBtn} onPress={saveProfile} disabled={savingProfile} activeOpacity={0.8}>
            {savingProfile ? <ActivityIndicator color={colors.textOnAccent} /> : <Text style={styles.submitBtnText}>{t('profile.save')}</Text>}
          </TouchableOpacity>

          <TouchableOpacity onPress={() => router.replace('/')} style={styles.switchLink}>
            <Text style={styles.switchText}>{t('profile.skip')}</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>

          <View style={styles.header}>
            <Text style={styles.title}>{t('auth.registerTitle')}</Text>
            <Text style={styles.subtitle}>{t('auth.registerSubtitle')}</Text>
          </View>

          <View style={styles.benefitsBox}>
            <View style={styles.benefitRow}>
              <Ionicons name="checkmark-circle" size={18} color={colors.accent} />
              <Text style={styles.benefitText}>{t('auth.benefit1')}</Text>
            </View>
            <View style={styles.benefitRow}>
              <Ionicons name="checkmark-circle" size={18} color={colors.accent} />
              <Text style={styles.benefitText}>{t('auth.benefit2')}</Text>
            </View>
            <View style={styles.benefitRow}>
              <Ionicons name="checkmark-circle" size={18} color={colors.accent} />
              <Text style={styles.benefitText}>{t('auth.benefit3')}</Text>
            </View>
          </View>

          {error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <View style={styles.form}>
            <Text style={styles.label}>{t('auth.name')}</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder={t('auth.namePlaceholder')}
              placeholderTextColor={colors.textMuted}
              autoCapitalize="words"
              textContentType="name"
            />

            <Text style={styles.label}>{t('auth.email')}</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="name@email.com"
              placeholderTextColor={colors.textMuted}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              textContentType="emailAddress"
            />

            <Text style={styles.label}>{t('auth.password')}</Text>
            <View style={styles.passwordWrap}>
              <TextInput
                style={[styles.input, styles.passwordInput]}
                value={password}
                onChangeText={setPassword}
                placeholder={t('auth.passwordPlaceholder')}
                placeholderTextColor={colors.textMuted}
                secureTextEntry={!showPassword}
                textContentType="newPassword"
              />
              <TouchableOpacity
                style={styles.eyeBtn}
                onPress={() => setShowPassword(!showPassword)}
              >
                <Ionicons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color={colors.textMuted}
                />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
              onPress={handleRegister}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color={colors.textOnAccent} />
              ) : (
                <Text style={styles.submitBtnText}>{t('auth.registerBtn')}</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => router.replace('/login')}
              style={styles.switchLink}
            >
              <Text style={styles.switchText}>
                {t('auth.hasAccount')}{' '}
                <Text style={styles.switchTextAccent}>{t('auth.loginNow')}</Text>
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  scroll: { flexGrow: 1, padding: 24 },
  backBtn: { marginBottom: 20 },
  header: { marginBottom: 16 },
  title: { fontSize: 28, fontWeight: '700', color: colors.text, marginBottom: 8 },
  subtitle: { fontSize: 15, color: colors.textSecondary, lineHeight: 22 },
  benefitsBox: {
    backgroundColor: 'rgba(92,232,146,0.06)',
    borderRadius: 12,
    padding: 14,
    gap: 10,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(92,232,146,0.12)',
  },
  benefitRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  benefitText: { fontSize: 14, color: colors.text, flex: 1 },
  errorBox: {
    backgroundColor: 'rgba(232,107,107,0.12)',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(232,107,107,0.25)',
  },
  errorText: { color: colors.error, fontSize: 14 },
  form: { gap: 4 },
  label: { fontSize: 14, color: colors.textSecondary, marginBottom: 6, marginTop: 12 },
  input: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
  },
  passwordWrap: { position: 'relative' },
  passwordInput: { paddingRight: 48 },
  eyeBtn: { position: 'absolute', right: 14, top: 14 },
  submitBtn: {
    backgroundColor: colors.accent,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 24,
  },
  submitBtnDisabled: { opacity: 0.6 },
  submitBtnText: { fontSize: 16, fontWeight: '700', color: colors.textOnAccent },
  switchLink: { alignItems: 'center', marginTop: 20, padding: 8 },
  switchText: { fontSize: 14, color: colors.textSecondary },
  switchTextAccent: { color: colors.accent, fontWeight: '600' },
  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
  chip: {
    paddingHorizontal: 14, paddingVertical: 9, borderRadius: 20,
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
  },
  chipActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  chipText: { fontSize: 13, color: colors.textSecondary },
  chipTextActive: { color: colors.textOnAccent, fontWeight: '600' },
});
