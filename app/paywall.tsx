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

interface Feature {
  icon: string;
  text: string;
  pro?: boolean;
}

const freeFeatures: Feature[] = [
  { icon: 'camera-outline', text: '1 Diagnose pro Tag' },
  { icon: 'leaf-outline', text: '3 Pflanzenprofile' },
  { icon: 'book-outline', text: 'Bibliothek & Nachschlagewerk' },
];

const growerFeatures: Feature[] = [
  { icon: 'camera-outline', text: '10 Diagnosen pro Tag' },
  { icon: 'leaf-outline', text: 'Unbegrenzte Pflanzen' },
  { icon: 'document-text-outline', text: 'PDF-Export' },
];

const proFeatures: Feature[] = [
  { icon: 'infinite-outline', text: 'Unbegrenzte Diagnosen' },
  { icon: 'leaf-outline', text: 'Unbegrenzte Pflanzen' },
  { icon: 'document-text-outline', text: 'PDF-Export' },
  { icon: 'flash-outline', text: 'Prioritäts-Analyse', pro: true },
  { icon: 'trending-up-outline', text: 'Detaillierte Berichte', pro: true },
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

export default function PaywallScreen() {
  const router = useRouter();
  const isWeb = Platform.OS === 'web';
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
      // Load Stripe plans
      getStripePlans().then((plans) => {
        setStripePlans(plans);
        setLoading(false);
      }).catch(() => setLoading(false));
    } else {
      // APK: also use Stripe plans (not RevenueCat)
      getStripePlans().then((plans) => {
        setStripePlans(plans);
        setLoading(false);
      }).catch(() => setLoading(false));
    }
  }, []);

  const handlePurchase = async () => {
    setPurchasing(true);

    // Use Stripe Checkout on all platforms (PWA + APK)
    {
      const plan = stripePlans[selectedIdx];
      if (!plan?.priceId) {
        setPurchasing(false);
        Alert.alert('Fehler', 'Produkt nicht verfügbar.');
        return;
      }
      const url = await startStripeCheckout(plan.priceId);
      setPurchasing(false);
      if (url) {
        if (Platform.OS === 'web') {
          window.location.href = url;
        } else {
          // Open Stripe Checkout in external browser
          Linking.openURL(url);
        }
      } else {
        Alert.alert('Fehler', 'Checkout konnte nicht gestartet werden. Bitte versuche es erneut.');
      }
    }
    if (false) {
      // RevenueCat purchase (disabled — using Stripe for now)
      if (packages.length === 0) { setPurchasing(false); return; }
      const result = await purchasePackage(packages[selectedIdx]);
      setPurchasing(false);

      if (result.success) {
        trackEvent('purchase_complete', { source: 'native' });
        Alert.alert('Willkommen!', 'Premium wurde aktiviert. Viel Spaß mit unbegrenzten Diagnosen!', [
          { text: 'Super!', onPress: () => router.back() },
        ]);
      } else if (result.error) {
        Alert.alert('Hinweis', result.error);
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
        setPromoMessage(data.message || 'Code ungültig.');
      }
    } catch {
      setPromoMessage('Fehler beim Einlösen. Bitte versuche es erneut.');
    }
    setPromoLoading(false);
  };

  const handleRestore = async () => {
    setRestoring(true);
    const result = await restorePurchases();
    setRestoring(false);

    if (result.isPremium) {
      Alert.alert('Wiederhergestellt!', 'Dein Premium-Abo wurde wiederhergestellt.', [
        { text: 'Super!', onPress: () => router.back() },
      ]);
    } else if (result.success) {
      Alert.alert('Kein Abo gefunden', 'Es wurde kein aktives Abonnement gefunden.');
    } else {
      Alert.alert('Fehler', 'Käufe konnten nicht wiederhergestellt werden. Bitte versuche es erneut.');
    }
  };

  // All platforms use Stripe plans now
  const displayPlans = stripePlans.map(p => ({ title: p.name, priceString: p.price }));

  const selectedPlan = displayPlans[selectedIdx];
  const features = selectedIdx === 0 ? growerFeatures : proFeatures;

  if (paymentSuccess) {
    return (
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <View style={styles.successContainer}>
          <View style={styles.successIcon}>
            <Ionicons name="checkmark-circle" size={64} color={colors.accent} />
          </View>
          <Text style={styles.successTitle}>Premium aktiviert!</Text>
          <Text style={styles.successText}>
            Viel Spaß mit unbegrenzten Diagnosen.
          </Text>
          <TouchableOpacity
            style={styles.purchaseBtn}
            onPress={() => router.replace('/')}
          >
            <Text style={styles.purchaseBtnText}>Zur Startseite</Text>
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
          <Text style={styles.title}>Premium freischalten</Text>
          <Text style={styles.subtitle}>
            Mehr Diagnosen, mehr Möglichkeiten
          </Text>
        </View>

        {/* Free tier info */}
        <View style={styles.freeCard}>
          <Text style={styles.freeTitle}>Kostenlos enthalten:</Text>
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
                {i === 1 && <View style={styles.popularBadge}><Text style={styles.popularText}>Beliebt</Text></View>}
                <Text style={[styles.packageTitle, i === selectedIdx && styles.packageTitleSelected]}>
                  {plan.title}
                </Text>
                <Text style={[styles.packagePrice, i === selectedIdx && styles.packagePriceSelected]}>
                  {plan.priceString}
                </Text>
                <Text style={styles.packagePeriod}>/ Monat</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Features for selected package */}
        {selectedPlan && (
          <View style={styles.featuresCard}>
            <Text style={styles.featuresTitle}>{selectedPlan.title} enthält:</Text>
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
              {selectedPlan ? `${selectedPlan.title} für ${selectedPlan.priceString}/Monat` : 'Laden...'}
            </Text>
          )}
        </TouchableOpacity>

        {/* Promo code */}
        {!promoSuccess && (
          <View style={styles.promoCard}>
            <Text style={styles.promoTitle}>Code einlösen</Text>
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
                  <Text style={styles.promoBtnText}>Einlösen</Text>
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
            <Text style={styles.promoSuccessText}>Premium aktiviert! Viel Spaß beim Diagnostizieren.</Text>
            <TouchableOpacity style={styles.purchaseBtn} onPress={() => router.replace('/')}>
              <Text style={styles.purchaseBtnText}>Zur Startseite</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Restore + Terms */}
        <View style={styles.footer}>
          {!isWeb && (
            <>
              <TouchableOpacity onPress={handleRestore} disabled={restoring}>
                <Text style={styles.footerLink}>
                  {restoring ? 'Wird wiederhergestellt...' : 'Käufe wiederherstellen'}
                </Text>
              </TouchableOpacity>
              <Text style={styles.footerDot}>·</Text>
            </>
          )}
          <TouchableOpacity onPress={() => router.push('/privacy')}>
            <Text style={styles.footerLink}>Datenschutz</Text>
          </TouchableOpacity>
          <Text style={styles.footerDot}>·</Text>
          <TouchableOpacity onPress={() => router.push('/terms')}>
            <Text style={styles.footerLink}>AGB</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.legalNote}>
          {isWeb
            ? 'Das Abo verlängert sich automatisch. Du kannst es jederzeit über dein Stripe-Kundenkonto kündigen. Die Bezahlung erfolgt sicher über Stripe.'
            : 'Das Abo verlängert sich automatisch, sofern es nicht mindestens 24 Stunden vor Ablauf des aktuellen Zeitraums gekündigt wird. Du kannst dein Abo jederzeit in den Einstellungen deines Google Play / App Store Kontos verwalten.'
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
