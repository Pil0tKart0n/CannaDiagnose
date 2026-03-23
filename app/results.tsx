import React, { useState, useRef, useEffect } from 'react';
import { ScrollView, View, Image, StyleSheet, Text, TouchableOpacity, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, BackHandler } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import DiagnosisCard from '../components/DiagnosisCard';
import { FactorsList, ActionPlan, PreventiveTips } from '../components/RecommendationCard';
import Button from '../components/Button';
import { colors } from '../constants/colors';
import { useDiagnosis } from './_layout';
import { DiagnosisResult } from '../types';
import { shareDiagnosis } from '../services/export';
import { refineDiagnosis, validateDiagnosisResult, cachedReadAsBase64 } from '../services/claude';
import { updateEntry } from '../services/storage';
import { trackEvent } from '../services/analytics';
import { t } from '../services/i18n';

const SERVER_URL = process.env.EXPO_PUBLIC_API_PROXY_URL || 'https://leafscan.de';

/** Convert any image URI (blob:, file://, data:, http) to base64 data URI */
async function imageToDataUri(uri: string): Promise<string> {
  if (uri.startsWith('data:image/')) return uri;
  // Try cachedReadAsBase64 first (works on native + web blob/file URIs)
  try {
    const base64 = await cachedReadAsBase64(uri);
    return `data:image/jpeg;base64,${base64}`;
  } catch (_) {}
  // Web fallback: load into canvas and export
  if (Platform.OS === 'web') {
    return new Promise((resolve, reject) => {
      const img = new (window as any).Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        canvas.getContext('2d')!.drawImage(img, 0, 0);
        resolve(canvas.toDataURL('image/jpeg', 0.85));
      };
      img.onerror = reject;
      img.src = uri;
    });
  }
  throw new Error('Cannot convert image');
}

async function sendFeedbackToServer(
  rating: 'positive' | 'negative',
  result: DiagnosisResult | null,
  questionnaire?: any,
  images?: string[],
) {
  if (!result) return;
  const body: any = {
    rating,
    diagnosis: result.primaryDiagnosis,
    severity: result.severity,
    confidence: result.confidence,
    fullDiagnosis: result,
    questionnaire: questionnaire || null,
  };
  // Only send images on negative feedback (saves bandwidth + storage)
  if (rating === 'negative' && images && images.length > 0) {
    try {
      const base64Images = await Promise.all(
        images.slice(0, 5).map(imageToDataUri)
      );
      body.images = base64Images;
    } catch (e) {
      // If conversion fails, skip images
    }
  }
  fetch(`${SERVER_URL}/api/feedback`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }).catch(() => {}); // fire and forget
}
import { libraryEntries } from '../constants/library';
import { KNOWN_COLORS, applyColorCorrection } from '../constants/colorCorrections';
import RefineCard from '../components/RefineCard';

export default function ResultsScreen() {
  const router = useRouter();
  const { result, setResult, questionnaire, imageUri, imageUris, setImageUris, optimizedImageUris, reset, selectedPlantId, isFollowUp } = useDiagnosis();
  const params = useLocalSearchParams<{ historyResult?: string; historyImage?: string; historyImages?: string; entryId?: string }>();
  const [sharing, setSharing] = useState(false);
  const [refineOpen, setRefineOpen] = useState(false);
  const [refineLoading, setRefineLoading] = useState(false);
  const [refined, setRefined] = useState(false);
  const [apiRefinedResult, setApiRefinedResult] = useState<DiagnosisResult | null>(null);
  const [phInput, setPhInput] = useState('');
  const [ecInput, setEcInput] = useState('');
  const [soilTempInput, setSoilTempInput] = useState('');
  const [fertilizerInput, setFertilizerInput] = useState<string | null>(questionnaire.fertilizerType || null);
  const [fertilizerPickerOpen, setFertilizerPickerOpen] = useState(false);
  const [fertilizerSearch, setFertilizerSearch] = useState('');
  const [colorInput, setColorInput] = useState('');
  const [selectedColor, setSelectedColor] = useState<typeof KNOWN_COLORS[number] | null>(null);
  const [colorCorrected, setColorCorrected] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  const refineYRef = useRef(0);

  const [refinedResult, setRefinedResult] = useState<DiagnosisResult | null>(null);
  const [feedback, setFeedback] = useState<'positive' | 'negative' | null>(null);

  // Color suggestions based on input
  const colorSuggestions = colorInput.length >= 2
    ? KNOWN_COLORS.filter((c) =>
        c.keywords.some((kw) => kw.includes(colorInput.toLowerCase())) ||
        c.label.toLowerCase().includes(colorInput.toLowerCase())
      )
    : [];

  const displayResult: DiagnosisResult | null = refinedResult
    ? refinedResult
    : params.historyResult
      ? (() => { try { return validateDiagnosisResult(JSON.parse(params.historyResult)); } catch { return result; } })()
      : result;

  const displayImage = params.historyImage || imageUri;
  const historyImagesParsed: string[] = params.historyImages
    ? (() => { try { return JSON.parse(params.historyImages); } catch { return []; } })()
    : [];
  const displayImages = historyImagesParsed.length > 0
    ? historyImagesParsed
    : imageUris.length > 0
      ? imageUris
      : (displayImage ? [displayImage] : []);
  const isFromHistory = !!params.historyResult;

  // Override back navigation for fresh results: go home instead of back to analyzing
  useEffect(() => {
    if (isFromHistory) return;

    const onBackPress = () => {
      router.replace('/');
      return true;
    };

    const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => subscription.remove();
  }, [isFromHistory, router]);

  console.log('[LeafScan] Results - displayResult:', JSON.stringify(displayResult)?.substring(0, 300));
  console.log('[LeafScan] Results - context result:', JSON.stringify(result)?.substring(0, 300));

  if (!displayResult) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>{t('results.noDiagnosis')}</Text>
        <Button title={t('results.back')} onPress={() => router.back()} />
      </View>
    );
  }

  const startNew = () => {
    reset();
    router.replace('/');
  };

  const scanAnother = () => {
    setImageUris([]);
    router.push('/camera');
  };

  const handleColorSelect = (color: typeof KNOWN_COLORS[number]) => {
    setSelectedColor(color);
    setColorInput('');
    // Apply correction locally – no API call
    const corrected = applyColorCorrection(color, displayResult!);
    setRefinedResult(corrected);
    setColorCorrected(true);
  };

  const handleColorRemove = () => {
    setSelectedColor(null);
    setColorCorrected(false);
    // Revert to API-refined result if available, otherwise to original
    if (refined) {
      setRefinedResult(apiRefinedResult);
    } else {
      setRefinedResult(null);
    }
  };

  const isLivingSoil = questionnaire.substrateType === 'Living Soil';
  const isOrganic = questionnaire.fertilizerCategory === 'organic' || questionnaire.fertilizerCategory === 'hybrid';

  const handleRefine = async () => {
    const hasData = (isLivingSoil || isOrganic)
      ? (phInput || soilTempInput)
      : (phInput || ecInput);
    if (!hasData) {
      const msg = (isLivingSoil || isOrganic)
        ? t('results.missingDataOrganic')
        : t('results.missingDataMineral');
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.alert(msg);
      } else {
        Alert.alert(t('results.missingDataTitle'), msg);
      }
      return;
    }
    // Validate pH/EC ranges before sending to API
    if (phInput) {
      const ph = parseFloat(phInput.replace(',', '.'));
      if (isNaN(ph) || ph < 0 || ph > 14) {
        const msg = t('results.invalidPh');
        if (Platform.OS === 'web' && typeof window !== 'undefined') { window.alert(msg); } else { Alert.alert(t('results.invalidValue'), msg); }
        return;
      }
    }
    if (ecInput) {
      const ec = parseFloat(ecInput.replace(',', '.'));
      if (isNaN(ec) || ec < 0 || ec > 15) {
        const msg = t('results.invalidEc');
        if (Platform.OS === 'web' && typeof window !== 'undefined') { window.alert(msg); } else { Alert.alert(t('results.invalidValue'), msg); }
        return;
      }
    }
    setRefineLoading(true);
    try {
      const allUris = imageUris.length > 0 ? imageUris : (displayImage ? [displayImage] : []);
      const preOptimized = optimizedImageUris.length === allUris.length ? optimizedImageUris : [];
      const refined = await refineDiagnosis(
        allUris,
        displayResult!,
        questionnaire.substrateType,
        phInput || null,
        ecInput || null,
        fertilizerInput,
        questionnaire.plantAgeWeeks,
        questionnaire.growPhase,
        preOptimized,
        soilTempInput || null,
      );
      setApiRefinedResult(refined);
      setRefinedResult(refined);
      setRefined(true);
      setRefineOpen(false);
    } catch (err: any) {
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.alert(err.message || t('results.refineFailed'));
      } else {
        Alert.alert(t('results.error'), err.message || t('results.refineFailed'));
      }
    } finally {
      setRefineLoading(false);
    }
  };

  const handleShare = async () => {
    if (sharing) return;
    setSharing(true);
    try {
      await shareDiagnosis(displayResult, displayImage || undefined);
    } catch (err: any) {
      if (!err.message?.includes('abgebrochen') && !err.message?.includes('cancelled')) {
        if (Platform.OS === 'web' && typeof window !== 'undefined') {
          window.alert(err.message || t('results.shareFailed'));
        } else {
          Alert.alert(t('results.error'), err.message || t('results.shareFailed'));
        }
      }
    } finally {
      setSharing(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
    <ScrollView
      ref={scrollRef}
      style={styles.scrollView}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      {/* Photos */}
      {displayImages.length > 1 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imageStrip}>
          {displayImages.map((uri, i) => (
            <Image key={`${uri}-${i}`} source={{ uri }} style={styles.imageThumb} resizeMode="cover" />
          ))}
        </ScrollView>
      ) : displayImage ? (
        <Image source={{ uri: displayImage }} style={styles.image} resizeMode="cover" />
      ) : null}

      {/* Share button */}
      <TouchableOpacity onPress={handleShare} style={styles.shareRow} activeOpacity={0.7}>
        {sharing ? (
          <ActivityIndicator size="small" color={colors.accent} />
        ) : (
          <Ionicons name="share-outline" size={18} color={colors.accent} />
        )}
        <Text style={styles.shareText}>{t('results.share')}</Text>
      </TouchableOpacity>

      <DiagnosisCard result={displayResult} isRefined={refined || colorCorrected} />

      {displayResult.contributingFactors?.length > 0 && (
        <FactorsList factors={displayResult.contributingFactors} />
      )}

      {displayResult.actionPlan?.length > 0 && (
        <ActionPlan steps={displayResult.actionPlan} />
      )}

      {displayResult.preventiveTips?.length > 0 && (
        <PreventiveTips tips={displayResult.preventiveTips} />
      )}

      {/* Refine Card */}
      {!isFromHistory && !(refined && colorCorrected) && (
        <View onLayout={(e) => { refineYRef.current = e.nativeEvent.layout.y; }}>
          <RefineCard
            refineOpen={refineOpen}
            onToggleOpen={() => setRefineOpen(!refineOpen)}
            refineLoading={refineLoading}
            onRefine={handleRefine}
            phInput={phInput}
            onPhChange={setPhInput}
            ecInput={ecInput}
            onEcChange={setEcInput}
            soilTempInput={soilTempInput}
            onSoilTempChange={setSoilTempInput}
            fertilizerInput={fertilizerInput}
            fertilizerPickerOpen={fertilizerPickerOpen}
            onFertilizerPickerToggle={() => {
              setFertilizerPickerOpen(!fertilizerPickerOpen);
              if (!fertilizerPickerOpen) setFertilizerSearch('');
            }}
            fertilizerSearch={fertilizerSearch}
            onFertilizerSearchChange={setFertilizerSearch}
            onFertilizerSelect={(name) => {
              setFertilizerInput(name);
              setFertilizerPickerOpen(false);
              setFertilizerSearch('');
            }}
            colorInput={colorInput}
            onColorInputChange={setColorInput}
            selectedColor={selectedColor}
            colorSuggestions={colorSuggestions}
            onColorSelect={handleColorSelect}
            onColorRemove={handleColorRemove}
            substrateType={questionnaire.substrateType}
            isLivingSoil={isLivingSoil}
            isOrganic={isOrganic}
            hasFertilizerFromQuestionnaire={!!questionnaire.fertilizerType}
            onInputFocus={(offset) => {
              setTimeout(() => {
                scrollRef.current?.scrollTo({ y: refineYRef.current + (offset || 0), animated: true });
              }, 300);
            }}
          />
        </View>
      )}

      {(refined || colorCorrected) && (
        <View style={styles.refinedBadge}>
          <Ionicons name="checkmark-circle" size={16} color={colors.accent} />
          <Text style={styles.refinedBadgeText}>
            {colorCorrected && !refined
              ? t('results.refinedColor')
              : refined && colorCorrected
                ? t('results.refinedColorAndData')
                : t('results.refinedData')}
          </Text>
        </View>
      )}

      {displayResult.followUpDays && !isFromHistory && (
        <View style={styles.followUpInfo}>
          <Ionicons name="notifications-outline" size={16} color={colors.accent} />
          <Text style={styles.followUpInfoText}>
            {t('results.followUpReminder', { days: displayResult.followUpDays })}
          </Text>
        </View>
      )}

      {/* Library link — match diagnosis to library entry */}
      {(() => {
        const diag = displayResult.primaryDiagnosis.toLowerCase();
        const match = libraryEntries.find(e => {
          const n = e.name.toLowerCase();
          if (diag.includes('stickstoff') || diag.includes('(n)') || diag.includes('n-mangel')) return e.id === 'n-stickstoff';
          if (diag.includes('phosphor') || diag.includes('(p)')) return e.id === 'n-phosphor';
          if (diag.includes('kalium') || diag.includes('(k)')) return e.id === 'n-kalium';
          if (diag.includes('kalzium') || diag.includes('calcium') || diag.includes('(ca)')) return e.id === 'n-kalzium';
          if (diag.includes('magnesium') || diag.includes('(mg)')) return e.id === 'n-magnesium';
          if (diag.includes('eisen') || diag.includes('(fe)')) return e.id === 'n-eisen';
          if (diag.includes('mangan') || diag.includes('(mn)')) return e.id === 'n-mangan';
          if (diag.includes('zink') || diag.includes('(zn)')) return e.id === 'n-zink';
          if (diag.includes('schwefel') || diag.includes('(s)')) return e.id === 'n-schwefel';
          if (diag.includes('bor') || diag.includes('(b)')) return e.id === 'n-bor';
          if (diag.includes('kupfer') || diag.includes('(cu)')) return e.id === 'n-kupfer';
          if (diag.includes('molybdän') || diag.includes('(mo)')) return e.id === 'n-molybdaen';
          return false;
        });
        if (!match) return null;
        return (
          <TouchableOpacity
            style={styles.libraryLink}
            onPress={() => router.push({ pathname: '/library', params: { highlight: match.id } })}
            activeOpacity={0.7}
          >
            <Ionicons name="book-outline" size={16} color={colors.accent} />
            <Text style={styles.libraryLinkText}>{t('results.libraryLink', { name: match.name })}</Text>
            <Ionicons name="chevron-forward" size={14} color={colors.textMuted} />
          </TouchableOpacity>
        );
      })()}

      {/* Feedback */}
      {!isFromHistory && (
        <View style={styles.feedbackRow}>
          <Text style={styles.feedbackLabel}>{t('results.feedbackQuestion')}</Text>
          <View style={styles.feedbackButtons}>
            <TouchableOpacity
              style={[styles.feedbackBtn, feedback === 'positive' && styles.feedbackBtnActive]}
              onPress={() => {
                setFeedback('positive');
                trackEvent('feedback_given', { rating: 'positive' });
                if (params.entryId) updateEntry(params.entryId, { feedback: 'positive' });
                sendFeedbackToServer('positive', displayResult, questionnaire);
              }}
              activeOpacity={0.7}
            >
              <Ionicons name={feedback === 'positive' ? 'thumbs-up' : 'thumbs-up-outline'} size={18} color={feedback === 'positive' ? colors.accent : colors.textMuted} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.feedbackBtn, feedback === 'negative' && styles.feedbackBtnNegative]}
              onPress={() => {
                setFeedback('negative');
                trackEvent('feedback_given', { rating: 'negative' });
                if (params.entryId) updateEntry(params.entryId, { feedback: 'negative' });
                sendFeedbackToServer('negative', displayResult, questionnaire, displayImages);
              }}
              activeOpacity={0.7}
            >
              <Ionicons name={feedback === 'negative' ? 'thumbs-down' : 'thumbs-down-outline'} size={18} color={feedback === 'negative' ? colors.error : colors.textMuted} />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Disclaimer */}
      <View style={styles.disclaimer}>
        <Text style={styles.disclaimerText}>
          {t('results.disclaimer')}
        </Text>
      </View>

      {selectedPlantId && !isFromHistory ? (
        <View style={styles.btnRow}>
          <Button
            title={t('results.toPlant')}
            onPress={() => {
              const pid = selectedPlantId;
              reset();
              router.replace({ pathname: '/plant-detail', params: { plantId: pid } });
            }}
            style={styles.newBtn}
          />
          {!isFromHistory && (
            <TouchableOpacity onPress={scanAnother} style={styles.scanAnotherBtn} activeOpacity={0.7}>
              <Ionicons name="camera-outline" size={18} color={colors.accent} />
              <Text style={styles.scanAnotherText}>{t('results.scanAnother')}</Text>
            </TouchableOpacity>
          )}
          <Button title={t('results.newDiagnosis')} onPress={startNew} variant="secondary" style={styles.newBtn} />
        </View>
      ) : (
        <View style={styles.btnRow}>
          {!isFromHistory && (
            <TouchableOpacity onPress={scanAnother} style={styles.scanAnotherBtn} activeOpacity={0.7}>
              <Ionicons name="camera-outline" size={18} color={colors.accent} />
              <Text style={styles.scanAnotherText}>{t('results.scanAnother')}</Text>
            </TouchableOpacity>
          )}
          <Button title={t('results.newDiagnosis')} onPress={startNew} style={styles.newBtn} />
        </View>
      )}
    </ScrollView>
    </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 80,
  },
  image: {
    width: '100%',
    height: 220,
    borderRadius: 16,
    marginBottom: 12,
  },
  imageStrip: {
    marginBottom: 12,
  },
  imageThumb: {
    width: 160,
    height: 160,
    borderRadius: 14,
    marginRight: 10,
  },
  shareRow: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-end',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 4,
    marginBottom: 4,
  },
  shareText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.accent,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: colors.background,
    gap: 16,
  },
  emptyText: {
    fontSize: 16,
    color: colors.textMuted,
  },
  disclaimer: {
    marginTop: 16,
    marginBottom: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: 'rgba(248,113,113,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(248,113,113,0.1)',
  },
  disclaimerText: {
    fontSize: 11,
    color: colors.textMuted,
    lineHeight: 16,
    textAlign: 'center',
  },
  libraryLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.accentGlow,
    borderRadius: 12,
    padding: 14,
    marginTop: 12,
    borderWidth: 1,
    borderColor: colors.borderAccent,
  },
  libraryLinkText: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.accent,
    flex: 1,
  },
  feedbackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 16,
    paddingVertical: 12,
    paddingHorizontal: 4,
  },
  feedbackLabel: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  feedbackButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  feedbackBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  feedbackBtnActive: {
    backgroundColor: colors.accentGlow,
    borderColor: colors.accent,
  },
  feedbackBtnNegative: {
    backgroundColor: 'rgba(248,113,113,0.08)',
    borderColor: 'rgba(248,113,113,0.3)',
  },
  newBtn: {
    marginTop: 8,
  },
  followUpInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.accentGlow,
    borderRadius: 12,
    padding: 14,
    marginTop: 12,
    borderWidth: 1,
    borderColor: colors.borderAccent,
  },
  followUpInfoText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.accent,
    flex: 1,
  },
  btnRow: {
    gap: 8,
  },
  refinedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.accentGlow,
    borderRadius: 10,
    padding: 12,
    marginTop: 12,
    borderWidth: 1,
    borderColor: colors.borderAccent,
  },
  refinedBadgeText: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.accent,
    flex: 1,
  },
  scanAnotherBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1.5,
    borderColor: colors.accent,
    borderRadius: 14,
    paddingVertical: 14,
    marginTop: 8,
    backgroundColor: 'transparent',
  },
  scanAnotherText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.accent,
  },
});
