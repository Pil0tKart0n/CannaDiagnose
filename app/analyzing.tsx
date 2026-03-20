import React, { useEffect, useState, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, Platform, Animated, Easing } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { analyzePlant, verifyDiagnosis, clearImageCache, cachedReadAsBase64, ApiError } from '../services/claude';
import { saveEntry, addEntryToPlant } from '../services/storage';
import { scheduleFollowUpReminder } from '../services/notifications';
import { getPlant } from '../services/storage';
import { canScan } from '../services/quota';
import { colors } from '../constants/colors';
import { useDiagnosis } from './_layout';
import { trackEvent } from '../services/analytics';

const loadingTexts = [
  'Analysiere Blattstruktur...',
  'Erkenne Farbmuster...',
  'Prüfe Nährstoff-Symptome...',
  'Gleiche mit Referenzdaten ab...',
  'Bewerte Umgebungsfaktoren...',
  'Erstelle Aktionsplan...',
];

type ScreenState = 'loading' | 'error';

export default function AnalyzingScreen() {
  const router = useRouter();
  const {
    imageUri, imageUris, optimizedImageUris, questionnaire, setResult,
    selectedPlantId, isFollowUp, previousResult, previousDate,
  } = useDiagnosis();
  const [textIndex, setTextIndex] = useState(0);
  const [attemptText, setAttemptText] = useState('');
  const [screenState, setScreenState] = useState<ScreenState>('loading');
  const [error, setError] = useState<ApiError | null>(null);
  const hasStarted = useRef(false);

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const textOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Subtle pulse animation on the ring
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.08, duration: 1200, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1200, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    ).start();

    // Rotate loading texts with fade
    const interval = setInterval(() => {
      Animated.timing(textOpacity, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => {
        setTextIndex((i) => (i + 1) % loadingTexts.length);
        Animated.timing(textOpacity, { toValue: 1, duration: 300, useNativeDriver: true }).start();
      });
    }, 2800);
    return () => clearInterval(interval);
  }, []);

  const runAnalysis = useCallback(async () => {
    const primaryImage = imageUris.length > 0 ? imageUris[0] : imageUri;
    if (!primaryImage) {
      setError({ type: 'unknown', message: 'Kein Bild vorhanden.', retryable: false });
      setScreenState('error');
      return;
    }

    setScreenState('loading');
    setError(null);
    setAttemptText('');

    // Check scan quota before proceeding
    let isPremiumUser = false;
    try {
      const quota = await canScan();
      isPremiumUser = quota.isPremium;
      if (!quota.allowed) {
        setError({
          type: 'unknown',
          message: 'quota_exceeded',
          retryable: false,
        });
        setScreenState('error');
        return;
      }
    } catch (quotaErr) {
      // If quota check fails, block scan (fail closed for security)
      console.log('[LeafScan] Quota check failed, blocking scan:', quotaErr);
      setError({ type: 'unknown', message: 'quota_check_failed', retryable: true });
      setScreenState('error');
      return;
    }

    try {
      trackEvent('scan_start');
      const allUris = imageUris.length > 0 ? imageUris : (imageUri ? [imageUri] : []);
      // Use pre-optimized images if available (optimized in background during questionnaire)
      const preOptimized = optimizedImageUris.length === allUris.length ? optimizedImageUris : [];
      const { result: diagResult } = await analyzePlant(
        allUris,
        questionnaire,
        {
          isFollowUp,
          previousResult: previousResult ?? undefined,
          previousDate: previousDate ?? undefined,
        },
        (attempt, maxAttempts) => {
          if (attempt > 1) {
            setAttemptText(`Versuch ${attempt} von ${maxAttempts}...`);
          }
        },
        preOptimized,
      );

      console.log('[LeafScan] diagResult:', JSON.stringify(diagResult).substring(0, 300));

      // Verify diagnosis against reference images (non-blocking — if it fails, we use original result)
      // Skip verification for free web users: their 1 scan quota is already consumed by the diagnosis call above
      try {
        const skipVerify = Platform.OS === 'web' && !isPremiumUser;
        const firstUri = !skipVerify ? (preOptimized.length > 0 ? preOptimized[0] : allUris[0]) : null;
        if (firstUri) {
          // Use cached base64 from the diagnosis call instead of re-reading from disk
          const userBase64 = await cachedReadAsBase64(firstUri);
          const verification = await verifyDiagnosis(userBase64, diagResult);
          if (verification) {
            console.log('[LeafScan] Verification:', JSON.stringify(verification));
            if (verification.verified) {
              // Boost confidence when reference images confirm
              diagResult.confidence = Math.min(1, diagResult.confidence * 1.1);
            } else if (verification.confidence < 0.3 && verification.alternative) {
              // Low confidence + alternative → note it in root cause
              diagResult.rootCauseAnalysis += `\n\nHinweis: Referenzbild-Vergleich deutet eher auf "${verification.alternative}" hin.`;
              diagResult.confidence = Math.max(0.3, diagResult.confidence * 0.8);
            } else {
              // Not verified but no strong alternative — slightly reduce confidence
              diagResult.confidence = Math.max(0.4, diagResult.confidence * 0.9);
            }
          }
        }
      } catch (verifyErr: any) {
        console.log('[LeafScan] Verification failed (non-critical):', verifyErr.message);
      }

      // Scan is already recorded atomically on the server in /api/scan (step 2)

      // Free cached base64 data from memory
      clearImageCache();

      trackEvent('scan_complete', { diagnosis: diagResult.primaryDiagnosis?.substring(0, 50), severity: diagResult.severity });
      setResult(diagResult);
      const entryId = Date.now().toString();
      await saveEntry({
        id: entryId,
        date: new Date().toISOString(),
        imageUri: allUris[0] || '',
        imageUris: allUris,
        questionnaire,
        result: diagResult,
        plantId: selectedPlantId ?? undefined,
      });
      if (selectedPlantId) {
        await addEntryToPlant(selectedPlantId, entryId);
      }

      // Schedule follow-up notification (with or without plant)
      if (diagResult.followUpDays) {
        let plantName = 'deine Pflanze';
        if (selectedPlantId) {
          const plant = await getPlant(selectedPlantId);
          plantName = plant?.name || 'Pflanze';
        }
        await scheduleFollowUpReminder(plantName, diagResult.followUpDays, entryId);
      }
      router.replace({ pathname: '/results', params: { entryId } });
    } catch (err: any) {
      const apiError: ApiError = err.apiError || {
        type: 'unknown',
        message: err.message || 'Ein unbekannter Fehler ist aufgetreten.',
        retryable: true,
      };
      setError(apiError);
      setScreenState('error');
    }
  }, [imageUri, imageUris, optimizedImageUris, questionnaire, isFollowUp, previousResult, previousDate, selectedPlantId]);

  useEffect(() => {
    if (hasStarted.current) return;
    hasStarted.current = true;
    runAnalysis();
  }, []);

  const handleRetry = () => {
    hasStarted.current = false;
    runAnalysis();
  };

  if (screenState === 'error' && error) {
    const isQuotaExceeded = error.message === 'quota_exceeded';
    const isNoPlant = error.type === 'no_plant';
    const iconName = isQuotaExceeded
      ? 'diamond-outline'
      : isNoPlant
        ? 'leaf-outline'
        : error.type === 'network'
          ? 'cloud-offline-outline'
          : 'alert-circle-outline';
    const iconColor = isQuotaExceeded ? '#FBBF24' : isNoPlant ? colors.warning : error.type === 'network' ? colors.warning : colors.error;

    return (
      <View style={styles.container}>
        <View style={[styles.errorIconWrap, isQuotaExceeded && { backgroundColor: 'rgba(251,191,36,0.08)', borderColor: 'rgba(251,191,36,0.15)' }]}>
          <Ionicons name={iconName as any} size={48} color={iconColor} />
        </View>
        <Text style={styles.errorTitle}>
          {isQuotaExceeded
            ? 'Tageslimit erreicht'
            : isNoPlant
              ? 'Keine Pflanze erkannt'
              : error.type === 'network'
                ? 'Keine Verbindung'
                : 'Fehler bei der Analyse'}
        </Text>
        <Text style={styles.errorMessage}>
          {isQuotaExceeded
            ? 'Du hast deine kostenlose Diagnose für heute bereits verwendet.'
            : isNoPlant
              ? 'Auf dem Foto ist keine passende Pflanze erkennbar. Bitte mache ein neues Foto von deiner Pflanze.'
              : error.message}
        </Text>

        {isQuotaExceeded && (
          <TouchableOpacity
            onPress={() => router.push('/paywall')}
            activeOpacity={0.85}
            style={styles.retryBtnWrap}
          >
            <LinearGradient
              colors={['#FCD34D', '#FBBF24', '#F59E0B']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.retryBtn}
            >
              <Ionicons name="diamond-outline" size={18} color="#000" />
              <Text style={[styles.retryBtnText, { color: '#000' }]}>Premium freischalten</Text>
            </LinearGradient>
          </TouchableOpacity>
        )}

        {isNoPlant && (
          <TouchableOpacity
            onPress={() => router.replace('/camera')}
            activeOpacity={0.85}
            style={styles.retryBtnWrap}
          >
            <LinearGradient
              colors={['#5AEF90', '#4ADE80', '#3CC870']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.retryBtn}
            >
              <Ionicons name="camera-outline" size={18} color={colors.textOnAccent} />
              <Text style={styles.retryBtnText}>Neues Foto aufnehmen</Text>
            </LinearGradient>
          </TouchableOpacity>
        )}

        {error.retryable && (
          <TouchableOpacity onPress={handleRetry} activeOpacity={0.85} style={styles.retryBtnWrap}>
            <LinearGradient
              colors={['#5AEF90', '#4ADE80', '#3CC870']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.retryBtn}
            >
              <Ionicons name="refresh" size={18} color={colors.textOnAccent} />
              <Text style={styles.retryBtnText}>Erneut versuchen</Text>
            </LinearGradient>
          </TouchableOpacity>
        )}

        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>Zurück zum Fragebogen</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.pulseRing, { transform: [{ scale: pulseAnim }] }]}>
        <View style={styles.pulseInner}>
          <Ionicons name="leaf" size={28} color={colors.accent} />
        </View>
      </Animated.View>
      <Animated.Text style={[styles.text, { opacity: textOpacity }]}>{loadingTexts[textIndex]}</Animated.Text>
      {attemptText ? (
        <Text style={styles.attemptText}>{attemptText}</Text>
      ) : (
        <Text style={styles.sub}>Dies kann einige Sekunden dauern</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
    padding: 24,
  },
  pulseRing: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.accentGlow,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
    borderWidth: 1,
    borderColor: colors.borderAccent,
  },
  pulseInner: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.cardDark,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  text: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.accent,
    marginBottom: 8,
    textAlign: 'center',
  },
  sub: {
    fontSize: 14,
    color: colors.textMuted,
  },
  attemptText: {
    fontSize: 13,
    color: colors.warning,
    fontWeight: '500',
  },

  // Error state
  errorIconWrap: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: 'rgba(248,113,113,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(248,113,113,0.15)',
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 28,
    paddingHorizontal: 16,
  },
  retryBtnWrap: {
    width: '100%',
    maxWidth: 260,
  },
  retryBtn: {
    borderRadius: 14,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  retryBtnText: {
    color: colors.textOnAccent,
    fontSize: 15,
    fontWeight: '600',
  },
  backBtn: {
    marginTop: 16,
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  backBtnText: {
    fontSize: 14,
    color: colors.textMuted,
    fontWeight: '500',
  },
});
