import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Platform,
  TouchableOpacity,
  Animated,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
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

const isWeb = Platform.OS === 'web';
const sectionSpacing = isWeb ? 48 : 32;

export default function HomeScreen() {
  const router = useRouter();
  const { reset } = useDiagnosis();
  const [_lang, setLangState] = useState(getLang());
  useEffect(() => {
    const unsub = onLangChange((l) => setLangState(l));
    return unsub;
  }, []);
  const [quotaText, setQuotaText] = useState('');
  const [quotaIsPremium, setQuotaIsPremium] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [leafSlider, setLeafSlider] = useState(0.025);
  const [leafInteracted, setLeafInteracted] = useState(false);
  const leafContainerRef = useRef<HTMLDivElement | null>(null);
  const leafDragging = useRef(false);

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const handleMove = (e: MouseEvent | TouchEvent) => {
      if (!leafDragging.current || !leafContainerRef.current) return;
      e.preventDefault();
      const rect = leafContainerRef.current.getBoundingClientRect();
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
      const pct = Math.max(0, Math.min(1, (clientY - rect.top) / rect.height));
      setLeafSlider(pct);
    };
    const handleUp = () => { leafDragging.current = false; };
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    window.addEventListener('touchmove', handleMove, { passive: false });
    window.addEventListener('touchend', handleUp);
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
      window.removeEventListener('touchmove', handleMove);
      window.removeEventListener('touchend', handleUp);
    };
  }, []);

  // Landing page: override 480px phone-frame on desktop
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;
    const style = document.createElement('style');
    style.id = 'cd-landing-fullwidth';
    style.textContent = `
      @media (min-width: 768px) {
        #root {
          max-width: 100% !important;
          margin: 0 !important;
          min-height: 100vh !important;
          border-radius: 0 !important;
          box-shadow: none !important;
        }
        body { background: #080C0A !important; }
        .cd-sample-grid { grid-template-columns: auto 110px; gap: 24px !important; justify-content: center; }
        .cd-sample-leaf { aspect-ratio: 5/7; transform: translateY(16px) rotate(4deg); border-radius: 8px !important; }
      }
      @media (max-width: 767px) {
        .cd-sample-grid { grid-template-columns: 1fr; }
        .cd-sample-leaf { aspect-ratio: auto; max-width: 160px; margin: 0 auto; }
        .cd-sample-leaf img { object-fit: contain !important; }
      }
    `;
    document.head.appendChild(style);
    return () => { style.remove(); };
  }, []);

  useEffect(() => {
    injectCSS();
    trackEvent('page_home');

    let cleanupInstallPrompt: (() => void) | undefined;

    // PWA install prompt (Android Chrome)
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const handler = (e: any) => {
        e.preventDefault();
        setInstallPrompt(e);
        if (!window.matchMedia('(display-mode: standalone)').matches) {
          setShowInstallBanner(true);
        }
      };
      window.addEventListener('beforeinstallprompt', handler);
      cleanupInstallPrompt = () => window.removeEventListener('beforeinstallprompt', handler);
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
      const isAndroid = /android/i.test(navigator.userAgent);
      if (isAndroid && !isStandalone) {
        setShowInstallBanner(true);
      }
    }

    // Check for Stripe payment success redirect — verify with server
    if (
      Platform.OS === 'web' &&
      typeof window !== 'undefined' &&
      window.location.search.includes('session_id=')
    ) {
      const params = new URLSearchParams(window.location.search);
      const sessionId = params.get('session_id');
      if (sessionId) {
        fetch(`/api/verify-session?session_id=${encodeURIComponent(sessionId)}`)
          .then((r) => (r.ok ? r.json() : Promise.reject()))
          .then((data) => {
            if (data.token) {
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
    // Check onboarding (skip on web — landing page IS the introduction)
    if (Platform.OS !== 'web') {
      hasCompletedOnboarding()
        .then((done) => {
          if (!done) router.replace('/onboarding');
        })
        .catch(() => {});
    }
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

  // Re-check quota every time the screen gets focus
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

  const faqItems = [
    { q: t('landing.faq1Q'), a: t('landing.faq1A') },
    { q: t('landing.faq2Q'), a: t('landing.faq2A') },
    { q: t('landing.faq3Q'), a: t('landing.faq3A') },
    { q: t('landing.faq4Q'), a: t('landing.faq4A') },
  ];

  return (
    <View style={styles.screenBg}>
      {isWeb && <div className="cd-screen" style={{ position: 'absolute', inset: 0 } as any} />}
      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* ===== SECTION 1: Hero ===== */}
          <View style={styles.heroSection}>
            {Platform.OS === 'web' && <View style={styles.logoGlow} />}
            {Platform.OS === 'web' && <View style={styles.logoGlowWarm} />}
            {Platform.OS === 'web' && <View style={styles.orbitDot} />}

            {/* Logo */}
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

            {/* Primary CTA */}
            {isWeb ? (
              <div
                className="cd-btn-primary"
                onClick={startDiagnosis}
                style={{ padding: '18px 24px', textAlign: 'center', width: '100%', maxWidth: 400 } as any}
              >
                <Text style={styles.primaryBtnText}>{t('landing.heroCta')}</Text>
              </div>
            ) : (
              <TouchableOpacity onPress={startDiagnosis} activeOpacity={0.85} style={styles.ctaFullWidth}>
                <LinearGradient
                  colors={['#6AF09E', '#5CE892', '#44C878']}
                  start={{ x: 0.5, y: 0 }}
                  end={{ x: 0.5, y: 1 }}
                  style={styles.nativePrimaryBtn}
                >
                  <Text style={styles.primaryBtnText}>{t('landing.heroCta')}</Text>
                </LinearGradient>
              </TouchableOpacity>
            )}

            {/* Quota badge */}
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

          {/* ===== SECTION 2: Trust Bar ===== */}
          <View style={[styles.trustBar, { marginTop: sectionSpacing }]}>
            <View style={styles.trustItem}>
              <Ionicons name="leaf" size={14} color={colors.accentMoss} />
              <Text style={styles.trustText}>{t('landing.trustDiagnoses')}</Text>
            </View>
            <View style={styles.trustDivider} />
            <View style={styles.trustItem}>
              <Ionicons name="checkmark-circle" size={14} color={colors.accentMoss} />
              <Text style={styles.trustText}>{t('landing.trustPlan')}</Text>
            </View>
            <View style={styles.trustDivider} />
            <View style={styles.trustItem}>
              <Ionicons name="book" size={14} color={colors.accentMoss} />
              <Text style={styles.trustText}>{t('landing.trustLibrary')}</Text>
            </View>
          </View>

          {/* ===== SECTION 3: How It Works ===== */}
          <View style={[styles.section, { marginTop: sectionSpacing }]}>
            <View style={styles.sectionHeadingRow}>
              <View style={styles.sectionAccentBar} />
              <Text style={styles.sectionHeading}>{t('landing.howTitle')}</Text>
            </View>
            <View style={styles.stepsContainer}>
              {/* Step 1 */}
              <View style={styles.stepItem}>
                <View style={styles.stepIconCircle}>
                  <Ionicons name="camera-outline" size={22} color={colors.accent} />
                </View>
                <Text style={styles.stepTitle}>{t('landing.step1Title')}</Text>
                <Text style={styles.stepDesc}>{t('landing.step1Desc')}</Text>
              </View>
              <View style={styles.stepConnector} />
              {/* Step 2 */}
              <View style={styles.stepItem}>
                <View style={styles.stepIconCircle}>
                  <Ionicons name="chatbubble-outline" size={22} color={colors.accent} />
                </View>
                <Text style={styles.stepTitle}>{t('landing.step2Title')}</Text>
                <Text style={styles.stepDesc}>{t('landing.step2Desc')}</Text>
              </View>
              <View style={styles.stepConnector} />
              {/* Step 3 */}
              <View style={styles.stepItem}>
                <View style={styles.stepIconCircle}>
                  <Ionicons name="checkmark-done-outline" size={22} color={colors.accent} />
                </View>
                <Text style={styles.stepTitle}>{t('landing.step3Title')}</Text>
                <Text style={styles.stepDesc}>{t('landing.step3Desc')}</Text>
              </View>
            </View>
          </View>

          {/* ===== SECTION 4: Sample Result Preview (web only) ===== */}
          {Platform.OS === 'web' && (
            <View style={[styles.section, { marginTop: sectionSpacing }]}>
              <View style={styles.sectionHeadingRow}>
                <View style={styles.sectionAccentBar} />
                <Text style={styles.sectionHeading}>{t('landing.sampleTitle')}</Text>
              </View>
              <View style={[styles.sampleCard]}>
                <div className="cd-sample-grid" style={{
                  display: 'grid',
                  gap: 16,
                  alignItems: 'center',
                } as any}>
                  {/* Diagnosis content — LEFT on desktop, FIRST on mobile */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 0 } as any}>
                    <View style={styles.sampleHeader}>
                      <View style={styles.sampleIconWrap}>
                        <Ionicons name="alert-circle" size={20} color={colors.severityMedium} />
                      </View>
                      <View style={styles.sampleHeaderText}>
                        <Text style={styles.sampleDiagName}>{t('landing.sampleDiagnosis')}</Text>
                        <Text style={styles.sampleDiagType}>{t('landing.sampleCategory')}</Text>
                      </View>
                    </View>
                    <View style={styles.sampleMetaRow}>
                      <View style={styles.sampleMetaItem}>
                        <Text style={styles.sampleMetaLabel}>{t('landing.sampleSeverity')}</Text>
                        <View style={styles.sampleSeverityBadge}>
                          <Text style={styles.sampleSeverityText}>{t('landing.sampleSeverityVal')}</Text>
                        </View>
                      </View>
                      <View style={styles.sampleMetaItem}>
                        <Text style={styles.sampleMetaLabel}>{t('landing.sampleConfidence')}</Text>
                        <Text style={styles.sampleConfidence}>78<Text style={{ fontSize: 16, opacity: 0.7 }}>%</Text></Text>
                      </View>
                    </View>
                    <View style={styles.sampleActions}>
                      <View style={styles.sampleActionItem}>
                        <Ionicons name="checkmark-circle-outline" size={14} color={colors.accent} />
                        <Text style={styles.sampleActionText}>{t('landing.sampleAction1')}</Text>
                      </View>
                      <View style={styles.sampleActionItem}>
                        <Ionicons name="checkmark-circle-outline" size={14} color={colors.accent} />
                        <Text style={styles.sampleActionText}>{t('landing.sampleAction2')}</Text>
                      </View>
                      <View style={styles.sampleActionItem}>
                        <Ionicons name="checkmark-circle-outline" size={14} color={colors.accent} />
                        <Text style={styles.sampleActionText}>{t('landing.sampleAction3')}</Text>
                      </View>
                    </View>
                  </div>
                  {/* Leaf before/after slider — RIGHT on desktop, SECOND on mobile */}
                  <div
                    ref={(el: any) => { leafContainerRef.current = el; }}
                    className="cd-sample-leaf"
                    style={{
                      borderRadius: 14,
                      overflow: 'hidden',
                      position: 'relative',
                      background: '#000',
                      boxShadow: '0 4px 20px rgba(0,0,0,0.3), inset 0 0 0 1px rgba(92,232,146,0.12)',
                      cursor: 'ns-resize',
                      userSelect: 'none',
                      WebkitUserSelect: 'none',
                      touchAction: 'none',
                      width: '100%',
                    } as any}
                    onMouseDown={(e: any) => { e.preventDefault(); leafDragging.current = true; setLeafInteracted(true); }}
                    onTouchStart={(e: any) => { e.preventDefault(); leafDragging.current = true; setLeafInteracted(true); }}
                  >
                    {/* Base: sick/yellow leaf */}
                    <img
                      src="/images/sample-nitrogen.webp"
                      alt="Stickstoffmangel - gelbes Cannabis-Blatt"
                      draggable={false}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        display: 'block',
                        pointerEvents: 'none',
                      } as any}
                    />
                    {/* Overlay: healthy/green leaf, clipped from top */}
                    <img
                      src="/images/sample-nitrogen.webp"
                      alt="Gesundes Cannabis-Blatt"
                      draggable={false}
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        filter: 'hue-rotate(45deg) saturate(1.3) brightness(0.82)',
                        clipPath: `inset(0 0 ${(1 - leafSlider) * 100}% 0)`,
                        pointerEvents: 'none',
                      } as any}
                    />
                    {/* Hint: light sweep inviting downward drag */}
                    {!leafInteracted && (
                      <div className="cd-leaf-hint" style={{
                        position: 'absolute',
                        top: '-10%',
                        left: 0,
                        right: 0,
                        height: 80,
                        background: 'linear-gradient(to bottom, transparent 0%, rgba(92,232,146,0.04) 20%, rgba(150,255,190,0.15) 45%, rgba(255,255,255,0.22) 50%, rgba(150,255,190,0.15) 55%, rgba(92,232,146,0.04) 80%, transparent 100%)',
                        pointerEvents: 'none',
                        filter: 'blur(2px)',
                      } as any} />
                    )}
                    {/* Soft glow at transition seam */}
                    <div className="cd-scan-beam" style={{
                      position: 'absolute',
                      top: `${leafSlider * 100}%`,
                      left: 0,
                      right: 0,
                      height: 120,
                      transform: 'translateY(-50%)',
                      background: 'radial-gradient(ellipse 100% 50% at 50% 50%, rgba(92,232,146,0.22) 0%, rgba(150,255,190,0.08) 40%, transparent 70%)',
                      filter: 'blur(10px)',
                      pointerEvents: 'none',
                      opacity: leafSlider > 0.01 ? 1 : 0,
                    } as any}>
                      {/* Subtle shimmer streak */}
                      <div className="cd-beam-shimmer" style={{
                        position: 'absolute',
                        top: '30%',
                        height: '40%',
                        width: '18%',
                        background: 'radial-gradient(ellipse at center, rgba(255,255,255,0.15) 0%, transparent 70%)',
                        filter: 'blur(8px)',
                        pointerEvents: 'none',
                      } as any} />
                      {/* Soft glow dots */}
                      <div className="cd-beam-glow-1" style={{
                        position: 'absolute',
                        top: '40%',
                        width: 10,
                        height: 10,
                        borderRadius: '50%',
                        background: 'radial-gradient(circle, rgba(255,255,255,0.5) 0%, transparent 70%)',
                        filter: 'blur(3px)',
                        pointerEvents: 'none',
                      } as any} />
                      <div className="cd-beam-glow-2" style={{
                        position: 'absolute',
                        top: '50%',
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        background: 'radial-gradient(circle, rgba(255,255,255,0.4) 0%, transparent 70%)',
                        filter: 'blur(3px)',
                        pointerEvents: 'none',
                      } as any} />
                    </div>
                    {/* Payoff text when fully revealed */}
                    <div style={{
                      position: 'absolute',
                      bottom: 8,
                      left: 0,
                      right: 0,
                      textAlign: 'center',
                      pointerEvents: 'none',
                      opacity: leafSlider > 0.85 ? Math.min(1, (leafSlider - 0.85) / 0.1) : 0,
                      transition: 'opacity 0.3s ease',
                    } as any}>
                      <span style={{
                        fontSize: 10,
                        fontWeight: '600',
                        color: 'rgba(220,255,235,0.95)',
                        letterSpacing: 1.2,
                        textTransform: 'uppercase',
                        textShadow: '0 0 8px rgba(0,0,0,0.8), 0 0 20px rgba(0,0,0,0.5), 0 0 30px rgba(92,232,146,0.2)',
                      } as any}>{t('landing.step3Title') || 'Diagnose in 30 Sekunden'}</span>
                    </div>
                  </div>
                </div>
                <View style={styles.sampleFade}>
                  <Text style={styles.sampleFadeText}>{t('landing.heroCta')}</Text>
                </View>
              </View>
            </View>
          )}

          {/* ===== SECTION 5: Why LeafScan (web only) ===== */}
          {Platform.OS === 'web' && (
            <View style={[styles.section, { marginTop: sectionSpacing }]}>
              <View style={styles.sectionHeadingRow}>
                <View style={styles.sectionAccentBar} />
                <Text style={styles.sectionHeading}>{t('landing.whyTitle')}</Text>
              </View>
              <View style={styles.benefitsRow}>
                <View style={styles.benefitCard}>
                  <View style={styles.benefitIconWrap}>
                    <Ionicons name="flash-outline" size={24} color={colors.accent} />
                  </View>
                  <Text style={styles.benefitTitle}>{t('landing.benefit1Title')}</Text>
                  <Text style={styles.benefitDesc}>{t('landing.benefit1Desc')}</Text>
                </View>
                <View style={styles.benefitCard}>
                  <View style={styles.benefitIconWrap}>
                    <Ionicons name="list-outline" size={24} color={colors.accent} />
                  </View>
                  <Text style={styles.benefitTitle}>{t('landing.benefit2Title')}</Text>
                  <Text style={styles.benefitDesc}>{t('landing.benefit2Desc')}</Text>
                </View>
                <View style={styles.benefitCard}>
                  <View style={styles.benefitIconWrap}>
                    <Ionicons name="trending-up-outline" size={24} color={colors.accent} />
                  </View>
                  <Text style={styles.benefitTitle}>{t('landing.benefit3Title')}</Text>
                  <Text style={styles.benefitDesc}>{t('landing.benefit3Desc')}</Text>
                </View>
              </View>
            </View>
          )}

          {/* ===== SECTION 6: Premium Teaser ===== */}
          {!quotaIsPremium && (
            <View style={[styles.section, { marginTop: sectionSpacing }]}>
              {isWeb ? (
                <View style={styles.premiumCard}>
                  <Text style={styles.premiumCardTitle}>{t('landing.premiumTitle')}</Text>
                  <View style={styles.premiumFeatures}>
                    <View style={styles.premiumFeatureRow}>
                      <Text style={styles.premiumFeatureIcon}>◆</Text>
                      <Text style={styles.premiumFeatureText}>{t('landing.premiumFeature1')}</Text>
                    </View>
                    <View style={styles.premiumFeatureRow}>
                      <Text style={styles.premiumFeatureIcon}>◆</Text>
                      <Text style={styles.premiumFeatureText}>{t('landing.premiumFeature2')}</Text>
                    </View>
                    <View style={styles.premiumFeatureRow}>
                      <Text style={styles.premiumFeatureIcon}>◆</Text>
                      <Text style={styles.premiumFeatureText}>{t('landing.premiumFeature3')}</Text>
                    </View>
                  </View>
                  <div
                    className="cd-btn-premium"
                    onClick={() => router.push('/paywall')}
                    style={
                      {
                        padding: '14px 20px',
                        textAlign: 'center',
                        marginTop: 16,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      } as any
                    }
                  >
                    <View style={styles.premiumCtaRow}>
                      <Text style={styles.premiumIcon}>◆</Text>
                      <Text style={styles.premiumBtnText}>{t('landing.premiumCta')}</Text>
                      <Text style={styles.premiumArrow}>→</Text>
                    </View>
                  </div>
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.premiumBtn}
                  onPress={() => router.push('/paywall')}
                  activeOpacity={0.7}
                >
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
                  <View style={styles.premiumCtaRow}>
                    <Text style={styles.premiumIcon}>◆</Text>
                    <Text style={styles.premiumBtnText}>{t('home.unlockPremium')}</Text>
                    <Text style={styles.premiumArrow}>→</Text>
                  </View>
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* ===== SECTION 7: FAQ (web only) ===== */}
          {Platform.OS === 'web' && (
            <View style={[styles.section, { marginTop: sectionSpacing }]}>
              <View style={styles.sectionHeadingRow}>
                <View style={styles.sectionAccentBar} />
                <Text style={styles.sectionHeading}>{t('landing.faqTitle')}</Text>
              </View>
              {faqItems.map((item, idx) => (
                <TouchableOpacity
                  key={idx}
                  style={styles.faqItem}
                  onPress={() => setOpenFaq(openFaq === idx ? null : idx)}
                  activeOpacity={0.7}
                >
                  <View style={styles.faqQuestionRow}>
                    <Text style={styles.faqQuestion}>{item.q}</Text>
                    <Ionicons
                      name={openFaq === idx ? 'chevron-up' : 'chevron-down'}
                      size={18}
                      color={colors.textSecondary}
                    />
                  </View>
                  {openFaq === idx && <Text style={styles.faqAnswer}>{item.a}</Text>}
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* ===== SECTION 8: Final Section ===== */}
          <View style={[styles.section, { marginTop: sectionSpacing }]}>
            {/* Nav buttons row */}
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

            {/* Install banner */}
            {isWeb && showInstallBanner && (
              <InstallBanner
                installPrompt={installPrompt}
                onInstallComplete={() => setShowInstallBanner(false)}
                onClearPrompt={() => setInstallPrompt(null)}
                onDismiss={() => setShowInstallBanner(false)}
              />
            )}

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
                <Text style={[styles.langOption, getLang() === 'de' && styles.langOptionActive]}>
                  DE
                </Text>
                <Text style={styles.langDividerText}>|</Text>
                <Text style={[styles.langOption, getLang() === 'en' && styles.langOptionActive]}>
                  EN
                </Text>
              </TouchableOpacity>
            </View>

            {/* Legal footer */}
            <LegalFooter onNavigate={(path) => router.push(path as any)} />
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screenBg: {
    flex: 1,
    backgroundColor: colors.background,
  },
  safeArea: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 40,
    ...Platform.select({
      web: { maxWidth: 1080, alignSelf: 'center' as const, width: '100%' as any },
      default: {},
    }),
  },

  // ── Hero ──────────────────────────────────────────────
  heroSection: {
    alignItems: 'center',
    paddingTop: isWeb ? 80 : 32,
    paddingBottom: 16,
  },
  heroHeadline: {
    fontSize: 26,
    fontWeight: '600',
    color: colors.textHero,
    textAlign: 'center',
    letterSpacing: 0.3,
    lineHeight: 32,
    marginBottom: 32,
  },
  logoGlow: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: 'rgba(92,232,146,0.07)',
    top: '15%',
    ...Platform.select({
      web: {
        filter: 'blur(100px)',
        animation: 'cd-bg-breathe 6s ease-in-out infinite',
      },
      default: {},
    }),
  },
  logoGlowWarm: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(212,168,83,0.05)',
    top: '25%',
    left: '60%',
    ...Platform.select({
      web: {
        filter: 'blur(80px)',
        animation: 'cd-bg-breathe 8s ease-in-out infinite 3s',
      },
      default: {},
    }),
  },
  orbitDot: {
    position: 'absolute',
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(92,232,146,0.4)',
    top: '35%',
    ...Platform.select({
      web: {
        animation: 'cd-glow-orbit 12s linear infinite',
        boxShadow: '0 0 12px rgba(92,232,146,0.4)',
      },
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
      web: {
        textShadow: '0 0 40px rgba(92,232,146,0.3), 0 0 80px rgba(92,232,146,0.1)',
      },
      default: {},
    }),
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
  tagline: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textMuted,
    letterSpacing: 6,
    textTransform: 'uppercase',
    marginBottom: 28,
  },
  ctaFullWidth: {
    width: '100%',
  },
  nativePrimaryBtn: {
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#5CE892',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.3,
        shadowRadius: 16,
      },
      android: { elevation: 8 },
    }),
  },
  primaryBtnText: {
    color: colors.textOnAccent,
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  quotaBadge: {
    marginTop: 16,
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

  // ── Trust Bar ─────────────────────────────────────────
  trustBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 0,
  },
  trustItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
  },
  trustText: {
    fontSize: 12.5,
    color: colors.accentMoss,
    fontWeight: '500',
    letterSpacing: 0.4,
  },
  trustDivider: {
    width: 1,
    height: 14,
    backgroundColor: 'rgba(139,168,143,0.25)',
  },

  // ── Section Shared ────────────────────────────────────
  section: {
    width: '100%',
  },
  sectionHeadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 20,
  },
  sectionAccentBar: {
    width: 3,
    height: 20,
    backgroundColor: colors.accentForest,
    borderRadius: 2,
  },
  sectionHeading: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.textHero,
    letterSpacing: 0.5,
  },

  // ── How It Works Steps ────────────────────────────────
  stepsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  stepItem: {
    alignItems: 'center',
    flex: 1,
  },
  stepIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.accentForest,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  stepTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textHero,
    letterSpacing: 0.3,
    marginBottom: 6,
    textAlign: 'center',
  },
  stepDesc: {
    fontSize: 12.5,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 4,
  },
  stepConnector: {
    width: 24,
    height: 1,
    backgroundColor: 'rgba(92,232,146,0.15)',
    marginTop: 24,
  },

  // ── Sample Result (web only) ──────────────────────────
  sampleCard: {
    backgroundColor: colors.cardDark,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    padding: 24,
    overflow: 'hidden',
    position: 'relative',
  },
  sampleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  sampleIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(212,168,83,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sampleHeaderText: {
    flex: 1,
  },
  sampleDiagName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textHero,
    letterSpacing: 0.3,
  },
  sampleDiagType: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  sampleMetaRow: {
    flexDirection: 'row',
    gap: 20,
    marginBottom: 16,
  },
  sampleMetaItem: {
    gap: 4,
  },
  sampleMetaLabel: {
    fontSize: 10,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    fontWeight: '500',
  },
  sampleSeverityBadge: {
    backgroundColor: 'rgba(212,168,83,0.12)',
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  sampleSeverityText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.severityMedium,
  },
  sampleConfidence: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.accent,
  },
  sampleActions: {
    gap: 8,
    marginBottom: 32,
  },
  sampleActionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sampleActionText: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  sampleFade: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 60,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 12,
    ...Platform.select({
      web: {
        background: `linear-gradient(transparent, ${colors.cardDark})`,
      },
      default: {
        backgroundColor: colors.cardDark,
      },
    }),
  },
  sampleFadeText: {
    fontSize: 12,
    color: colors.accent,
    fontWeight: '600',
    letterSpacing: 0.3,
  },

  // ── Why LeafScan Benefits (web only) ──────────────────
  benefitsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  benefitCard: {
    flex: 1,
    backgroundColor: colors.cardDark,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
  },
  benefitIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(92,232,146,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  benefitTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textHero,
    marginBottom: 8,
    textAlign: 'center',
  },
  benefitDesc: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },

  // ── Premium Teaser ────────────────────────────────────
  premiumCard: {
    backgroundColor: colors.cardDark,
    borderWidth: 1,
    borderColor: 'rgba(218,165,32,0.35)',
    borderRadius: 16,
    padding: 24,
  },
  premiumCardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textHero,
    marginBottom: 16,
  },
  premiumFeatures: {
    gap: 10,
  },
  premiumFeatureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  premiumFeatureIcon: {
    fontSize: 10,
    color: '#DAA520',
  },
  premiumFeatureText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  premiumBtn: {
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: 'rgba(218,165,32,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(218,165,32,0.35)',
    overflow: 'hidden',
  },
  premiumShimmer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 120,
  },
  premiumCtaRow: {
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

  // ── FAQ (web only) ────────────────────────────────────
  faqItem: {
    backgroundColor: colors.cardDark,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
  },
  faqQuestionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  faqQuestion: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textHero,
    flex: 1,
    marginRight: 12,
  },
  faqAnswer: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 20,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },

  // ── Final Section: Nav / Footer ───────────────────────
  navRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
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
  langToggleWrap: {
    alignItems: 'center',
    marginBottom: 12,
    marginTop: 8,
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
  langDividerText: {
    fontSize: 13,
    color: 'rgba(92,232,146,0.2)',
    fontWeight: '300',
  },
});
