import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../constants/colors';
import { useDiagnosis } from './_layout';

// Inject CSS for smooth web effects
const webCSS = Platform.OS === 'web' ? `
  @keyframes shimmerPrimary {
    0% { left: -40%; }
    100% { left: 140%; }
  }
  @keyframes shimmerSecondary {
    0% { left: -40%; }
    100% { left: 140%; }
  }
  @keyframes breathe {
    0% { box-shadow: 0 4px 24px rgba(0,230,118,0.2); }
    50% { box-shadow: 0 8px 44px rgba(0,230,118,0.45); }
    100% { box-shadow: 0 4px 24px rgba(0,230,118,0.2); }
  }
  @keyframes pulseGlow {
    0% { opacity: 0; }
    50% { opacity: 0.2; }
    100% { opacity: 0; }
  }

  .cd-screen {
    background: radial-gradient(ellipse 160% 70% at 50% 110%, rgba(0,230,118,0.06) 0%, transparent 60%),
                radial-gradient(ellipse 80% 50% at 80% 20%, rgba(0,230,118,0.03) 0%, transparent 50%),
                #080F0C;
    min-height: 100%;
  }

  .cd-hero {
    background: linear-gradient(170deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.01) 100%);
    border: 1px solid rgba(255,255,255,0.05);
    border-radius: 28px;
    backdrop-filter: blur(20px);
    box-shadow: 0 12px 40px rgba(0,0,0,0.3),
                inset 0 1px 0 rgba(255,255,255,0.05);
  }

  .cd-stat {
    background: rgba(255,255,255,0.03);
    border: 1px solid rgba(255,255,255,0.04);
    border-radius: 16px;
    transition: background 0.3s ease;
  }
  .cd-stat:hover {
    background: rgba(255,255,255,0.06);
  }
  .cd-stat-accent {
    background: rgba(0,230,118,0.06);
    border-color: rgba(0,230,118,0.08);
  }

  .cd-step {
    background: rgba(255,255,255,0.02);
    border: 1px solid rgba(255,255,255,0.04);
    border-radius: 18px;
    transition: background 0.3s ease, border-color 0.3s ease;
  }
  .cd-step:hover {
    background: rgba(255,255,255,0.04);
    border-color: rgba(255,255,255,0.07);
  }

  .cd-btn-primary {
    position: relative;
    overflow: hidden;
    border-radius: 18px;
    border: 1px solid rgba(255,255,255,0.1);
    background: radial-gradient(ellipse 130% 90% at 50% 12%, rgba(255,255,255,0.2) 0%, transparent 50%),
                linear-gradient(176deg, #00FF88 0%, #00E676 20%, #00C853 55%, #009A40 100%);
    box-shadow: 0 4px 24px rgba(0,230,118,0.2),
                inset 0 1px 0 rgba(255,255,255,0.15),
                inset 0 -1px 3px rgba(0,0,0,0.15);
    transition: transform 0.2s ease, box-shadow 0.2s ease;
    cursor: pointer;
  }
  .cd-btn-primary:active {
    transform: scale(0.97);
  }
  .cd-btn-primary::before {
    content: '';
    position: absolute;
    top: -10%;
    width: 22%;
    height: 120%;
    background: linear-gradient(105deg, transparent 25%, rgba(255,255,255,0.08) 45%, rgba(255,255,255,0.14) 50%, rgba(255,255,255,0.08) 55%, transparent 75%);
    animation: shimmerPrimary 5s ease-in-out infinite;
    transform: skewX(-15deg);
    pointer-events: none;
  }
  .cd-btn-primary.pulsing {
    animation: breathe 1.4s ease-in-out infinite;
  }
  .cd-btn-primary.pulsing::after {
    content: '';
    position: absolute; top: 0; left: 0; right: 0; bottom: 0;
    border-radius: 18px;
    background: radial-gradient(ellipse at 50% 35%, rgba(255,255,255,0.25) 0%, transparent 65%);
    animation: pulseGlow 1.4s ease-in-out infinite;
    pointer-events: none;
  }

  .cd-btn-secondary {
    position: relative;
    overflow: hidden;
    border-radius: 18px;
    border: 1px solid rgba(255,255,255,0.04);
    background: radial-gradient(ellipse 130% 90% at 50% 12%, rgba(255,255,255,0.04) 0%, transparent 50%),
                rgba(255,255,255,0.02);
    box-shadow: inset 0 1px 0 rgba(255,255,255,0.04),
                inset 0 -1px 2px rgba(0,0,0,0.1);
    transition: transform 0.2s ease, background 0.3s ease;
    cursor: pointer;
  }
  .cd-btn-secondary:hover {
    background: radial-gradient(ellipse 130% 90% at 50% 12%, rgba(255,255,255,0.06) 0%, transparent 50%),
                rgba(255,255,255,0.04);
  }
  .cd-btn-secondary:active {
    transform: scale(0.97);
  }
  .cd-btn-secondary::before {
    content: '';
    position: absolute;
    top: -10%;
    width: 22%;
    height: 120%;
    background: linear-gradient(105deg, transparent 25%, rgba(255,255,255,0.03) 45%, rgba(255,255,255,0.05) 50%, rgba(255,255,255,0.03) 55%, transparent 75%);
    animation: shimmerSecondary 7s ease-in-out 2s infinite;
    transform: skewX(-15deg);
    pointer-events: none;
  }
` : '';

function injectCSS() {
  if (Platform.OS !== 'web' || typeof document === 'undefined') return;
  if (document.getElementById('cd-css')) return;
  const s = document.createElement('style');
  s.id = 'cd-css';
  s.textContent = webCSS;
  document.head.appendChild(s);
}

export default function HomeScreen() {
  const router = useRouter();
  const { reset } = useDiagnosis();
  const [isPulsing, setIsPulsing] = useState(false);

  useEffect(() => { injectCSS(); }, []);

  const startDiagnosis = () => {
    setIsPulsing(true);
    setTimeout(() => { reset(); router.push('/camera'); }, 900);
  };

  const isWeb = Platform.OS === 'web';

  const HeroWrapper = ({ children }: { children: React.ReactNode }) =>
    isWeb ? (
      <div className="cd-hero" style={{ padding: 24, marginTop: 16 } as any}>
        {children}
      </div>
    ) : (
      <LinearGradient
        colors={['rgba(255,255,255,0.05)', 'rgba(255,255,255,0.01)']}
        style={styles.heroCard}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        {children}
      </LinearGradient>
    );

  const StatBox = ({ label, sub, accent }: { label: string; sub: string; accent?: boolean }) =>
    isWeb ? (
      <div className={`cd-stat ${accent ? 'cd-stat-accent' : ''}`} style={webStatStyle as any}>
        <Text style={styles.statValue}>{label}</Text>
        <Text style={styles.statLabel}>{sub}</Text>
      </div>
    ) : (
      <View style={[styles.statBox, accent && styles.statBoxAccent]}>
        <Text style={styles.statValue}>{label}</Text>
        <Text style={styles.statLabel}>{sub}</Text>
      </View>
    );

  return isWeb ? (
    <div className="cd-screen">
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          <View style={{ height: 24 }} />

          <HeroWrapper>
            <Text style={styles.heroTitle}>CannaDiagnose</Text>
            <Text style={styles.heroSub}>
              KI-gestützte Pflanzendiagnose mit{'\n'}holistischer Umgebungsanalyse
            </Text>
            <View style={styles.statsRow}>
              <StatBox label="Scan" sub="Bild erfassen" />
              <StatBox label="Check" sub="KI-Analyse" accent />
              <StatBox label="Plan" sub="Aktionsplan" />
            </View>
          </HeroWrapper>

          <View style={styles.steps}>
            <WebStepCard number="01" title="Foto aufnehmen" desc="Betroffene Blätter nah fotografieren" />
            <WebStepCard number="02" title="Bedingungen eingeben" desc="pH, Temperatur, Substrat & mehr" />
            <WebStepCard number="03" title="Diagnose erhalten" desc="KI-Analyse mit Aktionsplan" />
          </View>

          <View style={styles.buttons}>
            <div
              className={`cd-btn-primary ${isPulsing ? 'pulsing' : ''}`}
              onClick={startDiagnosis}
              style={{ padding: '18px 24px', textAlign: 'center' } as any}
            >
              <Text style={styles.primaryBtnText}>Diagnose starten</Text>
            </div>
            <div
              className="cd-btn-secondary"
              onClick={() => router.push('/history')}
              style={{ padding: '17px 24px', textAlign: 'center' } as any}
            >
              <Text style={styles.secondaryBtnText}>Verlauf anzeigen</Text>
            </div>
          </View>
        </View>
      </SafeAreaView>
    </div>
  ) : (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          <View style={{ height: 24 }} />
          <HeroWrapper>
            <Text style={styles.heroTitle}>CannaDiagnose</Text>
            <Text style={styles.heroSub}>
              KI-gestützte Pflanzendiagnose mit{'\n'}holistischer Umgebungsanalyse
            </Text>
            <View style={styles.statsRow}>
              <StatBox label="Scan" sub="Bild erfassen" />
              <StatBox label="Check" sub="KI-Analyse" accent />
              <StatBox label="Plan" sub="Aktionsplan" />
            </View>
          </HeroWrapper>

          <View style={styles.steps}>
            <StepCard number="01" title="Foto aufnehmen" desc="Betroffene Blätter nah fotografieren" />
            <StepCard number="02" title="Bedingungen eingeben" desc="pH, Temperatur, Substrat & mehr" />
            <StepCard number="03" title="Diagnose erhalten" desc="KI-Analyse mit Aktionsplan" />
          </View>

          <View style={styles.buttons}>
            <LinearGradient
              colors={['#00FF88', '#00E676', '#00C853', '#009A40']}
              start={{ x: 0.5, y: 0 }}
              end={{ x: 0.5, y: 1 }}
              style={styles.nativePrimaryBtn}
            >
              <Text style={styles.primaryBtnText} onPress={startDiagnosis}>Diagnose starten</Text>
            </LinearGradient>
            <View style={styles.nativeSecondaryBtn}>
              <Text style={styles.secondaryBtnText} onPress={() => router.push('/history')}>Verlauf anzeigen</Text>
            </View>
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}

function WebStepCard({ number, title, desc }: { number: string; title: string; desc: string }) {
  return (
    <div className="cd-step" style={webStepStyle as any}>
      <View style={styles.stepNumberBox}>
        <Text style={styles.stepNumberText}>{number}</Text>
      </View>
      <View style={styles.stepContent}>
        <Text style={styles.stepTitle}>{title}</Text>
        <Text style={styles.stepDesc}>{desc}</Text>
      </View>
    </div>
  );
}

function StepCard({ number, title, desc }: { number: string; title: string; desc: string }) {
  return (
    <View style={styles.stepCard}>
      <View style={styles.stepNumberBox}>
        <Text style={styles.stepNumberText}>{number}</Text>
      </View>
      <View style={styles.stepContent}>
        <Text style={styles.stepTitle}>{title}</Text>
        <Text style={styles.stepDesc}>{desc}</Text>
      </View>
    </View>
  );
}

const webStatStyle = {
  flex: 1,
  padding: '16px 8px',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: 6,
};

const webStepStyle = {
  display: 'flex',
  flexDirection: 'row',
  alignItems: 'center',
  padding: 14,
  gap: 14,
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingBottom: 16,
    justifyContent: 'space-between',
  },

  // Hero
  heroCard: {
    borderRadius: 28,
    padding: 24,
    marginTop: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    ...Platform.select({
      ios: { shadowColor: 'rgba(0,0,0,0.4)', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 1, shadowRadius: 30 },
      android: { elevation: 16 },
    }),
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: -0.8,
    marginBottom: 6,
  },
  heroSub: {
    fontSize: 14,
    color: colors.textMuted,
    lineHeight: 21,
    marginBottom: 22,
    letterSpacing: 0.1,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  statBox: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.04)',
  },
  statBoxAccent: {
    backgroundColor: 'rgba(0,230,118,0.06)',
    borderColor: 'rgba(0,230,118,0.08)',
  },
  statValue: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.accent,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },

  // Steps
  steps: { gap: 6 },
  stepCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderRadius: 18,
    padding: 14,
    gap: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.04)',
  },
  stepNumberBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(0,230,118,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0,230,118,0.12)',
  },
  stepNumberText: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.accent,
    letterSpacing: 0.5,
  },
  stepContent: { flex: 1 },
  stepTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 2,
    letterSpacing: 0.2,
  },
  stepDesc: {
    fontSize: 12,
    color: colors.textMuted,
    letterSpacing: 0.1,
  },

  // Buttons
  buttons: { gap: 10, paddingTop: 4 },

  nativePrimaryBtn: {
    borderRadius: 18,
    paddingVertical: 18,
    alignItems: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  nativeSecondaryBtn: {
    borderRadius: 18,
    paddingVertical: 17,
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.04)',
  },

  primaryBtnText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  secondaryBtnText: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
});
