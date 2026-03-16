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

export default function PaywallScreen() {
  const router = useRouter();
  const [packages, setPackages] = useState<SubscriptionPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [restoring, setRestoring] = useState(false);

  useEffect(() => {
    getOfferings().then((pkgs) => {
      setPackages(pkgs);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const handlePurchase = async () => {
    if (packages.length === 0) return;
    setPurchasing(true);
    const result = await purchasePackage(packages[selectedIdx]);
    setPurchasing(false);

    if (result.success) {
      if (Platform.OS === 'web') {
        router.back();
      } else {
        Alert.alert('Willkommen!', 'Premium wurde aktiviert. Viel Spaß mit unbegrenzten Diagnosen!', [
          { text: 'Super!', onPress: () => router.back() },
        ]);
      }
    } else if (result.error) {
      if (Platform.OS === 'web') {
        alert(result.error);
      } else {
        Alert.alert('Hinweis', result.error);
      }
    }
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

  const selectedPkg = packages[selectedIdx];
  const features = selectedIdx === 0 ? growerFeatures : proFeatures;

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.closeBtn}>
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
            {packages.map((pkg, i) => (
              <TouchableOpacity
                key={pkg.id}
                style={[styles.packageCard, i === selectedIdx && styles.packageCardSelected]}
                onPress={() => setSelectedIdx(i)}
                activeOpacity={0.8}
              >
                {i === 1 && <View style={styles.popularBadge}><Text style={styles.popularText}>Beliebt</Text></View>}
                <Text style={[styles.packageTitle, i === selectedIdx && styles.packageTitleSelected]}>
                  {pkg.title}
                </Text>
                <Text style={[styles.packagePrice, i === selectedIdx && styles.packagePriceSelected]}>
                  {pkg.priceString}
                </Text>
                <Text style={styles.packagePeriod}>/ Monat</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Features for selected package */}
        {selectedPkg && (
          <View style={styles.featuresCard}>
            <Text style={styles.featuresTitle}>{selectedPkg.title} enthält:</Text>
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
          disabled={purchasing || packages.length === 0}
        >
          {purchasing ? (
            <ActivityIndicator color={colors.textOnAccent} />
          ) : (
            <Text style={styles.purchaseBtnText}>
              {selectedPkg ? `${selectedPkg.title} für ${selectedPkg.priceString}/Monat` : 'Laden...'}
            </Text>
          )}
        </TouchableOpacity>

        {/* Restore + Terms */}
        <View style={styles.footer}>
          <TouchableOpacity onPress={handleRestore} disabled={restoring}>
            <Text style={styles.footerLink}>
              {restoring ? 'Wird wiederhergestellt...' : 'Käufe wiederherstellen'}
            </Text>
          </TouchableOpacity>
          <Text style={styles.footerDot}>·</Text>
          <TouchableOpacity onPress={() => router.push('/privacy')}>
            <Text style={styles.footerLink}>Datenschutz</Text>
          </TouchableOpacity>
          <Text style={styles.footerDot}>·</Text>
          <TouchableOpacity onPress={() => router.push('/terms')}>
            <Text style={styles.footerLink}>AGB</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.legalNote}>
          Das Abo verlängert sich automatisch, sofern es nicht mindestens 24 Stunden vor
          Ablauf des aktuellen Zeitraums gekündigt wird. Du kannst dein Abo jederzeit in den
          Einstellungen deines Google Play / App Store Kontos verwalten.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: 20, paddingBottom: 40 },

  header: { alignItems: 'center', marginBottom: 24 },
  closeBtn: {
    position: 'absolute',
    top: 0,
    right: 0,
    padding: 8,
    zIndex: 1,
  },
  crownCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(251,191,36,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(251,191,36,0.2)',
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
});
