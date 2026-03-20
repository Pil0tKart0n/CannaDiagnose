import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Platform,
  TouchableOpacity,
  Modal,
  Animated,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../constants/colors';
import { useDiagnosis } from './_layout';
import { getQuotaDisplay, setPremium, setSessionToken } from '../services/quota';
import { hasCompletedOnboarding } from './onboarding';

const webCSS = Platform.OS === 'web' ? `
  @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400;500;600&family=DM+Sans:wght@400;500;600;700&display=swap');
  .cd-screen {
    background:
      radial-gradient(ellipse 60% 45% at 50% 95%, rgba(92,232,146,0.05) 0%, transparent 70%),
      radial-gradient(ellipse 40% 30% at 20% 20%, rgba(212,168,83,0.03) 0%, transparent 60%),
      linear-gradient(175deg, #0D1210 0%, #080C0A 100%);
    min-height: 100%;
  }
  .cd-btn-primary {
    position: relative; overflow: hidden; border-radius: 14px;
    background: linear-gradient(170deg, #6AF09E 0%, #5CE892 40%, #44C878 100%);
    box-shadow: 0 4px 20px rgba(92,232,146,0.25), 0 1px 3px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.18);
    transition: transform 0.2s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.3s ease; cursor: pointer;
  }
  .cd-btn-primary:hover { transform: translateY(-1px) scale(1.01); box-shadow: 0 6px 28px rgba(92,232,146,0.3), 0 2px 6px rgba(0,0,0,0.2); }
  .cd-btn-primary:active { transform: translateY(1px) scale(0.98); }
  .cd-btn-secondary {
    position: relative; overflow: hidden; border-radius: 14px;
    border: 1px solid rgba(92,232,146,0.08);
    background: rgba(15,23,19,0.6);
    backdrop-filter: blur(8px);
    transition: transform 0.2s ease, background 0.2s ease, border-color 0.2s ease; cursor: pointer;
  }
  .cd-btn-secondary:hover { background: rgba(92,232,146,0.04); border-color: rgba(92,232,146,0.15); }
  .cd-btn-secondary:active { transform: scale(0.97); }
  @keyframes cd-shimmer {
    0% { transform: translateX(-100%); }
    100% { transform: translateX(100%); }
  }
  @keyframes cd-glow-pulse {
    0%, 100% { opacity: 0.4; transform: scale(1); }
    50% { opacity: 0.7; transform: scale(1.05); }
  }
  .cd-btn-premium {
    position: relative; overflow: hidden; border-radius: 14px;
    background: linear-gradient(135deg, rgba(212,168,83,0.08) 0%, rgba(212,168,83,0.03) 50%, rgba(212,168,83,0.08) 100%);
    border: 1px solid rgba(212,168,83,0.25);
    box-shadow: 0 0 24px rgba(212,168,83,0.06), inset 0 1px 0 rgba(255,215,0,0.05);
    transition: transform 0.2s ease, box-shadow 0.3s ease; cursor: pointer;
  }
  .cd-btn-premium:hover {
    transform: translateY(-1px);
    box-shadow: 0 0 32px rgba(212,168,83,0.12), inset 0 1px 0 rgba(255,215,0,0.08);
  }
  .cd-btn-premium:active { transform: scale(0.97); }
  .cd-btn-premium::after {
    content: '';
    position: absolute; top: 0; left: 0; right: 0; bottom: 0;
    background: linear-gradient(105deg, transparent 30%, rgba(255,215,0,0.10) 50%, transparent 70%);
    animation: cd-shimmer 3.5s ease-in-out infinite;
    pointer-events: none;
  }
  .cd-title-display { font-family: 'Cormorant Garamond', serif; }
  .cd-body-text { font-family: 'DM Sans', sans-serif; }
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
  const [showInfo, setShowInfo] = useState(false);
  const [quotaText, setQuotaText] = useState('');
  const [quotaIsPremium, setQuotaIsPremium] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);

  useEffect(() => {
    injectCSS();

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
      // Check if running as APK-like (Android without install prompt = probably already native)
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
      const isAndroid = /android/i.test(navigator.userAgent);
      // Show APK download hint for Android users in browser (not standalone)
      if (isAndroid && !isStandalone) {
        setShowInstallBanner(true);
      }
      return () => window.removeEventListener('beforeinstallprompt', handler);
    }

    // Check for Stripe payment success redirect — verify with server
    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.location.search.includes('session_id=')) {
      const params = new URLSearchParams(window.location.search);
      const sessionId = params.get('session_id');
      if (sessionId) {
        fetch(`/api/verify-session?session_id=${encodeURIComponent(sessionId)}`)
          .then(r => r.ok ? r.json() : Promise.reject())
          .then(data => {
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
    hasCompletedOnboarding().then((done) => {
      if (!done) router.replace('/onboarding');
    }).catch(() => {});
    // Load quota
    getQuotaDisplay().then((q) => {
      setQuotaText(q.text);
      setQuotaIsPremium(q.isPremium);
    }).catch(() => {});
  }, []);

  // Re-check quota every time the screen gets focus (e.g. after paywall/promo)
  useFocusEffect(
    React.useCallback(() => {
      getQuotaDisplay().then((q) => {
        setQuotaText(q.text);
        setQuotaIsPremium(q.isPremium);
      }).catch(() => {});
    }, [])
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
        })
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

          {/* Center: Title + Flow — takes all available space, centered */}
          <View style={styles.centerArea}>
            {/* Layered glow behind logo (web only) */}
            {Platform.OS === 'web' && <View style={styles.logoGlow} />}
            {Platform.OS === 'web' && <View style={styles.logoGlowWarm} />}
            {Platform.OS === 'web' ? (
              <div className="cd-title-display" style={{}} >
                <Text style={styles.title}>Leaf</Text>
                <Text style={styles.titleAccent}>Scan</Text>
              </div>
            ) : (
              <>
                <Text style={styles.title}>Leaf</Text>
                <Text style={styles.titleAccent}>Scan</Text>
              </>
            )}

            <View style={styles.divider} />

            <Text style={styles.tagline}>KI-Pflanzendiagnose</Text>

            <View style={styles.flowRow}>
              <Text style={styles.flowStep}>Foto</Text>
              <Text style={styles.flowDot}>›</Text>
              <Text style={styles.flowStep}>Analyse</Text>
              <Text style={styles.flowDot}>›</Text>
              <Text style={styles.flowStep}>Aktionsplan</Text>
            </View>

            <TouchableOpacity onPress={() => setShowInfo(true)} style={styles.infoLink}>
              <Text style={styles.infoLinkText}>Wie funktioniert's?</Text>
            </TouchableOpacity>

            {quotaText ? (
              <TouchableOpacity
                style={[styles.quotaBadge, quotaIsPremium && styles.quotaBadgePremium]}
                onPress={() => !quotaIsPremium && router.push('/paywall')}
                activeOpacity={quotaIsPremium ? 1 : 0.7}
              >
                <Text style={[styles.quotaText, quotaIsPremium && styles.quotaTextPremium]}>
                  {quotaText}
                </Text>
              </TouchableOpacity>
            ) : null}
          </View>

          {/* Buttons */}
          <View style={styles.buttons}>
            {isWeb ? (
              <>
                <div
                  className="cd-btn-primary"
                  onClick={startDiagnosis}
                  style={{ padding: '14px 24px', textAlign: 'center' } as any}
                >
                  <Text style={styles.primaryBtnText}>Diagnose starten</Text>
                </div>
                <View style={styles.secondaryRow}>
                  <div
                    className="cd-btn-secondary"
                    onClick={() => router.push('/plants')}
                    style={{ padding: '12px 16px', textAlign: 'center', flex: 1 } as any}
                  >
                    <Text style={styles.secondaryBtnText}>Meine Pflanzen</Text>
                  </div>
                  <div
                    className="cd-btn-secondary"
                    onClick={() => router.push('/history')}
                    style={{ padding: '12px 16px', textAlign: 'center', flex: 1 } as any}
                  >
                    <Text style={styles.secondaryBtnText}>Verlauf</Text>
                  </div>
                </View>
                <div
                  className="cd-btn-secondary"
                  onClick={() => router.push('/library')}
                  style={{ padding: '12px 16px', textAlign: 'center' } as any}
                >
                  <Text style={styles.secondaryBtnText}>Bibliothek</Text>
                </div>
              </>
            ) : (
              <>
                <TouchableOpacity onPress={startDiagnosis} activeOpacity={0.85}>
                  <LinearGradient
                    colors={['#5AEF90', '#4ADE80', '#3CC870']}
                    start={{ x: 0.5, y: 0 }}
                    end={{ x: 0.5, y: 1 }}
                    style={styles.nativePrimaryBtn}
                  >
                    <Text style={styles.primaryBtnText}>Diagnose starten</Text>
                  </LinearGradient>
                </TouchableOpacity>
                <View style={styles.secondaryRow}>
                  <TouchableOpacity
                    style={[styles.nativeSecondaryBtn, { flex: 1 }]}
                    onPress={() => router.push('/plants')}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.secondaryBtnText}>Meine Pflanzen</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.nativeSecondaryBtn, { flex: 1 }]}
                    onPress={() => router.push('/history')}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.secondaryBtnText}>Verlauf</Text>
                  </TouchableOpacity>
                </View>
                <TouchableOpacity
                  style={styles.nativeSecondaryBtn}
                  onPress={() => router.push('/library')}
                  activeOpacity={0.7}
                >
                  <Text style={styles.secondaryBtnText}>Bibliothek</Text>
                </TouchableOpacity>
              </>
            )}
          </View>

          {/* Install banner — PWA or APK download for Android web users */}
          {isWeb && showInstallBanner && (
            <View style={styles.installBanner}>
              {installPrompt ? (
                <TouchableOpacity
                  style={styles.installBtn}
                  onPress={async () => {
                    installPrompt.prompt();
                    const result = await installPrompt.userChoice;
                    if (result.outcome === 'accepted') {
                      setShowInstallBanner(false);
                    }
                    setInstallPrompt(null);
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={styles.installBtnText}>App installieren</Text>
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
                  <Text style={styles.installBtnText}>Android App herunterladen</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity onPress={() => setShowInstallBanner(false)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Text style={styles.installDismiss}>Nicht jetzt</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Premium upgrade link — always visible for non-premium */}
          {!quotaIsPremium && (
            isWeb ? (
              <div
                className="cd-btn-premium"
                onClick={() => router.push('/paywall')}
                style={{ padding: '12px 16px', textAlign: 'center', marginTop: 4 } as any}
              >
                <View style={styles.premiumRow}>
                  <Text style={styles.premiumIcon}>◆</Text>
                  <Text style={styles.premiumBtnText}>Premium freischalten</Text>
                  <Text style={styles.premiumArrow}>→</Text>
                </View>
              </div>
            ) : (
              <TouchableOpacity
                style={styles.premiumBtn}
                onPress={() => router.push('/paywall')}
                activeOpacity={0.7}
              >
                <Animated.View
                  style={[styles.premiumShimmer, { transform: [{ translateX: shimmerTranslateX }, { skewX: '-15deg' }] }]}
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
                  <Text style={styles.premiumBtnText}>Premium freischalten</Text>
                  <Text style={styles.premiumArrow}>→</Text>
                </View>
              </TouchableOpacity>
            )
          )}

          {/* Legal footer */}
          <View style={styles.legalFooter}>
            <Text style={styles.legalText}>
              Internetverbindung erforderlich
            </Text>
          </View>
          <View style={styles.legalFooter}>
            <TouchableOpacity onPress={() => router.push('/privacy')}>
              <Text style={styles.legalLink}>Datenschutz</Text>
            </TouchableOpacity>
            <Text style={styles.legalDot}>·</Text>
            <TouchableOpacity onPress={() => router.push('/terms')}>
              <Text style={styles.legalLink}>AGB</Text>
            </TouchableOpacity>
            <Text style={styles.legalDot}>·</Text>
            <TouchableOpacity onPress={() => router.push('/impressum')}>
              <Text style={styles.legalLink}>Impressum</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>

      {/* Info Modal */}
      <Modal visible={showInfo} transparent animationType="fade">
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowInfo(false)}
        >
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>So funktioniert's</Text>
            <Text style={styles.modalText}>
              Mach ein Foto von der betroffenen Stelle –{'\n'}
              Blatt, Stängel oder die ganze Pflanze.{'\n\n'}
              Beantworte ein paar kurze Fragen zu{'\n'}
              deinem Setup.{'\n\n'}
              Du bekommst eine Diagnose mit konkreten{'\n'}
              Schritten, was du jetzt tun kannst.
            </Text>
            <TouchableOpacity onPress={() => setShowInfo(false)} style={styles.modalClose}>
              <Text style={styles.modalCloseText}>Verstanden</Text>
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
  },
  logoGlow: {
    position: 'absolute',
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: 'rgba(92,232,146,0.05)',
    top: '25%',
    ...Platform.select({
      web: { filter: 'blur(80px)', animation: 'cd-glow-pulse 6s ease-in-out infinite' },
      default: {},
    }),
  },
  logoGlowWarm: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(212,168,83,0.03)',
    top: '35%',
    left: '30%',
    ...Platform.select({
      web: { filter: 'blur(60px)', animation: 'cd-glow-pulse 8s ease-in-out infinite 2s' },
      default: {},
    }),
  },
  title: {
    fontSize: 48,
    fontWeight: '300',
    color: colors.text,
    letterSpacing: 8,
    textTransform: 'uppercase',
  },
  titleAccent: {
    fontSize: 48,
    fontWeight: '600',
    color: colors.accent,
    letterSpacing: 8,
    textTransform: 'uppercase',
    marginTop: -6,
  },
  tagline: {
    fontSize: 11,
    fontWeight: '500',
    color: colors.textMuted,
    letterSpacing: 3,
    textTransform: 'uppercase',
    marginBottom: 24,
  },
  divider: {
    width: 40,
    height: 1,
    backgroundColor: colors.accentDivider,
    marginVertical: 20,
    borderRadius: 1,
  },
  flowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  flowStep: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textMuted,
    letterSpacing: 1.8,
    textTransform: 'uppercase',
  },
  flowDot: {
    fontSize: 13,
    color: colors.accentDotMuted,
    fontWeight: '400',
  },
  infoLink: {
    marginTop: 24,
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(100,112,105,0.2)',
  },
  infoLinkText: {
    fontSize: 12,
    color: colors.textMuted,
    fontWeight: '500',
    letterSpacing: 0.5,
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

  // Install banner
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

  // Legal footer
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
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: 'center',
    backgroundColor: 'rgba(15,23,19,0.5)',
    borderWidth: 1,
    borderColor: 'rgba(92,232,146,0.08)',
  },
  primaryBtnText: {
    color: colors.textOnAccent,
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  secondaryBtnText: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '500',
    letterSpacing: 0.4,
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
