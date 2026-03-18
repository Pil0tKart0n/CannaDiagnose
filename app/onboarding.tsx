import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  ScrollView,
  Platform,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors } from '../constants/colors';

const { width } = Dimensions.get('window');
const ONBOARDING_KEY = 'leafscan_onboarding_done';

interface Slide {
  icon: string;
  title: string;
  subtitle: string;
  description: string;
}

const slides: Slide[] = [
  {
    icon: 'leaf-outline',
    title: 'Willkommen bei\nLeafScan',
    subtitle: 'Dein Grow-Assistent',
    description:
      'Erkennt Nährstoffmängel anhand von Fotos deiner Pflanze — schnell, einfach und KI-gestützt.',
  },
  {
    icon: 'camera-outline',
    title: 'Foto aufnehmen',
    subtitle: 'Schritt 1',
    description:
      'Fotografiere das betroffene Blatt möglichst nah und scharf. Bis zu 3 Fotos aus verschiedenen Winkeln machen die Diagnose deutlich genauer.',
  },
  {
    icon: 'sunny-outline',
    title: 'Tipps für gute Fotos',
    subtitle: 'Wichtig',
    description:
      'Nutze normales weißes Licht oder Tageslicht. Fotos unter Growlampen (Blurple, NDL) verfälschen die Farben und erschweren die Diagnose.\n\nSchalte die Growlampe kurz aus oder halte das Blatt ans Fenster.',
  },
  {
    icon: 'clipboard-outline',
    title: 'Setup beschreiben',
    subtitle: 'Schritt 2',
    description:
      'Beantworte ein paar kurze Fragen zu deinem Grow — Substrat, Beleuchtung, Bewässerung. Je mehr Infos du gibst, desto präziser wird die Diagnose.',
  },
  {
    icon: 'analytics-outline',
    title: 'Diagnose & Aktionsplan',
    subtitle: 'Schritt 3',
    description:
      'Die KI analysiert deine Fotos und Angaben und liefert dir eine Diagnose mit konkreten Schritten, was du jetzt tun kannst.\n\nDanach kannst du mit pH/EC-Werten die Diagnose noch verfeinern.',
  },
  {
    icon: 'leaf-outline',
    title: 'Pflanzen verwalten',
    subtitle: 'Extra',
    description:
      'Lege Profile für deine Pflanzen an und verfolge ihren Gesundheitsverlauf über die Zeit. So siehst du ob deine Behandlung wirkt.',
  },
  {
    icon: 'checkmark-circle-outline',
    title: 'Bereit?',
    subtitle: 'Bevor es losgeht',
    description:
      'Du bekommst täglich eine kostenlose Diagnose. Die Bibliothek mit Infos zu allen Mängeln ist jederzeit verfügbar.\n\nDie Diagnosen sind KI-gestützt und ersetzen keine professionelle Beratung.',
  },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const scrollRef = useRef<ScrollView>(null);
  const [currentSlide, setCurrentSlide] = useState(0);

  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const index = Math.round(e.nativeEvent.contentOffset.x / width);
    setCurrentSlide(index);
  };

  const goNext = () => {
    if (currentSlide < slides.length - 1) {
      scrollRef.current?.scrollTo({ x: (currentSlide + 1) * width, animated: true });
    } else {
      finishOnboarding();
    }
  };

  const finishOnboarding = async () => {
    await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
    router.replace('/');
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
      >
        {slides.map((slide, i) => (
          <View key={i} style={[styles.slide, { width }]}>
            <View style={styles.iconCircle}>
              <Ionicons name={slide.icon as any} size={48} color={colors.accent} />
            </View>
            <Text style={styles.subtitle}>{slide.subtitle}</Text>
            <Text style={styles.slideTitle}>{slide.title}</Text>
            <Text style={styles.description}>{slide.description}</Text>
          </View>
        ))}
      </ScrollView>

      {/* Dots */}
      <View style={styles.dotsRow}>
        {slides.map((_, i) => (
          <View
            key={i}
            style={[styles.dot, i === currentSlide && styles.dotActive]}
          />
        ))}
      </View>

      {/* Buttons */}
      <View style={styles.buttonsRow}>
        {currentSlide < slides.length - 1 ? (
          <>
            <TouchableOpacity onPress={finishOnboarding} style={styles.skipBtn}>
              <Text style={styles.skipText}>Überspringen</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={goNext} style={styles.nextBtn}>
              <Text style={styles.nextText}>Weiter</Text>
              <Ionicons name="arrow-forward" size={18} color={colors.textOnAccent} />
            </TouchableOpacity>
          </>
        ) : (
          <TouchableOpacity onPress={finishOnboarding} style={[styles.nextBtn, styles.startBtn]}>
            <Text style={styles.nextText}>Los geht's!</Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

/** Check if onboarding has been completed */
export async function hasCompletedOnboarding(): Promise<boolean> {
  const val = await AsyncStorage.getItem(ONBOARDING_KEY);
  return val === 'true';
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  slide: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  iconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.accentGlow,
    borderWidth: 1,
    borderColor: colors.borderAccent,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
  },
  subtitle: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.accent,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  slideTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 16,
    textAlign: 'center',
  },
  description: {
    fontSize: 15,
    color: colors.textSecondary,
    lineHeight: 24,
    textAlign: 'center',
    maxWidth: 320,
  },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 24,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.border,
  },
  dotActive: {
    backgroundColor: colors.accent,
    width: 24,
  },
  buttonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 16,
  },
  skipBtn: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  skipText: {
    fontSize: 14,
    color: colors.textMuted,
    fontWeight: '500',
  },
  nextBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.accent,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  startBtn: {
    flex: 1,
    justifyContent: 'center',
  },
  nextText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textOnAccent,
  },
});
