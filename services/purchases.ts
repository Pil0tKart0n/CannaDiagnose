import { Platform } from 'react-native';
import { setPremium } from './quota';

/**
 * Purchase Service – handles RevenueCat integration for subscriptions.
 *
 * SETUP ANLEITUNG (für den Entwickler):
 *
 * 1. Gehe zu https://app.revenuecat.com und erstelle einen Account
 * 2. Erstelle ein neues Projekt "LeafScan"
 * 3. Füge die Plattformen hinzu:
 *    - Google Play: Package Name = "com.cannadiagnose.app"
 *    - Apple (später): Bundle ID = "com.cannadiagnose.app"
 * 4. In Google Play Console:
 *    - Erstelle Abo-Produkte:
 *      - "grower_monthly" = 4,99€/Monat
 *      - "pro_monthly" = 9,99€/Monat
 * 5. In RevenueCat:
 *    - Verknüpfe die Produkte mit "Entitlements":
 *      - Entitlement "premium" → grower_monthly, pro_monthly
 *    - Erstelle ein "Offering" namens "default" mit beiden Produkten
 * 6. Kopiere deinen RevenueCat API Key und trage ihn unten ein
 *
 * Dann funktioniert alles automatisch!
 */

// TODO: Ersetze mit deinem echten RevenueCat API Key
const REVENUECAT_API_KEY_GOOGLE = process.env.EXPO_PUBLIC_REVENUECAT_GOOGLE_KEY || '';
const REVENUECAT_API_KEY_APPLE = process.env.EXPO_PUBLIC_REVENUECAT_APPLE_KEY || '';
const ENTITLEMENT_ID = 'premium';

let isInitialized = false;
let Purchases: any = null;

/** Initialize RevenueCat SDK */
export async function initPurchases(): Promise<void> {
  if (Platform.OS === 'web') return; // No native purchases on web
  if (isInitialized) return;

  try {
    Purchases = require('react-native-purchases').default;

    const apiKey = Platform.OS === 'ios'
      ? REVENUECAT_API_KEY_APPLE
      : REVENUECAT_API_KEY_GOOGLE;

    // Don't initialize without API key
    if (!apiKey) {
      console.log('[LeafScan] RevenueCat: No API key – running in demo mode');
      return;
    }

    await Purchases.configure({ apiKey });
    isInitialized = true;
    console.log('[LeafScan] RevenueCat initialized');

    // Check existing subscription
    await checkSubscriptionStatus();
  } catch (err) {
    console.log('[LeafScan] RevenueCat init failed:', err);
  }
}

/** Check if user has an active subscription */
export async function checkSubscriptionStatus(): Promise<boolean> {
  if (!isInitialized || !Purchases) {
    return false;
  }

  try {
    const customerInfo = await Purchases.getCustomerInfo();
    const isPremiumActive = customerInfo?.entitlements?.active?.[ENTITLEMENT_ID] !== undefined;

    // Sync with quota system
    await setPremium(isPremiumActive);

    return isPremiumActive;
  } catch (err) {
    console.log('[LeafScan] Subscription check failed:', err);
    return false;
  }
}

/** Get available subscription packages */
export async function getOfferings(): Promise<SubscriptionPackage[]> {
  if (!isInitialized || !Purchases) {
    // Return demo offerings when RevenueCat is not configured
    return getDemoOfferings();
  }

  try {
    const offerings = await Purchases.getOfferings();
    if (!offerings.current) return getDemoOfferings();

    return (offerings.current.availablePackages || []).map((pkg: any) => ({
      id: pkg.identifier,
      title: pkg.product.title,
      description: pkg.product.description,
      priceString: pkg.product.priceString,
      period: pkg.packageType === 'MONTHLY' ? 'month' : 'year',
      rcPackage: pkg, // Keep reference for purchase
    }));
  } catch (err) {
    console.log('[LeafScan] Get offerings failed:', err);
    return getDemoOfferings();
  }
}

/** Purchase a subscription package */
export async function purchasePackage(pkg: SubscriptionPackage): Promise<{ success: boolean; error?: string }> {
  if (!isInitialized || !Purchases) {
    // Demo mode – simulate purchase
    return { success: false, error: 'Payment-System wird gerade eingerichtet. Bitte versuche es später erneut.' };
  }

  try {
    const { customerInfo } = await Purchases.purchasePackage(pkg.rcPackage);
    const isPremiumActive = customerInfo?.entitlements?.active?.[ENTITLEMENT_ID] !== undefined;

    if (isPremiumActive) {
      await setPremium(true);
      return { success: true };
    }

    return { success: false, error: 'Kauf konnte nicht abgeschlossen werden.' };
  } catch (err: any) {
    if (err.userCancelled) {
      return { success: false, error: undefined }; // User cancelled, no error
    }
    return { success: false, error: err.message || 'Ein Fehler ist aufgetreten.' };
  }
}

/** Restore previous purchases (important for App Store compliance) */
export async function restorePurchases(): Promise<{ success: boolean; isPremium: boolean }> {
  if (!isInitialized || !Purchases) {
    return { success: false, isPremium: false };
  }

  try {
    const customerInfo = await Purchases.restorePurchases();
    const isPremiumActive = customerInfo?.entitlements?.active?.[ENTITLEMENT_ID] !== undefined;
    await setPremium(isPremiumActive);
    return { success: true, isPremium: isPremiumActive };
  } catch (err) {
    console.log('[LeafScan] Restore failed:', err);
    return { success: false, isPremium: false };
  }
}

// ── Types ──

export interface SubscriptionPackage {
  id: string;
  title: string;
  description: string;
  priceString: string;
  period: 'month' | 'year';
  rcPackage?: any;
}

// ── Demo offerings (shown when RevenueCat is not yet configured) ──

function getDemoOfferings(): SubscriptionPackage[] {
  return [
    {
      id: 'grower_monthly',
      title: 'Grower',
      description: '10 Diagnosen pro Tag, unbegrenzte Pflanzen',
      priceString: '4,99 €',
      period: 'month',
    },
    {
      id: 'pro_monthly',
      title: 'Pro',
      description: 'Unbegrenzte Diagnosen, PDF-Export, Prioritäts-Analyse',
      priceString: '9,99 €',
      period: 'month',
    },
  ];
}
