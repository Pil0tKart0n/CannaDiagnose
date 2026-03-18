import React, { useState, useRef } from 'react';
import { ScrollView, View, Image, StyleSheet, Text, TouchableOpacity, ActivityIndicator, Alert, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
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
import { refineDiagnosis, validateDiagnosisResult } from '../services/claude';
import { getFertilizerNames } from '../constants/fertilizers';
import { updateEntry } from '../services/storage';
import { libraryEntries } from '../constants/library';

// ── Color correction mapping (local, no API cost) ──────────────────
const KNOWN_COLORS: { label: string; keywords: string[]; correction: { diagnosis: string; explanation: string; severity: 'niedrig' | 'mittel' | 'hoch' | 'kritisch' } }[] = [
  {
    label: 'Gelb (gleichmäßig)',
    keywords: ['gelb', 'gelblich', 'hellgelb', 'vergilbt', 'vergilbung'],
    correction: {
      diagnosis: 'Stickstoff(N)-Mangel – gleichmäßige Vergilbung des gesamten Blattes, bestätigt durch Farbangabe des Growers.',
      explanation: 'Der Grower bestätigt eine gleichmäßige Gelbfärbung ohne auffälliges Adernmuster. Dies ist das klassische Bild eines Stickstoff-Mangels: Das gesamte Blatt wird blass/gelb, die Pflanze mobilisiert N aus älteren Blättern. Bei leicht grüneren Adern handelt es sich um den normalen Verlauf – die Adern vergilben zuletzt.',
      severity: 'hoch',
    },
  },
  {
    label: 'Gelb (Adern grün)',
    keywords: ['adern grün', 'adern gruen', 'interveinal', 'fischgräte', 'fischgraete'],
    correction: {
      diagnosis: 'Magnesium(Mg)-Mangel – intervenale Chlorose mit deutlich grünen Adern, bestätigt durch Farbangabe des Growers.',
      explanation: 'Der Grower bestätigt deutlich grüne Blattadern bei gelbem Gewebe dazwischen – das klassische Fischgräten-Muster eines Mg-Mangels. In Kokos häufig durch pH-Drift unter 5.8 oder fehlende CalMag-Supplementierung verursacht.',
      severity: 'hoch',
    },
  },
  {
    label: 'Violett / Purpur',
    keywords: ['violett', 'purpur', 'lila', 'purple', 'violet'],
    correction: {
      diagnosis: 'Phosphor(P)-Mangel – violette/purpurne Verfärbung, bestätigt durch Farbangabe des Growers.',
      explanation: 'Der Grower bestätigt violette/purpurne Verfärbungen. Dies deutet auf Phosphor-Mangel hin. P-Mangel zeigt sich typisch durch dunkelgrüne Blätter mit violettem Schimmer, purpurne Stängel/Blattstiele, und violette Blattränder. Kann auch durch Kälte (<15°C) oder Genetik verstärkt werden.',
      severity: 'hoch',
    },
  },
  {
    label: 'Braun / Trocken',
    keywords: ['braun', 'rostbraun', 'rostfarben', 'nekrose', 'nekrotisch', 'trocken', 'knusprig'],
    correction: {
      diagnosis: 'Kalium(K)-Mangel oder Nährstoffbrand – braune, trockene Nekrosen, bestätigt durch Farbangabe des Growers.',
      explanation: 'Der Grower bestätigt braune, trockene Verfärbungen (totes Gewebe). An den Blatträndern von außen nach innen wandernd deutet dies auf K-Mangel hin. Nur an den äußersten Blattspitzen = Nährstoffbrand (Überdüngung). Prüfe EC-Wert und pH.',
      severity: 'hoch',
    },
  },
  {
    label: 'Weiß / Bleich',
    keywords: ['weiß', 'weiss', 'bleich', 'gebleicht', 'albino'],
    correction: {
      diagnosis: 'Lichtbrand oder Eisen(Fe)-Mangel – gebleichte/weiße Blätter, bestätigt durch Farbangabe des Growers.',
      explanation: 'Der Grower bestätigt weiße/gebleichte Blattbereiche. An oberen/lampennahen Blättern = Lichtbrand (Lampe höher hängen oder dimmen). An neuen Blättern generell = Fe-Mangel (pH prüfen, oft >7.0). Beides erfordert schnelles Handeln.',
      severity: 'hoch',
    },
  },
  {
    label: 'Dunkelgrün',
    keywords: ['dunkelgrün', 'dunkelgruen', 'sattgrün', 'sattgruen', 'tiefgrün', 'tiefgruen'],
    correction: {
      diagnosis: 'Stickstoff(N)-Überschuss – unnatürlich dunkelgrüne Blätter, bestätigt durch Farbangabe des Growers.',
      explanation: 'Der Grower bestätigt unnatürlich dunkelgrüne Blätter. In Kombination mit nach unten gekrallten Blattspitzen ("Eagle Claw") = klassische N-Toxizität. Sofort Düngung reduzieren und mit reinem Wasser spülen.',
      severity: 'mittel',
    },
  },
  {
    label: 'Rot / Rötlich',
    keywords: ['rot', 'rötlich', 'roetlich', 'rötliche', 'roetliche'],
    correction: {
      diagnosis: 'Phosphor(P)-Mangel oder Kältestress – rötliche Verfärbungen, bestätigt durch Farbangabe des Growers.',
      explanation: 'Der Grower bestätigt rötliche Verfärbungen. Rote/rötliche Stängel und Blattteile deuten auf P-Mangel oder Kältestress (<15°C nachts) hin. Kann auch genetisch bedingt sein. Prüfe Nachttemperaturen und P-Versorgung.',
      severity: 'mittel',
    },
  },
  {
    label: 'Silbrig / Glänzend',
    keywords: ['silbrig', 'silber', 'glänzend', 'glaenzend', 'schimmernd'],
    correction: {
      diagnosis: 'Thripse-Befall – silbrige/glänzende Spuren auf Blättern, bestätigt durch Farbangabe des Growers.',
      explanation: 'Der Grower bestätigt silbrige/glänzende Verfärbungen. Dies sind typische Fraßspuren von Thripsen – die Schädlinge raspeln die obere Zellschicht ab, was silbrige Streifen hinterlässt. Oft begleitet von kleinen schwarzen Kotpunkten. Sofortige Behandlung mit Neem-Öl oder Raubmilben empfohlen.',
      severity: 'hoch',
    },
  },
];

function applyColorCorrection(color: typeof KNOWN_COLORS[number], currentResult: DiagnosisResult): DiagnosisResult {
  return {
    ...currentResult,
    primaryDiagnosis: color.correction.diagnosis,
    rootCauseAnalysis: color.correction.explanation + '\n\n(Ursprüngliche Diagnose: ' + currentResult.primaryDiagnosis + ')',
    severity: color.correction.severity,
    confidence: Math.max(currentResult.confidence, 0.80),
  };
}

export default function ResultsScreen() {
  const router = useRouter();
  const { result, setResult, questionnaire, imageUri, imageUris, optimizedImageUris, reset, selectedPlantId, isFollowUp } = useDiagnosis();
  const params = useLocalSearchParams<{ historyResult?: string; historyImage?: string; historyImages?: string; entryId?: string }>();
  const [sharing, setSharing] = useState(false);
  const [refineOpen, setRefineOpen] = useState(false);
  const [refineLoading, setRefineLoading] = useState(false);
  const [refined, setRefined] = useState(false);
  const [apiRefinedResult, setApiRefinedResult] = useState<DiagnosisResult | null>(null);
  const [phInput, setPhInput] = useState('');
  const [ecInput, setEcInput] = useState('');
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

  console.log('[LeafScan] Results - displayResult:', JSON.stringify(displayResult)?.substring(0, 300));
  console.log('[LeafScan] Results - context result:', JSON.stringify(result)?.substring(0, 300));

  if (!displayResult) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>Keine Diagnose vorhanden.</Text>
        <Button title="Zurück" onPress={() => router.back()} />
      </View>
    );
  }

  const startNew = () => {
    reset();
    router.replace('/');
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

  const handleRefine = async () => {
    if (!phInput && !ecInput) {
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.alert('Bitte gib mindestens einen pH- oder EC-Wert ein.');
      } else {
        Alert.alert('Fehlende Daten', 'Bitte gib mindestens einen pH- oder EC-Wert ein.');
      }
      return;
    }
    // Validate pH/EC ranges before sending to API
    if (phInput) {
      const ph = parseFloat(phInput.replace(',', '.'));
      if (isNaN(ph) || ph < 0 || ph > 14) {
        const msg = 'Bitte gib einen gültigen pH-Wert ein (0–14).';
        if (Platform.OS === 'web' && typeof window !== 'undefined') { window.alert(msg); } else { Alert.alert('Ungültiger Wert', msg); }
        return;
      }
    }
    if (ecInput) {
      const ec = parseFloat(ecInput.replace(',', '.'));
      if (isNaN(ec) || ec < 0 || ec > 15) {
        const msg = 'Bitte gib einen gültigen EC-Wert ein (0–15).';
        if (Platform.OS === 'web' && typeof window !== 'undefined') { window.alert(msg); } else { Alert.alert('Ungültiger Wert', msg); }
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
      );
      setApiRefinedResult(refined);
      setRefinedResult(refined);
      setRefined(true);
      setRefineOpen(false);
    } catch (err: any) {
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.alert(err.message || 'Verfeinerung fehlgeschlagen.');
      } else {
        Alert.alert('Fehler', err.message || 'Verfeinerung fehlgeschlagen.');
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
          window.alert(err.message || 'Teilen fehlgeschlagen.');
        } else {
          Alert.alert('Fehler', err.message || 'Teilen fehlgeschlagen.');
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
        <Text style={styles.shareText}>Diagnose teilen</Text>
      </TouchableOpacity>

      <DiagnosisCard result={displayResult} />

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
        <View
          style={styles.refineCard}
          onLayout={(e) => { refineYRef.current = e.nativeEvent.layout.y; }}
        >
          <TouchableOpacity
            onPress={() => setRefineOpen(!refineOpen)}
            style={styles.refineHeader}
            activeOpacity={0.7}
          >
            <View style={styles.refineHeaderLeft}>
              <Ionicons name="flask-outline" size={18} color={colors.accent} />
              <Text style={styles.refineTitle}>Diagnose verfeinern</Text>
            </View>
            <Ionicons
              name={refineOpen ? 'chevron-up' : 'chevron-down'}
              size={18}
              color={colors.textMuted}
            />
          </TouchableOpacity>

          {refineOpen && (
            <View style={styles.refineBody}>
              <Text style={styles.refineHint}>
                Farbe korrigieren oder pH/EC nachtragen für eine präzisere Diagnose.
              </Text>

              {/* Color correction field */}
              <View style={[styles.refineInputGroup, { zIndex: 10 }]}>
                <Text style={styles.refineLabel}>Blattfarbe</Text>
                {selectedColor ? (
                  <View style={styles.colorChipRow}>
                    <View style={styles.colorChip}>
                      <Text style={styles.colorChipText}>{selectedColor.label}</Text>
                      <TouchableOpacity onPress={handleColorRemove} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                        <Ionicons name="close-circle" size={18} color={colors.textMuted} />
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : (
                  <View style={{ position: 'relative' }}>
                    <TextInput
                      style={styles.refineInput}
                      placeholder="z.B. violett, braun, gelb..."
                      placeholderTextColor={colors.textMuted}
                      value={colorInput}
                      onChangeText={setColorInput}
                      autoCapitalize="none"
                      onFocus={() => {
                        setTimeout(() => {
                          scrollRef.current?.scrollTo({ y: refineYRef.current, animated: true });
                        }, 300);
                      }}
                    />
                    {colorSuggestions.length > 0 && (
                      <View style={styles.colorSuggestions}>
                        {colorSuggestions.map((c) => (
                          <TouchableOpacity
                            key={c.label}
                            onPress={() => handleColorSelect(c)}
                            style={styles.colorSuggestionItem}
                            activeOpacity={0.7}
                          >
                            <Text style={styles.colorSuggestionText}>{c.label}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}
                  </View>
                )}
              </View>

              <View style={[styles.refineInputRow, { zIndex: 1 }]}>
                <View style={styles.refineInputGroup}>
                  <Text style={styles.refineLabel}>pH-Wert</Text>
                  <TextInput
                    style={styles.refineInput}
                    placeholder="z.B. 5.9"
                    placeholderTextColor={colors.textMuted}
                    keyboardType="decimal-pad"
                    value={phInput}
                    onChangeText={setPhInput}
                    onFocus={() => {
                      setTimeout(() => {
                        scrollRef.current?.scrollTo({ y: refineYRef.current, animated: true });
                      }, 300);
                    }}
                  />
                </View>
                <View style={styles.refineInputGroup}>
                  <Text style={styles.refineLabel}>EC / PPM</Text>
                  <TextInput
                    style={styles.refineInput}
                    placeholder="z.B. 1.2"
                    placeholderTextColor={colors.textMuted}
                    keyboardType="decimal-pad"
                    value={ecInput}
                    onChangeText={setEcInput}
                    onFocus={() => {
                      setTimeout(() => {
                        scrollRef.current?.scrollTo({ y: refineYRef.current, animated: true });
                      }, 300);
                    }}
                  />
                </View>
              </View>

              {/* Fertilizer selector */}
              <View style={styles.refineInputGroup}>
                <Text style={styles.refineLabel}>Dünger{questionnaire.fertilizerType ? ' (aus Fragebogen)' : ' (optional)'}</Text>
                <TouchableOpacity
                  onPress={() => {
                    setFertilizerPickerOpen(!fertilizerPickerOpen);
                    if (!fertilizerPickerOpen) setFertilizerSearch('');
                  }}
                  style={styles.refineSelect}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.refineSelectText, !fertilizerInput && { color: colors.textMuted }]}>
                    {fertilizerInput || 'Dünger suchen & auswählen...'}
                  </Text>
                  <Ionicons
                    name={fertilizerPickerOpen ? 'chevron-up' : 'chevron-down'}
                    size={16}
                    color={colors.textMuted}
                  />
                </TouchableOpacity>
                {fertilizerPickerOpen && (
                  <View style={styles.fertilizerList}>
                    <TextInput
                      style={styles.fertilizerSearchInput}
                      placeholder="Dünger suchen..."
                      placeholderTextColor={colors.textMuted}
                      value={fertilizerSearch}
                      onChangeText={setFertilizerSearch}
                      autoFocus
                      onFocus={() => {
                        setTimeout(() => {
                          scrollRef.current?.scrollTo({ y: refineYRef.current + 100, animated: true });
                        }, 300);
                      }}
                    />
                    <ScrollView nestedScrollEnabled style={styles.fertilizerScroll}>
                      {getFertilizerNames()
                        .filter((name) => name.toLowerCase().includes(fertilizerSearch.toLowerCase()))
                        .map((name) => (
                        <TouchableOpacity
                          key={name}
                          onPress={() => {
                            setFertilizerInput(name === 'Anderer Dünger' || name === 'Kein Dünger / nur Wasser' ? null : name);
                            setFertilizerPickerOpen(false);
                            setFertilizerSearch('');
                          }}
                          style={[
                            styles.fertilizerOption,
                            fertilizerInput === name && styles.fertilizerOptionSelected,
                          ]}
                          activeOpacity={0.7}
                        >
                          <Text style={[
                            styles.fertilizerOptionText,
                            fertilizerInput === name && styles.fertilizerOptionTextSelected,
                          ]}>
                            {name}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                )}
              </View>

              <TouchableOpacity
                onPress={handleRefine}
                style={[styles.refineButton, refineLoading && styles.refineButtonDisabled]}
                activeOpacity={0.7}
                disabled={refineLoading}
              >
                {refineLoading ? (
                  <ActivityIndicator size="small" color={colors.textOnAccent} />
                ) : (
                  <>
                    <Ionicons name="refresh-outline" size={16} color={colors.textOnAccent} />
                    <Text style={styles.refineButtonText}>Analyse verfeinern</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}

      {(refined || colorCorrected) && (
        <View style={styles.refinedBadge}>
          <Ionicons name="checkmark-circle" size={16} color={colors.accent} />
          <Text style={styles.refinedBadgeText}>
            {colorCorrected && !refined
              ? 'Diagnose angepasst basierend auf Farbangabe'
              : refined && colorCorrected
                ? 'Diagnose verfeinert mit Farbangabe + pH/EC-Daten'
                : 'Diagnose verfeinert mit pH/EC-Daten'}
          </Text>
        </View>
      )}

      {displayResult.followUpDays && !isFromHistory && (
        <View style={styles.followUpInfo}>
          <Ionicons name="notifications-outline" size={16} color={colors.accent} />
          <Text style={styles.followUpInfoText}>
            Follow-up in {displayResult.followUpDays} Tagen – du wirst erinnert
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
            <Text style={styles.libraryLinkText}>Mehr über {match.name} in der Bibliothek</Text>
            <Ionicons name="chevron-forward" size={14} color={colors.textMuted} />
          </TouchableOpacity>
        );
      })()}

      {/* Feedback */}
      {!isFromHistory && (
        <View style={styles.feedbackRow}>
          <Text style={styles.feedbackLabel}>War die Diagnose hilfreich?</Text>
          <View style={styles.feedbackButtons}>
            <TouchableOpacity
              style={[styles.feedbackBtn, feedback === 'positive' && styles.feedbackBtnActive]}
              onPress={() => {
                setFeedback('positive');
                if (params.entryId) updateEntry(params.entryId, { feedback: 'positive' });
              }}
              activeOpacity={0.7}
            >
              <Ionicons name={feedback === 'positive' ? 'thumbs-up' : 'thumbs-up-outline'} size={18} color={feedback === 'positive' ? colors.accent : colors.textMuted} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.feedbackBtn, feedback === 'negative' && styles.feedbackBtnNegative]}
              onPress={() => {
                setFeedback('negative');
                if (params.entryId) updateEntry(params.entryId, { feedback: 'negative' });
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
          Diese Diagnose wurde durch KI erstellt und kann fehlerhaft sein.
          Kein Ersatz für professionelle Beratung. Nutzung auf eigene Verantwortung.
        </Text>
      </View>

      {selectedPlantId && !isFromHistory ? (
        <View style={styles.btnRow}>
          <Button
            title="Zur Pflanze"
            onPress={() => {
              const pid = selectedPlantId;
              reset();
              router.replace({ pathname: '/plant-detail', params: { plantId: pid } });
            }}
            style={styles.newBtn}
          />
          <Button title="Neue Diagnose" onPress={startNew} variant="secondary" style={styles.newBtn} />
        </View>
      ) : (
        <Button title="Neue Diagnose" onPress={startNew} style={styles.newBtn} />
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
  refineCard: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.borderAccent,
    marginTop: 16,
  },
  refineHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
  },
  refineHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  refineTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.accent,
  },
  refineBody: {
    paddingHorizontal: 14,
    paddingBottom: 14,
    gap: 12,
  },
  refineHint: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  refineInputRow: {
    flexDirection: 'row',
    gap: 12,
  },
  refineInputGroup: {
    flex: 1,
    gap: 4,
  },
  refineLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  refineInput: {
    backgroundColor: colors.backgroundElevated,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    fontSize: 16,
    color: colors.text,
  },
  refineButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.accent,
    borderRadius: 10,
    paddingVertical: 12,
    marginTop: 4,
  },
  refineButtonDisabled: {
    opacity: 0.6,
  },
  refineButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textOnAccent,
  },
  refineSelect: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.backgroundElevated,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
  },
  refineSelectText: {
    fontSize: 14,
    color: colors.text,
    flex: 1,
  },
  fertilizerSearchInput: {
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingVertical: 10,
    paddingHorizontal: 14,
    fontSize: 14,
    color: colors.text,
  },
  fertilizerList: {
    backgroundColor: colors.backgroundElevated,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: 4,
    overflow: 'hidden',
  },
  fertilizerScroll: {
    maxHeight: 180,
  },
  fertilizerOption: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  fertilizerOptionSelected: {
    backgroundColor: colors.accentGlow,
  },
  fertilizerOptionText: {
    fontSize: 14,
    color: colors.text,
  },
  fertilizerOptionTextSelected: {
    color: colors.accent,
    fontWeight: '600',
  },
  colorChipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  colorChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.accentGlow,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.accent,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  colorChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.accent,
  },
  colorSuggestions: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: colors.backgroundElevated,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.borderAccent,
    marginTop: 4,
    overflow: 'hidden',
    zIndex: 20,
    elevation: 10,
  },
  colorSuggestionItem: {
    paddingVertical: 11,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  colorSuggestionText: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '500',
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
});
