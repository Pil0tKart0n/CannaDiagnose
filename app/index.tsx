import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Animated,
  Easing,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../constants/colors';
import { useDiagnosis } from './_layout';

// CSS Keyframes für Web - viel smoother als RN Animated
const webCSS = Platform.OS === 'web' ? `
  @keyframes shimmerPrimary {
    0% { left: -40%; }
    100% { left: 140%; }
  }
  @keyframes shimmerSecondary {
    0% { left: -40%; }
    100% { left: 140%; }
  }
  @keyframes pulseGlow {
    0% { opacity: 0; transform: scale(1); }
    50% { opacity: 0.25; transform: scale(1.02); }
    100% { opacity: 0; transform: scale(1); }
  }
  @keyframes breathe {
    0% { box-shadow: 0 6px 28px rgba(0,230,118,0.25); }
    50% { box-shadow: 0 8px 40px rgba(0,230,118,0.5); }
    100% { box-shadow: 0 6px 28px rgba(0,230,118,0.25); }
  }
  .btn-primary {
    position: relative;
    overflow: hidden;
    border-radius: 20px;
    border: 1px solid rgba(255,255,255,0.12);
    background: radial-gradient(ellipse 120% 80% at 50% 15%, rgba(255,255,255,0.22) 0%, transparent 55%),
                linear-gradient(175deg, #00FF88 0%, #00E676 25%, #00C853 60%, #009A40 100%);
    box-shadow: 0 6px 28px rgba(0,230,118,0.3),
                inset 0 1px 1px rgba(255,255,255,0.2),
                inset 0 -2px 4px rgba(0,0,0,0.15);
    transition: transform 0.15s ease, box-shadow 0.15s ease;
    cursor: pointer;
  }
  .btn-primary:active {
    transform: scale(0.97);
    box-shadow: 0 3px 16px rgba(0,230,118,0.25);
  }
  .btn-primary::before {
    content: '';
    position: absolute;
    top: -10%;
    width: 25%;
    height: 120%;
    background: linear-gradient(105deg, transparent 20%, rgba(255,255,255,0.1) 45%, rgba(255,255,255,0.18) 50%, rgba(255,255,255,0.1) 55%, transparent 80%);
    animation: shimmerPrimary 5s ease-in-out infinite;
    transform: skewX(-15deg);
    pointer-events: none;
  }
  .btn-primary.pulsing {
    animation: breathe 1.2s ease-in-out infinite;
  }
  .btn-primary.pulsing::after {
    content: '';
    position: absolute;
    top: 0; left: 0; right: 0; bottom: 0;
    border-radius: 20px;
    background: radial-gradient(ellipse at 50% 40%, rgba(255,255,255,0.3) 0%, transparent 70%);
    animation: pulseGlow 1.2s ease-in-out infinite;
    pointer-events: none;
  }

  .btn-secondary {
    position: relative;
    overflow: hidden;
    border-radius: 20px;
    border: 1px solid rgba(255,255,255,0.08);
    background: radial-gradient(ellipse 120% 80% at 50% 15%, rgba(255,255,255,0.06) 0%, transparent 55%),
                linear-gradient(175deg, #16412E 0%, #113528 50%, #0D2A20 100%);
    box-shadow: 0 4px 16px rgba(0,0,0,0.3),
                inset 0 1px 1px rgba(255,255,255,0.06),
                inset 0 -1px 3px rgba(0,0,0,0.2);
    transition: transform 0.15s ease;
    cursor: pointer;
  }
  .btn-secondary:active {
    transform: scale(0.97);
  }
  .btn-secondary::before {
    content: '';
    position: absolute;
    top: -10%;
    width: 25%;
    height: 120%;
    background: linear-gradient(105deg, transparent 20%, rgba(255,255,255,0.04) 45%, rgba(255,255,255,0.07) 50%, rgba(255,255,255,0.04) 55%, transparent 80%);
    animation: shimmerSecondary 7s ease-in-out 1.5s infinite;
    transform: skewX(-15deg);
    pointer-events: none;
  }
` : '';

function injectCSS() {
  if (Platform.OS !== 'web') return;
  if (typeof document === 'undefined') return;
  if (document.getElementById('cannadiagnose-btn-css')) return;
  const style = document.createElement('style');
  style.id = 'cannadiagnose-btn-css';
  style.textContent = webCSS;
  document.head.appendChild(style);
}

export default function HomeScreen() {
  const router = useRouter();
  const { reset } = useDiagnosis();
  const [isPulsing, setIsPulsing] = useState(false);

  useEffect(() => {
    injectCSS();
  }, []);

  const startDiagnosis = () => {
    setIsPulsing(true);
    setTimeout(() => {
      reset();
      router.push('/camera');
    }, 1000);
  };

  return (
    <LinearGradient
      colors={[colors.background, colors.primaryMid, colors.background]}
      style={styles.gradient}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.logoMark}>
              <Text style={styles.logoEmoji}>🌿</Text>
            </View>
          </View>

          {/* Hero Card */}
          <LinearGradient
            colors={[colors.primaryLight, colors.primaryAccent]}
            style={styles.heroCard}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Text style={styles.heroTitle}>CannaDiagnose</Text>
            <Text style={styles.heroSub}>
              KI-gestützte Pflanzendiagnose{'\n'}mit holistischer Umgebungsanalyse
            </Text>

            <View style={styles.statsRow}>
              <View style={styles.statBox}>
                <Text style={styles.statValue}>Scan</Text>
                <Text style={styles.statLabel}>Bild erfassen</Text>
              </View>
              <View style={[styles.statBox, styles.statBoxAccent]}>
                <Text style={styles.statValue}>Check</Text>
                <Text style={styles.statLabel}>KI-Analyse</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statValue}>Plan</Text>
                <Text style={styles.statLabel}>Aktionsplan</Text>
              </View>
            </View>
          </LinearGradient>

          {/* Feature Steps */}
          <View style={styles.steps}>
            <StepCard number="01" title="Foto aufnehmen" description="Betroffene Blätter nah fotografieren" />
            <StepCard number="02" title="Bedingungen eingeben" description="pH, Temperatur, Substrat & mehr" />
            <StepCard number="03" title="Diagnose erhalten" description="KI-Analyse mit Aktionsplan" />
          </View>

          {/* Buttons */}
          <View style={styles.buttons}>
            {Platform.OS === 'web' ? (
              <>
                <div
                  className={`btn-primary ${isPulsing ? 'pulsing' : ''}`}
                  onClick={startDiagnosis}
                  style={{ padding: '18px 24px', textAlign: 'center' } as any}
                >
                  <Text style={styles.primaryBtnText}>Diagnose starten</Text>
                </div>
                <div
                  className="btn-secondary"
                  onClick={() => router.push('/history')}
                  style={{ padding: '18px 24px', textAlign: 'center' } as any}
                >
                  <Text style={styles.secondaryBtnText}>Verlauf anzeigen</Text>
                </div>
              </>
            ) : (
              <>
                <NativeButton
                  label="Diagnose starten"
                  onPress={startDiagnosis}
                  isPrimary
                  isPulsing={isPulsing}
                />
                <NativeButton
                  label="Verlauf anzeigen"
                  onPress={() => router.push('/history')}
                />
              </>
            )}
          </View>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

// Native fallback mit Animated (für iOS/Android)
function NativeButton({
  label,
  onPress,
  isPrimary = false,
  isPulsing = false,
}: {
  label: string;
  onPress: () => void;
  isPrimary?: boolean;
  isPulsing?: boolean;
}) {
  const shimmerAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(shimmerAnim, {
        toValue: 1,
        duration: isPrimary ? 5000 : 7000,
        delay: isPrimary ? 0 : 1500,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: false,
      })
    ).start();
  }, []);

  useEffect(() => {
    if (isPulsing) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 600,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: false,
          }),
          Animated.timing(pulseAnim, {
            toValue: 0,
            duration: 600,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: false,
          }),
        ])
      ).start();
    }
  }, [isPulsing]);

  const shimmerLeft = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['-40%', '140%'],
  });

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.85}>
      <LinearGradient
        colors={
          isPrimary
            ? ['#00FF88', '#00E676', '#00C853', '#009A40']
            : [colors.cardMid, colors.cardDark]
        }
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={[styles.nativeBtn, isPrimary && styles.nativeBtnPrimary]}
      >
        <View style={[styles.nativeConvex, !isPrimary && styles.nativeConvexDark]} />
        <Animated.View style={[styles.nativeShimmer, { left: shimmerLeft, opacity: isPrimary ? 0.15 : 0.05 }]} />
        <Text style={isPrimary ? styles.primaryBtnText : styles.secondaryBtnText}>{label}</Text>
      </LinearGradient>
    </TouchableOpacity>
  );
}

function StepCard({
  number,
  title,
  description,
}: {
  number: string;
  title: string;
  description: string;
}) {
  return (
    <View style={styles.stepCard}>
      <View style={styles.stepNumber}>
        <Text style={styles.stepNumberText}>{number}</Text>
      </View>
      <View style={styles.stepContent}>
        <Text style={styles.stepTitle}>{title}</Text>
        <Text style={styles.stepDesc}>{description}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  container: { flex: 1 },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingBottom: 16,
    justifyContent: 'space-between',
  },

  header: { flexDirection: 'row', justifyContent: 'center', paddingTop: 12 },
  logoMark: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: colors.cardDark,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  logoEmoji: { fontSize: 24 },

  heroCard: {
    borderRadius: 24,
    padding: 24,
    marginTop: 16,
    ...Platform.select({
      ios: { shadowColor: colors.shadowDark, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 1, shadowRadius: 24 },
      android: { elevation: 12 },
      web: { boxShadow: '0 8px 32px rgba(0,0,0,0.3)' },
    }),
  },
  heroTitle: { fontSize: 28, fontWeight: '800', color: colors.white, letterSpacing: -0.5, marginBottom: 6 },
  heroSub: { fontSize: 14, color: colors.textSecondary, lineHeight: 20, marginBottom: 20 },
  statsRow: { flexDirection: 'row', gap: 10 },
  statBox: {
    flex: 1, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 16,
    paddingVertical: 16, alignItems: 'center', gap: 6,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
  },
  statBoxAccent: { backgroundColor: 'rgba(0,230,118,0.12)', borderColor: 'rgba(0,230,118,0.2)' },
  statValue: { fontSize: 16, fontWeight: '800', color: colors.accent, letterSpacing: 0.5 },
  statLabel: { fontSize: 12, fontWeight: '600', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 },

  steps: { gap: 8 },
  stepCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: colors.cardDark,
    borderRadius: 16, padding: 14, gap: 14, borderWidth: 1, borderColor: colors.border,
  },
  stepNumber: {
    width: 40, height: 40, borderRadius: 12, backgroundColor: colors.cardLight,
    alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border,
  },
  stepNumberText: { fontSize: 14, fontWeight: '800', color: colors.accent },
  stepContent: { flex: 1 },
  stepTitle: { fontSize: 15, fontWeight: '700', color: colors.text, marginBottom: 2 },
  stepDesc: { fontSize: 12, color: colors.textMuted },

  buttons: { gap: 12, paddingTop: 4 },

  // Native button styles
  nativeBtn: {
    borderRadius: 20,
    paddingVertical: 18,
    alignItems: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  nativeBtnPrimary: {
    borderColor: 'rgba(255,255,255,0.12)',
    ...Platform.select({
      ios: { shadowColor: 'rgba(0,230,118,0.5)', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 1, shadowRadius: 20 },
      android: { elevation: 10 },
    }),
  },
  nativeConvex: {
    position: 'absolute',
    top: 0,
    left: '5%',
    right: '5%',
    height: '45%',
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderBottomLeftRadius: 100,
    borderBottomRightRadius: 100,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  nativeConvexDark: {
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  nativeShimmer: {
    position: 'absolute',
    top: 0,
    width: '25%',
    height: '100%',
    backgroundColor: 'rgba(255,255,255,1)',
    transform: [{ skewX: '-15deg' }],
    borderRadius: 10,
  },

  primaryBtnText: {
    color: colors.white,
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: 0.5,
    zIndex: 1,
  },
  secondaryBtnText: {
    color: colors.textSecondary,
    fontSize: 15,
    fontWeight: '600',
    zIndex: 1,
  },
});
