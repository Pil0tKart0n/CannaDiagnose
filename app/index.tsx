import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, Platform, TouchableOpacity, Modal, Animated } from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../constants/colors';
import { useDiagnosis } from './_layout';
import { getQuotaDisplay, setPremium, setSessionToken } from '../services/quota';
import { hasCompletedOnboarding } from './onboarding';
import { trackEvent } from '../services/analytics';
import { t, getLang, setLang, onLangChange } from '../services/i18n';
import { injectCSS } from '../constants/webStyles';
import LegalFooter from '../components/LegalFooter';
import InstallBanner from '../components/InstallBanner';

export default function HomeScreen() {
  const router = useRouter();
  const { reset } = useDiagnosis();
  const [_lang, setLangState] = useState(getLang());
  useEffect(() => {
    const unsub = onLangChange((l) => setLangState(l));
    return unsub;
  }, []);
  const [showInfo, setShowInfo] = useState(false);
  const [quotaText, setQuotaText] = useState('');
  const [quotaIsPremium, setQuotaIsPremium] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);

  useEffect(() => {
    injectCSS();
    trackEvent('page_home');

    let cleanupInstallPrompt: (() => void) | undefined;

    // PWA install prompt (Android Chrome)
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const handler = (e: any) => {
        e.preventDefault();
        setInstallPrompt(e);
        // Show banner if not already installed as PWA
        if (!window.matchMedia('(display-mode: standalone)').matches) {
          setShowInstallBanner(true);
        }
      };
      window.addEventListener('beforeinstallprompt', handler);
      cleanupInstallPrompt = () => window.removeEventListener('beforeinstallprompt', handler);
      // Check if running as APK-like (Android without install prompt = probably already native)
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
      const isAndroid = /android/i.test(navigator.userAgent);
      // Show APK download hint for Android users in browser (not standalone)
      if (isAndroid && !isStandalone) {
        setShowInstallBanner(true);
      }
    }

    // Check for Stripe payment success redirect — verify with server
    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.location.search.includes('session_id=')) {
      const params = new URLSearchParams(window.location.search);
      const sessionId = params.get('session_id');
      if (sessionId) {
        fetch(`/api/verify-session?session_id=${encodeURIComponent(sessionId)}`)
          .then((r) => (r.ok ? r.json() : Promise.reject()))
          .then((data) => {
            if (data.token) {
              // Store server-issued token + mark premium locally
              setSessionToken(data.token);
              setPremium(true);
            }
          })
          .catch(() => {})
          .finally(() => {
            window.history.replaceState({}, '', '/');
            getQuotaDisplay().then((q) => {
              setQuotaText(q.text);
              setQuotaIsPremium(q.isPremium);
            });
          });
      }
    }
    // Check onboarding
    hasCompletedOnboarding()
      .then((done) => {
        if (!done) router.replace('/onboarding');
      })
      .catch(() => {});
    // Load quota
    getQuotaDisplay()
      .then((q) => {
        setQuotaText(q.text);
        setQuotaIsPremium(q.isPremium);
      })
      .catch(() => {});

    return () => {
      if (cleanupInstallPrompt) cleanupInstallPrompt();
    };
  }, []);

  // Re-check quota every time the screen gets focus (e.g. after paywall/promo)
  useFocusEffect(
    React.useCallback(() => {
      getQuotaDisplay()
        .then((q) => {
          setQuotaText(q.text);
          setQuotaIsPremium(q.isPremium);
        })
        .catch(() => {});
    }, []),
  );

  const startDiagnosis = async () => {
    // Check quota before navigating — don't waste user's time if limit reached
    try {
      const { canScan } = require('../services/quota');
      const quota = await canScan();
      if (!quota.allowed && !quota.isPremium) {
        router.push('/paywall');
        return;
      }
    } catch {}
    reset();
    router.push('/camera');
  };

  const isWeb = Platform.OS === 'web';

  // Shimmer animation for native premium button
  const shimmerAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!isWeb && !quotaIsPremium) {
      const loop = Animated.loop(
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: 3000,
          useNativeDriver: true,
        }),
      );
      loop.start();
      return () => loop.stop();
    }
  }, [quotaIsPremium]);

  const shimmerTranslateX = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-200, 200],
  });

  return (
    <View style={styles.screenBg}>
      {isWeb && <div className="cd-screen" style={{ position: 'absolute', inset: 0 } as any} />}
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          {/* Hero: Brand + Value Prop */}
          <View style={styles.centerArea}>
            {Platform.OS === 'web' && <View style={styles.logoGlow} />}
            {Platform.OS === 'web' && <View style={styles.logoGlowWarm} />}
            {Platform.OS === 'web' && <View style={styles.orbitDot} />}

            {Platform.OS === 'web' ? (
              <div className="cd-title-wrap">
                <Text style={styles.title}>Leaf</Text>
                <Text style={styles.titleAccent}>Scan</Text>
              </div>
            ) : (
              <>
                <Text style={styles.title}>Leaf</Text>
                <Text style={styles.titleAccent}>Scan</Text>
              </>
            )}

            <View style={styles.dividerWrap}>
              <View style={styles.dividerLine} />
              <View style={styles.dividerDiamond} />
              <View style={styles.dividerLine} />
            </View>

            <Text style={styles.tagline}>Scan it. Fix it.</Text>

            {quotaText ? (
              <TouchableOpacity
                style={[styles.quotaBadge, quotaIsPremium && styles.quotaBadgePremium]}
                onPress={() => !quotaIsPremium && router.push('/paywall')}
                activeOpacity={quotaIsPremium ? 1 : 0.7}
              >
                <Text style={[styles.quotaText, quotaIsPremium && styles.quotaTextPremium]}>{quotaText}</Text>
              </TouchableOpacity>
            ) : null}

            {/* How it works — 3-step flow */}
            <View style={styles.stepsRow}>
              <View style={styles.step}>
                <View style={styles.stepIcon}>
                  <Text style={styles.stepEmoji}>📸</Text>
                </View>
                <Text style={styles.stepLabel}>{t('home.stepPhoto') || 'Foto'}</Text>
              </View>
              <View style={styles.stepArrow}><Text style={styles.stepArrowText}>›</Text></View>
              <View style={styles.step}>
                <View style={styles.stepIcon}>
                  <Text style={styles.stepEmoji}>🔬</Text>
                </View>
                <Text style={styles.stepLabel}>{t('home.stepAnalysis') || 'Analyse'}</Text>
              </View>
              <View style={styles.stepArrow}><Text style={styles.stepArrowText}>›</Text></View>
              <View style={styles.step}>
                <View style={styles.stepIcon}>
                  <Text style={styles.stepEmoji}>✅</Text>
                </View>
                <Text style={styles.stepLabel}>{t('home.stepPlan') || 'Aktionsplan'}</Text>
              </View>
            </View>
          </View>

          {/* CTA Area — Primary action dominates */}
          <View style={styles.buttons}>
            {isWeb ? (
              <div
                className="cd-btn-primary"
                onClick={startDiagnosis}
                style={{ padding: '18px 24px', textAlign: 'center' } as any}
              >
                <Text style={styles.primaryBtnText}>{t('home.scan')}</Text>
              </div>
            ) : (
              <TouchableOpacity onPress={startDiagnosis} activeOpacity={0.85}>
                <LinearGradient
                  colors={['#6AF09E', '#5CE892', '#44C878']}
                  start={{ x: 0.5, y: 0 }}
                  end={{ x: 0.5, y: 1 }}
                  style={styles.nativePrimaryBtn}
                >
                  <Text style={styles.primaryBtnText}>{t('home.scan')}</Text>
                </LinearGradient>
              </TouchableOpacity>
            )}
            {/* Secondary nav */}
            <View style={styles.navRow}>
              {isWeb ? (
                <>
                  <div
                    className="cd-btn-secondary"
                    onClick={() => router.push('/plants')}
                    style={{ padding: '10px 12px', textAlign: 'center', flex: 1 } as any}
                  >
                    <Text style={styles.navBtnText}>{t('home.plants')}</Text>
                  </div>
                  <div
                    className="cd-btn-secondary"
                    onClick={() => router.push('/history')}
                    style={{ padding: '10px 12px', textAlign: 'center', flex: 1 } as any}
                  >
                    <Text style={styles.navBtnText}>{t('home.history')}</Text>
                  </div>
                  <div
                    className="cd-btn-secondary"
                    onClick={() => router.push('/library')}
                    style={{ padding: '10px 12px', textAlign: 'center', flex: 1 } as any}
                  >
                    <Text style={styles.navBtnText}>{t('home.library')}</Text>
                  </div>
                </>
              ) : (
                <>
                  <TouchableOpacity
                    style={[styles.navBtn, { flex: 1 }]}
                    onPress={() => router.push('/plants')}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.navBtnText}>{t('home.plants')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.navBtn, { flex: 1 }]}
                    onPress={() => router.push('/history')}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.navBtnText}>{t('home.history')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.navBtn, { flex: 1 }]}
                    onPress={() => router.push('/library')}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.navBtnText}>{t('home.library')}</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </View>

          {/* Install banner -- PWA or APK download for Android web users */}
          {isWeb && showInstallBanner && (
            <InstallBanner
              installPrompt={installPrompt}
              onInstallComplete={() => setShowInstallBanner(false)}
              onClearPrompt={() => setInstallPrompt(null)}
              onDismiss={() => setShowInstallBanner(false)}
            />
          )}

          {/* Premium upgrade link — always visible for non-premium */}
          {!quotaIsPremium &&
            (isWeb ? (
              <div
                className="cd-btn-premium"
                onClick={() => router.push('/paywall')}
                style={
                  {
                    padding: '12px 16px',
                    textAlign: 'center',
                    marginTop: 8,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  } as any
                }
              >
                <View style={styles.premiumRow}>
                  <Text style={styles.premiumIcon}>◆</Text>
                  <Text style={styles.premiumBtnText}>{t('home.unlockPremium')}</Text>
                  <Text style={styles.premiumArrow}>→</Text>
                </View>
              </div>
            ) : (
              <TouchableOpacity style={styles.premiumBtn} onPress={() => router.push('/paywall')} activeOpacity={0.7}>
                <Animated.View
                  style={[
                    styles.premiumShimmer,
                    { transform: [{ translateX: shimmerTranslateX }, { skewX: '-15deg' }] },
                  ]}
                >
                  <LinearGradient
                    colors={['transparent', 'rgba(255,215,0,0.10)', 'transparent']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={{ flex: 1 }}
                  />
                </Animated.View>
                <View style={styles.premiumRow}>
                  <Text style={styles.premiumIcon}>◆</Text>
                  <Text style={styles.premiumBtnText}>{t('home.unlockPremium')}</Text>
                  <Text style={styles.premiumArrow}>→</Text>
                </View>
              </TouchableOpacity>
            ))}

          {/* Language toggle */}
          <View style={styles.langToggleWrap}>
            <TouchableOpacity
              style={styles.langToggle}
              onPress={async () => {
                const newLang = getLang() === 'de' ? 'en' : 'de';
                await setLang(newLang);
              }}
              activeOpacity={0.7}
            >
              <Text style={[styles.langOption, getLang() === 'de' && styles.langOptionActive]}>DE</Text>
              <Text style={styles.langDivider}>|</Text>
              <Text style={[styles.langOption, getLang() === 'en' && styles.langOptionActive]}>EN</Text>
            </TouchableOpacity>
          </View>

          {/* Legal footer */}
          <LegalFooter onNavigate={(path) => router.push(path as any)} />
        </View>
      </SafeAreaView>

      {/* Info Modal */}
      <Modal visible={showInfo} transparent animationType="fade">
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowInfo(false)}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{t('modal.howTitle')}</Text>
            <Text style={styles.modalText}>{t('modal.howText')}</Text>
            <TouchableOpacity onPress={() => setShowInfo(false)} style={styles.modalClose}>
              <Text style={styles.modalCloseText}>{t('modal.understood')}</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screenBg: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: { flex: 1 },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingBottom: 20,
    ...Platform.select({
      web: { minHeight: '100%' },
    }),
  },

  // Center
  centerArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 20,
  },
  logoGlow: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: 'rgba(92,232,146,0.07)',
    top: '20%',
    ...Platform.select({
      web: { filter: 'blur(100px)', animation: 'cd-bg-breathe 6s ease-in-out infinite' },
      default: {},
    }),
  },
  logoGlowWarm: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(212,168,83,0.05)',
    top: '30%',
    left: '60%',
    ...Platform.select({
      web: { filter: 'blur(80px)', animation: 'cd-bg-breathe 8s ease-in-out infinite 3s' },
      default: {},
    }),
  },
  orbitDot: {
    position: 'absolute',
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(92,232,146,0.4)',
    top: '40%',
    ...Platform.select({
      web: { animation: 'cd-glow-orbit 12s linear infinite', boxShadow: '0 0 12px rgba(92,232,146,0.4)' },
      default: {},
    }),
  },
  title: {
    fontSize: 48,
    fontWeight: '300',
    color: 'rgba(228,235,230,0.6)',
    letterSpacing: 12,
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  titleAccent: {
    fontSize: 48,
    fontWeight: '700',
    color: colors.accent,
    letterSpacing: 12,
    textTransform: 'uppercase',
    marginTop: -8,
    textAlign: 'center',
    ...Platform.select({
      web: { textShadow: '0 0 40px rgba(92,232,146,0.3), 0 0 80px rgba(92,232,146,0.1)' },
      default: {},
    }),
  },
  tagline: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textMuted,
    letterSpacing: 6,
    textTransform: 'uppercase',
    marginBottom: 16,
  },
  // Steps row
  stepsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 20,
    paddingHorizontal: 8,
    paddingVertical: 14,
    borderRadius: 16,
    backgroundColor: 'rgba(92,232,146,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(92,232,146,0.08)',
  },
  step: {
    alignItems: 'center',
    gap: 6,
  },
  stepIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(92,232,146,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepEmoji: {
    fontSize: 18,
  },
  stepLabel: {
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: '500',
    letterSpacing: 0.3,
  },
  stepArrow: {
    paddingHorizontal: 4,
    marginBottom: 18,
  },
  stepArrowText: {
    fontSize: 20,
    color: 'rgba(92,232,146,0.3)',
    fontWeight: '300',
  },
  dividerWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginVertical: 18,
  },
  dividerLine: {
    width: 28,
    height: 1,
    backgroundColor: colors.accentDivider,
  },
  dividerDiamond: {
    width: 6,
    height: 6,
    backgroundColor: colors.accent,
    transform: [{ rotate: '45deg' }],
    opacity: 0.4,
  },
  ctaSubtext: {
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 10,
    letterSpacing: 0.3,
  },
  navRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  navBtn: {
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: 'rgba(92,232,146,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(92,232,146,0.15)',
  },
  navBtnText: {
    color: 'rgba(228,235,230,0.7)',
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  valueProp: {
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginTop: 4,
    letterSpacing: 0.3,
  },

  // Quota badge
  quotaBadge: {
    marginTop: 12,
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: colors.accentGlow,
    borderWidth: 1,
    borderColor: colors.borderAccent,
  },
  quotaBadgePremium: {
    backgroundColor: colors.accentWarmGlow,
    borderColor: colors.accentWarmSubtle,
  },
  quotaText: {
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: '500',
    letterSpacing: 0.3,
  },
  quotaTextPremium: {
    color: colors.accentWarm,
  },

  // Language toggle
  langToggleWrap: {
    alignItems: 'center',
    marginBottom: 12,
  },
  langToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(92,232,146,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(92,232,146,0.15)',
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 16,
    gap: 8,
  },
  langOption: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textMuted,
    letterSpacing: 0.5,
  },
  langOptionActive: {
    color: colors.accent,
  },
  langDivider: {
    fontSize: 13,
    color: 'rgba(92,232,146,0.2)',
    fontWeight: '300',
  },

  // Premium upgrade
  premiumBtn: {
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: 'rgba(218,165,32,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(218,165,32,0.35)',
    marginTop: 4,
    overflow: 'hidden',
  },
  premiumShimmer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 120,
  },
  premiumRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  premiumIcon: {
    fontSize: 14,
    color: '#DAA520',
  },
  premiumBtnText: {
    color: '#DAA520',
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  premiumArrow: {
    fontSize: 14,
    color: 'rgba(218,165,32,0.5)',
    marginLeft: 4,
  },

  // Buttons
  buttons: { gap: 10 },
  secondaryRow: {
    flexDirection: 'row',
    gap: 10,
  },
  nativePrimaryBtn: {
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    overflow: 'hidden',
    ...Platform.select({
      ios: { shadowColor: '#5CE892', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 16 },
      android: { elevation: 8 },
    }),
  },
  nativeSecondaryBtn: {
    borderRadius: 12,
    paddingVertical: 11,
    alignItems: 'center',
    backgroundColor: 'rgba(15,23,19,0.5)',
    borderWidth: 1,
    borderColor: 'rgba(92,232,146,0.06)',
  },
  primaryBtnText: {
    color: colors.textOnAccent,
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  secondaryBtnText: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '500',
    letterSpacing: 0.3,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  modalCard: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 340,
    borderWidth: 1,
    borderColor: colors.border,
    ...Platform.select({
      web: {
        backdropFilter: 'blur(40px)',
        backgroundColor: 'rgba(26,36,31,0.92)',
        boxShadow: '0 24px 48px rgba(0,0,0,0.4)',
      },
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 16 }, shadowOpacity: 0.5, shadowRadius: 30 },
      android: { elevation: 20 },
    }),
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 16,
  },
  modalText: {
    fontSize: 15,
    color: colors.textSecondary,
    lineHeight: 24,
    marginBottom: 24,
  },
  modalClose: {
    backgroundColor: colors.accentSubtle,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.borderAccent,
  },
  modalCloseText: {
    color: colors.accent,
    fontSize: 15,
    fontWeight: '600',
  },
});
