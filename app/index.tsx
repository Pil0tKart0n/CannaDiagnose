import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Platform,
  TouchableOpacity,
  Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../constants/colors';
import { useDiagnosis } from './_layout';
import { getQuotaDisplay, setPremium, setSessionToken } from '../services/quota';
import { hasCompletedOnboarding } from './onboarding';

const webCSS = Platform.OS === 'web' ? `
  .cd-screen {
    background:
      radial-gradient(ellipse 80% 50% at 50% 100%, rgba(74,222,128,0.04) 0%, transparent 60%),
      linear-gradient(175deg, #0E1510 0%, #0A0E0D 100%);
    min-height: 100%;
  }
  .cd-btn-primary {
    position: relative; overflow: hidden; border-radius: 12px;
    background: linear-gradient(180deg, #5AEF90 0%, #4ADE80 50%, #3CC870 100%);
    box-shadow: 0 2px 8px rgba(74,222,128,0.25), inset 0 1px 0 rgba(255,255,255,0.15);
    transition: transform 0.15s ease; cursor: pointer;
  }
  .cd-btn-primary:hover { transform: scale(1.01); }
  .cd-btn-primary:active { transform: scale(0.97); }
  .cd-btn-secondary {
    position: relative; overflow: hidden; border-radius: 12px;
    border: 1px solid #1E2A24;
    background: transparent;
    transition: transform 0.15s ease, background 0.15s ease; cursor: pointer;
  }
  .cd-btn-secondary:hover { background: rgba(255,255,255,0.03); }
  .cd-btn-secondary:active { transform: scale(0.97); }
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

  useEffect(() => {
    injectCSS();
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

  const startDiagnosis = () => {
    reset();
    router.push('/camera');
  };

  const isWeb = Platform.OS === 'web';

  return (
    <View style={styles.screenBg}>
      {isWeb && <div className="cd-screen" style={{ position: 'absolute', inset: 0 } as any} />}
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>

          {/* Center: Title + Flow — takes all available space, centered */}
          <View style={styles.centerArea}>
            <Text style={styles.title}>Leaf</Text>
            <Text style={styles.titleAccent}>Scan</Text>

            <View style={styles.divider} />

            <View style={styles.flowRow}>
              <Text style={styles.flowStep}>Foto</Text>
              <Text style={styles.flowDot}>·</Text>
              <Text style={styles.flowStep}>Analyse</Text>
              <Text style={styles.flowDot}>·</Text>
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
  title: {
    fontSize: 44,
    fontWeight: '300',
    color: colors.text,
    letterSpacing: 8,
    textTransform: 'uppercase',
  },
  titleAccent: {
    fontSize: 44,
    fontWeight: '600',
    color: colors.accent,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginTop: -4,
  },
  divider: {
    width: 48,
    height: 1,
    backgroundColor: 'rgba(74,222,128,0.2)',
    marginVertical: 28,
    borderRadius: 1,
  },
  flowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  flowStep: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textMuted,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  flowDot: {
    fontSize: 16,
    color: 'rgba(74,222,128,0.3)',
    fontWeight: '300',
  },
  infoLink: {
    marginTop: 20,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  infoLinkText: {
    fontSize: 13,
    color: colors.textMuted,
    fontWeight: '500',
    letterSpacing: 0.3,
  },

  // Quota badge
  quotaBadge: {
    marginTop: 12,
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: 'rgba(74,222,128,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(74,222,128,0.15)',
  },
  quotaBadgePremium: {
    backgroundColor: 'rgba(251,191,36,0.08)',
    borderColor: 'rgba(251,191,36,0.2)',
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

  // Buttons
  buttons: { gap: 10 },
  secondaryRow: {
    flexDirection: 'row',
    gap: 10,
  },
  nativePrimaryBtn: {
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    overflow: 'hidden',
    ...Platform.select({
      ios: { shadowColor: '#4ADE80', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 12 },
      android: { elevation: 6 },
    }),
  },
  nativeSecondaryBtn: {
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.border,
  },
  primaryBtnText: {
    color: colors.textOnAccent,
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  secondaryBtnText: {
    color: colors.textSecondary,
    fontSize: 14,
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
