import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../constants/colors';
import { useDiagnosis } from './_layout';

export default function HomeScreen() {
  const router = useRouter();
  const { reset } = useDiagnosis();

  const startDiagnosis = () => {
    reset();
    router.push('/camera');
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

            {/* Stats row */}
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
            <StepCard
              number="01"
              title="Foto aufnehmen"
              description="Betroffene Blätter nah fotografieren"
            />
            <StepCard
              number="02"
              title="Bedingungen eingeben"
              description="pH, Temperatur, Substrat & mehr"
            />
            <StepCard
              number="03"
              title="Diagnose erhalten"
              description="KI-Analyse mit Aktionsplan"
            />
          </View>

          {/* Buttons */}
          <View style={styles.buttons}>
            <TouchableOpacity onPress={startDiagnosis} activeOpacity={0.85}>
              <LinearGradient
                colors={['#00E676', '#00C853', '#00A844']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.primaryBtn}
              >
                <Text style={styles.primaryBtnText}>Diagnose starten</Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryBtn}
              onPress={() => router.push('/history')}
              activeOpacity={0.7}
            >
              <Text style={styles.secondaryBtnText}>Verlauf anzeigen</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    </LinearGradient>
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
  gradient: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingBottom: 16,
    justifyContent: 'space-between',
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingTop: 12,
  },
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
  logoEmoji: {
    fontSize: 24,
  },

  // Hero Card
  heroCard: {
    borderRadius: 24,
    padding: 24,
    marginTop: 16,
    ...Platform.select({
      ios: {
        shadowColor: colors.shadowDark,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 1,
        shadowRadius: 24,
      },
      android: { elevation: 12 },
      web: {
        boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
      },
    }),
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.white,
    letterSpacing: -0.5,
    marginBottom: 6,
  },
  heroSub: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: 20,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  statBox: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  statBoxAccent: {
    backgroundColor: 'rgba(0,230,118,0.12)',
    borderColor: 'rgba(0,230,118,0.2)',
  },
  statValue: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.accent,
    letterSpacing: 0.5,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // Steps
  steps: {
    gap: 8,
  },
  stepCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardDark,
    borderRadius: 16,
    padding: 14,
    gap: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  stepNumber: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.cardLight,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  stepNumberText: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.accent,
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 2,
  },
  stepDesc: {
    fontSize: 12,
    color: colors.textMuted,
  },

  // Buttons
  buttons: {
    gap: 10,
    paddingTop: 4,
  },
  primaryBtn: {
    borderRadius: 16,
    paddingVertical: 17,
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: colors.shadowGreen,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 1,
        shadowRadius: 16,
      },
      android: { elevation: 8 },
      web: {
        boxShadow: '0 6px 24px rgba(0,230,118,0.25)',
      },
    }),
  },
  primaryBtnText: {
    color: colors.white,
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  secondaryBtn: {
    borderRadius: 16,
    paddingVertical: 17,
    alignItems: 'center',
    backgroundColor: colors.cardDark,
    borderWidth: 1,
    borderColor: colors.border,
  },
  secondaryBtnText: {
    color: colors.textSecondary,
    fontSize: 15,
    fontWeight: '600',
  },
});
