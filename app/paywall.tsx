import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  Linking,
  TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../constants/colors';
import {
  getOfferings,
  purchasePackage,
  restorePurchases,
  SubscriptionPackage,
} from '../services/purchases';
import { setPremium, setSessionToken, SERVER_URL } from '../services/quota';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { trackEvent } from '../services/analytics';
import { t } from '../services/i18n';

interface Feature {
  icon: string;
  text: string;
  pro?: boolean;
}

const freeFeatures: Feature[] = [
  { icon: 'camera-outline', text: t('paywall.free1') },
  { icon: 'leaf-outline', text: t('paywall.free2') },
  { icon: 'book-outline', text: t('paywall.free3') },
];

const growerFeatures: Feature[] = [
  { icon: 'camera-outline', text: t('paywall.grower1') },
  { icon: 'leaf-outline', text: t('paywall.grower2') },
  { icon: 'document-text-outline', text: t('paywall.grower3') },
];

const proFeatures: Feature[] = [
  { icon: 'infinite-outline', text: t('paywall.pro1') },
  { icon: 'leaf-outline', text: t('paywall.pro2') },
  { icon: 'document-text-outline', text: t('paywall.pro3') },
  { icon: 'flash-outline', text: t('paywall.pro4'), pro: true },
  { icon: 'trending-up-outline', text: t('paywall.pro5'), pro: true },
];

// ── Stripe Web Checkout ──

interface StripePlan {
  id: string;
  priceId: string;
  name: string;
  description: string;
  price: string;
  interval: string;
}

const STRIPE_API_BASE = Platform.OS === 'web'
  ? ''  // relative URLs work on PWA
  : (process.env.EXPO_PUBLIC_API_PROXY_URL || 'https://leafscan.de');

async function getStripePlans(): Promise<StripePlan[]> {
  try {
    const res = await fetch(`${STRIPE_API_BASE}/api/stripe/products`);
    const data = await res.json();
    return data.plans || [];
  } catch {
    return [];
  }
}

async function startStripeCheckout(priceId: string): Promise<string | null> {
  try {
    const body: any = { priceId };
    // Tell server to use deep-link redirect for native apps
    if (Platform.OS !== 'web') {
      body.successUrl = 'leafscan://payment-success?session_id={CHECKOUT_SESSION_ID}';
      body.cancelUrl = 'leafscan://payment-cancel';
    }
    const res = await fetch(`${STRIPE_API_BASE}/api/stripe/checkout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    return data.url || null;
  } catch {
    return null;
  }
}

const IS_GOOGLE_PLAY = process.env.EXPO_PUBLIC_STORE === 'google-play';

export default function PaywallScreen() {
  const router = useRouter();
  const isWeb = Platform.OS === 'web';
  const useRevenueCat = !isWeb && IS_GOOGLE_PLAY;
  trackEvent('paywall_view');

  // Native state
  const [packages, setPackages] = useState<SubscriptionPackage[]>([]);
  // Web state
  const [stripePlans, setStripePlans] = useState<StripePlan[]>([]);

  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [restoring, setRestoring] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [promoCode, setPromoCode] = useState('');
  const [promoLoading, setPromoLoading] = useState(false);
  const [promoMessage, setPromoMessage] = useState('');
  const [promoSuccess, setPromoSuccess] = useState(false);

  useEffect(() => {
    if (isWeb) {
      // Check for Stripe payment success — verify with server
      if (typeof window !== 'undefined' && window.location.search.includes('session_id=')) {
        const params = new URLSearchParams(window.location.search);
        const sessionId = params.get('session_id');
        if (sessionId) {
          fetch(`/api/verify-session?session_id=${encodeURIComponent(sessionId)}`)
            .then(r => r.ok ? r.json() : Promise.reject())
            .then(data => {
              if (data.token) {
                setSessionToken(data.token);
                setPremium(true);
                setPaymentSuccess(true);
                trackEvent('purchase_complete', { source: 'stripe' });
              }
            })
            .catch(() => {})
            .finally(() => {
              window.history.replaceState({}, '', '/');
            });
        }
      }
      // Load Stripe plans for web
      getStripePlans().then((plans) => {
        setStripePlans(plans);
        setLoading(false);
      }).catch(() => setLoading(false));
    } else if (useRevenueCat) {
      // AAB (Google Play): use RevenueCat
      getOfferings().then((pkgs) => {
        setPackages(pkgs);
        setLoading(false);
      }).catch(() => setLoading(false));
    } else {
      // APK (direct download): use Stripe
      getStripePlans().then((plans) => {
        setStripePlans(plans);
        setLoading(false);
      }).catch(() => setLoading(false));
    }
  }, []);

  const handlePurchase = async () => {
    setPurchasing(true);

    if (useRevenueCat) {
      // AAB (Google Play): RevenueCat
      if (packages.length === 0) { setPurchasing(false); return; }
      const result = await purchasePackage(packages[selectedIdx]);
      setPurchasing(false);

      if (result.success) {
        trackEvent('purchase_complete', { source: 'google_play' });
        Alert.alert(t('paywall.welcome'), t('paywall.welcomeMsg'), [
          { text: t('paywall.great'), onPress: () => router.back() },
        ]);
      } else if (result.error) {
        Alert.alert(t('paywall.note'), result.error);
      }
    } else {
      // Web/PWA + APK (direct download): Stripe Checkout
      const plan = stripePlans[selectedIdx];
      if (!plan?.priceId) {
        setPurchasing(false);
        Alert.alert(t('results.error'), t('paywall.productUnavailable'));
        return;
      }
      const url = await startStripeCheckout(plan.priceId);
      setPurchasing(false);
      if (url) {
        if (isWeb) {
          window.location.href = url;
        } else {
          Linking.openURL(url);
        }
      } else {
        Alert.alert(t('results.error'), t('paywall.checkoutFailed'));
      }
    }
  };

  const getDeviceId = async (): Promise<string> => {
    try {
      let id = await AsyncStorage.getItem('leafscan_device_id');
      if (!id) {
        id = 'dev_' + Math.random().toString(36).slice(2) + Date.now().toString(36);
        await AsyncStorage.setItem('leafscan_device_id', id);
      }
      return id;
    } catch {
      return '';
    }
  };

  const handleRedeem = async () => {
    if (!promoCode.trim()) return;
    setPromoLoading(true);
    setPromoMessage('');
    try {
      const deviceId = await getDeviceId();
      const apiUrl = Platform.OS === 'web' ? '/api/redeem-code' : `${SERVER_URL}/api/redeem-code`;
      const res = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: promoCode.trim(), deviceId }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setPromoSuccess(true);
        setPromoMessage(data.message);
        setPremium(true);
      } else {
        setPromoMessage(data.message || t('paywall.codeInvalid'));
      }
    } catch {
      setPromoMessage(t('paywall.redeemError'));
    }
    setPromoLoading(false);
  };

  const handleRestore = async () => {
    setRestoring(true);
    const result = await restorePurchases();
    setRestoring(false);

    if (result.isPremium) {
      Alert.alert(t('paywall.restored'), t('paywall.restoredMsg'), [
        { text: t('paywall.great'), onPress: () => router.back() },
      ]);
    } else if (result.success) {
      Alert.alert(t('paywall.noSubscription'), t('paywall.noSubscriptionMsg'));
    } else {
      Alert.alert(t('results.error'), t('paywall.restoreError'));
    }
  };

  // Google Play AAB uses RevenueCat packages, everything else uses Stripe plans
  const displayPlans = useRevenueCat
    ? packages.map(p => ({ title: p.title, priceString: p.priceString }))
    : stripePlans.map(p => ({ title: p.name, priceString: p.price }));

  const selectedPlan = displayPlans[selectedIdx];
  const features = selectedIdx === 0 ? growerFeatures : proFeatures;

  if (paymentSuccess) {
    return (
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <View style={styles.successContainer}>
          <View style={styles.successIcon}>
            <Ionicons name="checkmark-circle" size={64} color={colors.accent} />
          </View>
          <Text style={styles.successTitle}>{t('paywall.premiumActivated')}</Text>
          <Text style={styles.successText}>
            {t('paywall.enjoyDiagnoses')}
          </Text>
          <TouchableOpacity
            style={styles.purchaseBtn}
            onPress={() => router.replace('/')}
          >
            <Text style={styles.purchaseBtnText}>{t('paywall.toHome')}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => {
            if (router.canGoBack()) {
              router.back();
            } else {
              router.replace('/');
            }
          }} style={styles.closeBtn}>
            <Ionicons name="close" size={24} color={colors.textMuted} />
          </TouchableOpacity>
          <View style={styles.crownCircle}>
            <Ionicons name="diamond-outline" size={36} color={colors.accentWarm} />
          </View>
          <Text style={styles.title}>{t('paywall.unlockPremium')}</Text>
          <Text style={styles.subtitle}>
            {t('paywall.subtitle')}
          </Text>
        </View>

        {/* Free tier info */}
        <View style={styles.freeCard}>
          <Text style={styles.freeTitle}>{t('paywall.freeIncluded')}</Text>
          {freeFeatures.map((f, i) => (
            <View key={i} style={styles.featureRow}>
              <Ionicons name={f.icon as any} size={16} color={colors.accent} />
              <Text style={styles.featureText}>{f.text}</Text>
            </View>
          ))}
        </View>

        {/* Package selector */}
        {loading ? (
          <ActivityIndicator size="large" color={colors.accent} style={{ marginVertical: 32 }} />
        ) : (
          <View style={styles.packagesRow}>
            {displayPlans.map((plan, i) => (
              <TouchableOpacity
                key={i}
                style={[styles.packageCard, i === selectedIdx && styles.packageCardSelected]}
                onPress={() => setSelectedIdx(i)}
                activeOpacity={0.8}
              >
                {i === 1 && <View style={styles.popularBadge}><Text style={styles.popularText}>{t('paywall.popular')}</Text></View>}
                <Text style={[styles.packageTitle, i === selectedIdx && styles.packageTitleSelected]}>
                  {plan.title}
                </Text>
                <Text style={[styles.packagePrice, i === selectedIdx && styles.packagePriceSelected]}>
                  {plan.priceString}
                </Text>
                <Text style={styles.packagePeriod}>{t('paywall.perMonth')}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Features for selected package */}
        {selectedPlan && (
          <View style={styles.featuresCard}>
            <Text style={styles.featuresTitle}>{t('paywall.includes', { plan: selectedPlan.title })}</Text>
            {features.map((f, i) => (
              <View key={i} style={styles.featureRow}>
                <Ionicons
                  name={f.icon as any}
                  size={16}
                  color={f.pro ? colors.accentWarm : colors.accent}
                />
                <Text style={[styles.featureText, f.pro && styles.featureTextPro]}>{f.text}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Purchase button */}
        <TouchableOpacity
          style={styles.purchaseBtn}
          onPress={handlePurchase}
          activeOpacity={0.85}
          disabled={purchasing || displayPlans.length === 0}
        >
          {purchasing ? (
            <ActivityIndicator color={colors.textOnAccent} />
          ) : (
            <Text style={styles.purchaseBtnText}>
              {selectedPlan ? t('paywall.purchaseBtn', { plan: selectedPlan.title, price: selectedPlan.priceString }) : t('paywall.loading')}
            </Text>
          )}
        </TouchableOpacity>

        {/* Promo code */}
        {!promoSuccess && (
          <View style={styles.promoCard}>
            <Text style={styles.promoTitle}>{t('paywall.redeemCode')}</Text>
            <View style={styles.promoRow}>
              <TextInput
                style={styles.promoInput}
                placeholder="z.B. HOMEGROW"
                placeholderTextColor={colors.textMuted}
                value={promoCode}
                onChangeText={setPromoCode}
                autoCapitalize="characters"
                autoCorrect={false}
              />
              <TouchableOpacity
                style={styles.promoBtn}
                onPress={handleRedeem}
                disabled={promoLoading || !promoCode.trim()}
                activeOpacity={0.7}
              >
                {promoLoading ? (
                  <ActivityIndicator size="small" color={colors.textOnAccent} />
                ) : (
                  <Text style={styles.promoBtnText}>{t('paywall.redeem')}</Text>
                )}
              </TouchableOpacity>
            </View>
            {promoMessage ? (
              <Text style={[styles.promoMessage, promoSuccess && styles.promoMessageSuccess]}>
                {promoMessage}
              </Text>
            ) : null}
          </View>
        )}

        {promoSuccess && (
          <View style={styles.promoSuccessCard}>
            <Text style={styles.promoSuccessText}>{t('paywall.premiumSuccess')}</Text>
            <TouchableOpacity style={styles.purchaseBtn} onPress={() => router.replace('/')}>
              <Text style={styles.purchaseBtnText}>{t('paywall.toHome')}</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Restore + Terms */}
        <View style={styles.footer}>
          {!isWeb && (
            <>
              <TouchableOpacity onPress={handleRestore} disabled={restoring}>
                <Text style={styles.footerLink}>
                  {restoring ? t('paywall.restoring') : t('paywall.restore')}
                </Text>
              </TouchableOpacity>
              <Text style={styles.footerDot}>·</Text>
            </>
          )}
          <TouchableOpacity onPress={() => router.push('/privacy')}>
            <Text style={styles.footerLink}>{t('home.privacy')}</Text>
          </TouchableOpacity>
          <Text style={styles.footerDot}>·</Text>
          <TouchableOpacity onPress={() => router.push('/terms')}>
            <Text style={styles.footerLink}>{t('home.terms')}</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.legalNote}>
          {isWeb
            ? t('paywall.legalWeb')
            : t('paywall.legalNative')
          }
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: 20, paddingBottom: 80 },

  header: { alignItems: 'center', marginBottom: 24 },
  closeBtn: {
    position: 'absolute',
    top: 12,
    right: 4,
    padding: 12,
    zIndex: 1,
  },
  crownCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.accentWarmGlow,
    borderWidth: 1,
    borderColor: colors.accentWarmSubtle,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textMuted,
  },

  // Success
  successContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  successIcon: {
    marginBottom: 24,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
  },
  successText: {
    fontSize: 15,
    color: colors.textSecondary,
    marginBottom: 32,
    textAlign: 'center',
  },

  // Free tier
  freeCard: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  freeTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textMuted,
    marginBottom: 10,
    letterSpacing: 0.3,
  },

  // Packages
  packagesRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  packageCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  packageCardSelected: {
    borderColor: colors.accent,
    backgroundColor: colors.accentGlow,
    ...Platform.select({
      web: { boxShadow: '0 0 20px rgba(74,222,128,0.15)' },
      ios: { shadowColor: colors.accent, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.2, shadowRadius: 12 },
      android: { elevation: 4 },
    }),
  },
  popularBadge: {
    position: 'absolute',
    top: -10,
    backgroundColor: colors.accentWarm,
    paddingHorizontal: 10,
    paddingVertical: 2,
    borderRadius: 10,
  },
  popularText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#000',
    letterSpacing: 0.5,
  },
  packageTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 4,
    marginTop: 4,
  },
  packageTitleSelected: { color: colors.text },
  packagePrice: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  packagePriceSelected: { color: colors.accent },
  packagePeriod: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },

  // Features
  featuresCard: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: colors.border,
  },
  featuresTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 6,
  },
  featureText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  featureTextPro: {
    color: colors.accentWarm,
    fontWeight: '500',
  },

  // Purchase button
  purchaseBtn: {
    backgroundColor: colors.accent,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 16,
    ...Platform.select({
      ios: { shadowColor: '#4ADE80', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 12 },
      android: { elevation: 6 },
    }),
  },
  purchaseBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textOnAccent,
  },

  // Footer
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  footerLink: {
    fontSize: 12,
    color: colors.textMuted,
    textDecorationLine: 'underline',
  },
  footerDot: {
    fontSize: 12,
    color: colors.textMuted,
  },
  legalNote: {
    fontSize: 10,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 15,
    paddingHorizontal: 8,
  },

  // Promo code
  promoCard: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.accentWarmSubtle,
  },
  promoTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.accentWarm,
    marginBottom: 10,
    letterSpacing: 0.3,
  },
  promoRow: {
    flexDirection: 'row',
    gap: 8,
  },
  promoInput: {
    flex: 1,
    backgroundColor: colors.background,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
    letterSpacing: 1,
    fontWeight: '600',
  },
  promoBtn: {
    backgroundColor: colors.accentWarm,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
    justifyContent: 'center',
  },
  promoBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#000',
  },
  promoMessage: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 8,
  },
  promoMessageSuccess: {
    color: colors.accent,
    fontWeight: '600',
  },
  promoSuccessCard: {
    backgroundColor: colors.accentGlow,
    borderRadius: 14,
    padding: 20,
    marginBottom: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.borderAccent,
  },
  promoSuccessText: {
    fontSize: 15,
    color: colors.accent,
    fontWeight: '600',
    marginBottom: 16,
    textAlign: 'center',
  },
});
