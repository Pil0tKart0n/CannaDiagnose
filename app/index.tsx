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

const webCSS = Platform.OS === 'web' ? `
  @keyframes shimmerPrimary {
    0% { left: -40%; }
    100% { left: 140%; }
  }
  @keyframes shimmerSecondary {
    0% { left: -40%; }
    100% { left: 140%; }
  }
  @keyframes breathe {
    0% { box-shadow: 0 4px 24px rgba(0,230,118,0.2); }
    50% { box-shadow: 0 8px 44px rgba(0,230,118,0.45); }
    100% { box-shadow: 0 4px 24px rgba(0,230,118,0.2); }
  }
  .cd-screen {
    background: radial-gradient(ellipse 140% 60% at 50% 105%, rgba(0,200,83,0.08) 0%, transparent 55%),
                radial-gradient(ellipse 60% 40% at 85% 15%, rgba(0,200,83,0.04) 0%, transparent 45%),
                linear-gradient(170deg, #0A1F15 0%, #071510 40%, #060E0A 100%);
    min-height: 100%;
  }
  .cd-btn-primary {
    position: relative; overflow: hidden; border-radius: 18px;
    border: 1px solid rgba(255,255,255,0.1);
    background: radial-gradient(ellipse 130% 90% at 50% 12%, rgba(255,255,255,0.2) 0%, transparent 50%),
                linear-gradient(176deg, #00FF88 0%, #00E676 20%, #00C853 55%, #009A40 100%);
    box-shadow: 0 4px 24px rgba(0,230,118,0.2), inset 0 1px 0 rgba(255,255,255,0.15), inset 0 -1px 3px rgba(0,0,0,0.15);
    transition: transform 0.2s ease; cursor: pointer;
  }
  .cd-btn-primary:active { transform: scale(0.97); }
  .cd-btn-primary::before {
    content: ''; position: absolute; top: -10%; width: 22%; height: 120%;
    background: linear-gradient(105deg, transparent 25%, rgba(255,255,255,0.08) 45%, rgba(255,255,255,0.14) 50%, rgba(255,255,255,0.08) 55%, transparent 75%);
    animation: shimmerPrimary 5s ease-in-out infinite; transform: skewX(-15deg); pointer-events: none;
  }
  .cd-btn-primary.pulsing { animation: breathe 1.4s ease-in-out infinite; }
  .cd-btn-secondary {
    position: relative; overflow: hidden; border-radius: 18px;
    border: 1px solid rgba(255,255,255,0.04);
    background: rgba(255,255,255,0.02);
    transition: transform 0.2s ease; cursor: pointer;
  }
  .cd-btn-secondary:hover { background: rgba(255,255,255,0.04); }
  .cd-btn-secondary:active { transform: scale(0.97); }
  .cd-btn-secondary::before {
    content: ''; position: absolute; top: -10%; width: 22%; height: 120%;
    background: linear-gradient(105deg, transparent 25%, rgba(255,255,255,0.03) 45%, rgba(255,255,255,0.05) 50%, rgba(255,255,255,0.03) 55%, transparent 75%);
    animation: shimmerSecondary 7s ease-in-out 2s infinite; transform: skewX(-15deg); pointer-events: none;
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
  const [isPulsing, setIsPulsing] = useState(false);
  const [showInfo, setShowInfo] = useState(false);

  useEffect(() => { injectCSS(); }, []);

  const startDiagnosis = () => {
    setIsPulsing(true);
    setTimeout(() => { reset(); router.push('/camera'); }, 900);
  };

  const isWeb = Platform.OS === 'web';

  return (
    <View style={styles.screenBg}>
      {isWeb && <div className="cd-screen" style={{ position: 'absolute', inset: 0 } as any} />}
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>

          {/* Top spacer */}
          <View style={{ flex: 1 }} />

          {/* Center: Title + Flow */}
          <View style={styles.centerArea}>
            <Text style={styles.title}>Canna</Text>
            <Text style={styles.titleAccent}>Diagnose</Text>

            <View style={styles.divider} />

            {/* Minimal text flow - no boxes, no icons */}
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
          </View>

          {/* Bottom spacer */}
          <View style={{ flex: 1 }} />

          {/* Buttons */}
          <View style={styles.buttons}>
            {isWeb ? (
              <>
                <div
                  className={`cd-btn-primary ${isPulsing ? 'pulsing' : ''}`}
                  onClick={startDiagnosis}
                  style={{ padding: '18px 24px', textAlign: 'center' } as any}
                >
                  <Text style={styles.primaryBtnText}>Diagnose starten</Text>
                </div>
                <div
                  className="cd-btn-secondary"
                  onClick={() => router.push('/history')}
                  style={{ padding: '17px 24px', textAlign: 'center' } as any}
                >
                  <Text style={styles.secondaryBtnText}>Verlauf</Text>
                </div>
              </>
            ) : (
              <>
                <TouchableOpacity onPress={startDiagnosis} activeOpacity={0.85}>
                  <LinearGradient
                    colors={['#00FF88', '#00E676', '#00C853', '#009A40']}
                    start={{ x: 0.5, y: 0 }}
                    end={{ x: 0.5, y: 1 }}
                    style={styles.nativePrimaryBtn}
                  >
                    <Text style={styles.primaryBtnText}>Diagnose starten</Text>
                  </LinearGradient>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.nativeSecondaryBtn}
                  onPress={() => router.push('/history')}
                  activeOpacity={0.7}
                >
                  <Text style={styles.secondaryBtnText}>Verlauf</Text>
                </TouchableOpacity>
              </>
            )}
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
    backgroundColor: '#071510',
  },
  container: { flex: 1 },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingBottom: 20,
  },

  // Center
  centerArea: {
    alignItems: 'center',
  },
  title: {
    fontSize: 48,
    fontWeight: '200',
    color: colors.text,
    letterSpacing: 6,
    textTransform: 'uppercase',
  },
  titleAccent: {
    fontSize: 48,
    fontWeight: '800',
    color: colors.accent,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginTop: -6,
  },
  divider: {
    width: 40,
    height: 2,
    backgroundColor: 'rgba(0,230,118,0.3)',
    marginVertical: 24,
    borderRadius: 1,
  },
  flowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  flowStep: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.textMuted,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  flowDot: {
    fontSize: 18,
    color: 'rgba(0,230,118,0.4)',
    fontWeight: '300',
  },
  infoLink: {
    marginTop: 20,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  infoLinkText: {
    fontSize: 13,
    color: 'rgba(0,230,118,0.5)',
    fontWeight: '500',
    letterSpacing: 0.3,
  },

  // Buttons
  buttons: { gap: 10 },
  nativePrimaryBtn: {
    borderRadius: 18,
    paddingVertical: 18,
    alignItems: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    ...Platform.select({
      ios: { shadowColor: 'rgba(0,230,118,0.4)', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 1, shadowRadius: 16 },
      android: { elevation: 8 },
    }),
  },
  nativeSecondaryBtn: {
    borderRadius: 18,
    paddingVertical: 17,
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.04)',
  },
  primaryBtnText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  secondaryBtnText: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '600',
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
    backgroundColor: '#0E1A14',
    borderRadius: 24,
    padding: 28,
    width: '100%',
    maxWidth: 340,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    ...Platform.select({
      web: { boxShadow: '0 16px 48px rgba(0,0,0,0.5)' },
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 16 }, shadowOpacity: 0.5, shadowRadius: 30 },
      android: { elevation: 20 },
    }),
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 16,
  },
  modalText: {
    fontSize: 15,
    color: colors.textSecondary,
    lineHeight: 26,
    marginBottom: 24,
  },
  modalClose: {
    backgroundColor: 'rgba(0,230,118,0.12)',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0,230,118,0.2)',
  },
  modalCloseText: {
    color: colors.accent,
    fontSize: 15,
    fontWeight: '700',
  },
});
