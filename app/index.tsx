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
import { trackEvent } from '../services/analytics';
import { t, getLang, setLang, onLangChange } from '../services/i18n';

const webCSS = Platform.OS === 'web' ? `
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600;700;800&family=DM+Sans:wght@400;500;600;700&display=swap');

  html, body, #root {
    background: #040806 !important;
  }
  body::before {
    content: '';
    position: fixed;
    inset: 0;
    z-index: 0;
    background:
      radial-gradient(ellipse 50% 40% at 50% 50%, rgba(92,232,146,0.03) 0%, transparent 70%),
      radial-gradient(ellipse 80% 60% at 50% 100%, rgba(92,232,146,0.04) 0%, transparent 50%),
      radial-gradient(ellipse 40% 40% at 0% 0%, rgba(56,217,176,0.02) 0%, transparent 50%),
      radial-gradient(ellipse 40% 40% at 100% 0%, rgba(212,168,83,0.015) 0%, transparent 50%),
      radial-gradient(ellipse 100% 100% at 50% 50%, transparent 30%, rgba(0,0,0,0.5) 100%);
    pointer-events: none;
  }
  body::after {
    content: '';
    position: fixed;
    inset: 0;
    z-index: 0;
    background: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.025'/%3E%3C/svg%3E");
    background-size: 128px 128px;
    mix-blend-mode: overlay;
    pointer-events: none;
  }
  #root {
    position: relative;
    z-index: 1;
  }
  .cd-screen {
    background: #060A08;
    min-height: 100%;
    position: relative;
    overflow: hidden;
  }
  .cd-screen::before {
    content: '';
    position: absolute; inset: 0;
    background:
      radial-gradient(ellipse 60% 45% at 50% 50%, rgba(92,232,146,0.06) 0%, transparent 70%),
      radial-gradient(ellipse 70% 50% at 50% 100%, rgba(92,232,146,0.07) 0%, transparent 55%),
      radial-gradient(ellipse 45% 35% at 10% 20%, rgba(56,217,176,0.035) 0%, transparent 50%),
      radial-gradient(ellipse 30% 30% at 90% 25%, rgba(212,168,83,0.03) 0%, transparent 50%),
      radial-gradient(ellipse 100% 100% at 50% 50%, transparent 40%, rgba(0,0,0,0.4) 100%);
    animation: cd-bg-breathe 8s ease-in-out infinite;
  }
  .cd-screen::after {
    content: '';
    position: absolute; inset: 0;
    background: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.03'/%3E%3C/svg%3E");
    background-size: 128px 128px;
    opacity: 1;
    pointer-events: none;
    mix-blend-mode: overlay;
  }
  @keyframes cd-bg-breathe {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.7; }
  }
  @keyframes cd-float {
    0%, 100% { transform: translateY(0px) rotate(0deg); }
    33% { transform: translateY(-8px) rotate(1deg); }
    66% { transform: translateY(4px) rotate(-0.5deg); }
  }
  @keyframes cd-glow-orbit {
    0% { transform: rotate(0deg) translateX(120px) rotate(0deg); opacity: 0.5; }
    50% { opacity: 0.8; }
    100% { transform: rotate(360deg) translateX(120px) rotate(-360deg); opacity: 0.5; }
  }
  @keyframes cd-shimmer {
    0% { transform: translateX(-100%); }
    100% { transform: translateX(100%); }
  }
  @keyframes cd-border-glow {
    0%, 100% { border-color: rgba(92,232,146,0.08); }
    50% { border-color: rgba(92,232,146,0.18); }
  }
  @keyframes cd-shine {
    0% { left: -100%; }
    100% { left: 200%; }
  }
  .cd-title-wrap {
    font-family: 'Playfair Display', serif;
    animation: cd-float 6s ease-in-out infinite;
    position: relative;
  }
  .cd-btn-primary {
    position: relative; overflow: hidden; border-radius: 16px;
    background: linear-gradient(165deg, #72F5A8 0%, #5CE892 35%, #3BBF6E 100%);
    box-shadow: 0 6px 30px rgba(92,232,146,0.3), 0 2px 4px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.2);
    transition: transform 0.25s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.3s ease; cursor: pointer;
  }
  .cd-btn-primary::after {
    content: '';
    position: absolute; top: 0; width: 40%; height: 100%;
    background: linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent);
    animation: cd-shine 4s ease-in-out infinite;
    pointer-events: none;
  }
  .cd-btn-primary:hover { transform: translateY(-2px) scale(1.02); box-shadow: 0 10px 40px rgba(92,232,146,0.35), 0 4px 8px rgba(0,0,0,0.2); }
  .cd-btn-primary:active { transform: translateY(1px) scale(0.98); }
  .cd-btn-secondary {
    position: relative; overflow: hidden; border-radius: 14px;
    border: 1px solid rgba(92,232,146,0.06);
    background: rgba(12,20,16,0.7);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    transition: all 0.25s ease; cursor: pointer;
    animation: cd-border-glow 4s ease-in-out infinite;
  }
  .cd-btn-secondary:hover { background: rgba(92,232,146,0.06); border-color: rgba(92,232,146,0.2); box-shadow: 0 0 20px rgba(92,232,146,0.06); }
  .cd-btn-secondary:active { transform: scale(0.97); }
  .cd-btn-premium {
    position: relative; overflow: hidden; border-radius: 14px;
    background: linear-gradient(135deg, rgba(212,168,83,0.10) 0%, rgba(180,140,60,0.04) 50%, rgba(212,168,83,0.10) 100%);
    border: 1px solid rgba(212,168,83,0.3);
    box-shadow: 0 0 30px rgba(212,168,83,0.08), inset 0 1px 0 rgba(255,215,0,0.08);
    transition: all 0.25s ease; cursor: pointer;
  }
  .cd-btn-premium:hover {
    transform: translateY(-1px);
    box-shadow: 0 0 40px rgba(212,168,83,0.15), inset 0 1px 0 rgba(255,215,0,0.12);
    border-color: rgba(212,168,83,0.45);
  }
  .cd-btn-premium:active { transform: scale(0.97); }
  .cd-btn-premium::after {
    content: '';
    position: absolute; top: 0; left: -100%; width: 60%; height: 100%;
    background: linear-gradient(90deg, transparent, rgba(255,215,0,0.12), transparent);
    animation: cd-shine 3.5s ease-in-out infinite;
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
  const [lang, setLangState] = useState(getLang());
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
                <Text style={[styles.quotaText, quotaIsPremium && styles.quotaTextPremium]}>
                  {quotaText}
                </Text>
              </TouchableOpacity>
            ) : null}
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
                  <div className="cd-btn-secondary" onClick={() => router.push('/plants')} style={{ padding: '10px 12px', textAlign: 'center', flex: 1 } as any}>
                    <Text style={styles.navBtnText}>{t('home.plants')}</Text>
                  </div>
                  <div className="cd-btn-secondary" onClick={() => router.push('/history')} style={{ padding: '10px 12px', textAlign: 'center', flex: 1 } as any}>
                    <Text style={styles.navBtnText}>{t('home.history')}</Text>
                  </div>
                  <div className="cd-btn-secondary" onClick={() => router.push('/library')} style={{ padding: '10px 12px', textAlign: 'center', flex: 1 } as any}>
                    <Text style={styles.navBtnText}>{t('home.library')}</Text>
                  </div>
                </>
              ) : (
                <>
                  <TouchableOpacity style={[styles.navBtn, { flex: 1 }]} onPress={() => router.push('/plants')} activeOpacity={0.7}>
                    <Text style={styles.navBtnText}>{t('home.plants')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.navBtn, { flex: 1 }]} onPress={() => router.push('/history')} activeOpacity={0.7}>
                    <Text style={styles.navBtnText}>{t('home.history')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.navBtn, { flex: 1 }]} onPress={() => router.push('/library')} activeOpacity={0.7}>
                    <Text style={styles.navBtnText}>{t('home.library')}</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
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
                  <Text style={styles.installBtnText}>{t('home.install')}</Text>
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
                  <Text style={styles.installBtnText}>{t('home.downloadAndroid')}</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity onPress={() => setShowInstallBanner(false)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Text style={styles.installDismiss}>{t('home.notNow')}</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Premium upgrade link — always visible for non-premium */}
          {!quotaIsPremium && (
            isWeb ? (
              <div
                className="cd-btn-premium"
                onClick={() => router.push('/paywall')}
                style={{ padding: '12px 16px', textAlign: 'center', marginTop: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' } as any}
              >
                <View style={styles.premiumRow}>
                  <Text style={styles.premiumIcon}>◆</Text>
                  <Text style={styles.premiumBtnText}>{t('home.unlockPremium')}</Text>
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
                  <Text style={styles.premiumBtnText}>{t('home.unlockPremium')}</Text>
                  <Text style={styles.premiumArrow}>→</Text>
                </View>
              </TouchableOpacity>
            )
          )}

          {/* Legal footer */}
          <View style={styles.legalFooter}>
            <Text style={styles.legalText}>
              {t('home.internetRequired')}
            </Text>
          </View>
          <View style={styles.legalFooter}>
            <TouchableOpacity onPress={async () => {
              const newLang = getLang() === 'de' ? 'en' : 'de';
              await setLang(newLang);
            }}>
              <Text style={styles.legalLink}>{t('lang.switch')}</Text>
            </TouchableOpacity>
            <Text style={styles.legalDot}>·</Text>
            <TouchableOpacity onPress={() => router.push('/privacy')}>
              <Text style={styles.legalLink}>{t('home.privacy')}</Text>
            </TouchableOpacity>
            <Text style={styles.legalDot}>·</Text>
            <TouchableOpacity onPress={() => router.push('/terms')}>
              <Text style={styles.legalLink}>{t('home.terms')}</Text>
            </TouchableOpacity>
            <Text style={styles.legalDot}>·</Text>
            <TouchableOpacity onPress={() => router.push('/impressum')}>
              <Text style={styles.legalLink}>{t('home.impressum')}</Text>
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
            <Text style={styles.modalTitle}>{t('modal.howTitle')}</Text>
            <Text style={styles.modalText}>
              {t('modal.howText')}
            </Text>
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
    fontSize: 13,
    fontWeight: '600',
    color: colors.textMuted,
    letterSpacing: 5,
    textTransform: 'uppercase',
    marginBottom: 28,
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
    paddingVertical: 11,
    alignItems: 'center',
    backgroundColor: 'rgba(15,23,19,0.5)',
    borderWidth: 1,
    borderColor: 'rgba(92,232,146,0.06)',
  },
  navBtnText: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '500',
    letterSpacing: 0.3,
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
