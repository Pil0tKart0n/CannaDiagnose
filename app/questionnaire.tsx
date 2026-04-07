import React, { useState, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import QuestionCard from '../components/QuestionCard';
import ProgressBar from '../components/ProgressBar';
import Button from '../components/Button';
import { questions } from '../constants/questions';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../constants/colors';
import { webContentContainer } from '../constants/webStyles';
import { useDiagnosis } from './_layout';
import { t, getLang } from '../services/i18n';
import { sectionTextsEn } from '../constants/questions-en';

export default function QuestionnaireScreen() {
  const router = useRouter();
  const { questionnaire, setQuestionnaire } = useDiagnosis();
  const [currentIndex, setCurrentIndex] = useState(0);

  // Filter questions based on conditional rules (supports AND)
  const activeQuestions = useMemo(() => {
    return questions.filter((q) => {
      if (!q.conditional) return true;
      const { field, values, and: andRule } = q.conditional;
      const currentValue = questionnaire[field];
      if (!currentValue) return false;
      const match = Array.isArray(currentValue)
        ? currentValue.some((v) => values.includes(v))
        : values.includes(currentValue as string);
      if (!match) return false;
      // Check AND condition if present
      if (andRule) {
        const andValue = questionnaire[andRule.field];
        if (!andValue) return false;
        return Array.isArray(andValue)
          ? andValue.some((v) => andRule.values.includes(v))
          : andRule.values.includes(andValue as string);
      }
      return true;
    });
  }, [questionnaire]);

  const safeIndex = Math.min(currentIndex, activeQuestions.length - 1);
  const question = activeQuestions[safeIndex];
  const isLast = safeIndex === activeQuestions.length - 1;

  const saveAnswers = useCallback((data: typeof questionnaire) => {
    AsyncStorage.setItem('leafscan_last_questionnaire', JSON.stringify(data)).catch(() => {});
  }, []);

  const goNext = useCallback(() => {
    if (isLast) {
      saveAnswers(questionnaire);
      router.push('/analyzing');
    } else {
      setCurrentIndex(safeIndex + 1);
    }
  }, [safeIndex, isLast, questionnaire, saveAnswers, router]);

  if (!question) return null;

  const currentSection = getLang() === 'en' ? sectionTextsEn[question.section] || question.section : question.section;
  const value = questionnaire[question.id];

  const goBack = () => {
    if (safeIndex > 0) {
      setCurrentIndex(safeIndex - 1);
    } else {
      router.back();
    }
  };

  const handleChange = (newValue: any) => {
    const updated = { ...questionnaire, [question.id]: newValue };
    // Reset age when phase or light changes (different options per combination)
    if (question.id === 'growPhase' || question.id === 'lightType') {
      updated.plantAgeWeeks = null;
    }
    // Reset fertilizer/living soil fields when substrate changes
    if (question.id === 'substrateType') {
      if (newValue === 'Living Soil') {
        updated.fertilizerType = null;
        updated.fertilizerCategory = null;
        updated.organicMethod = null;
        updated.organicTea = null;
        updated.organicMycorrhiza = null;
        updated.organicPotSize = null;
        updated.organicWaterType = null;
      } else {
        updated.livingsoilAmendments = [];
        updated.livingsoilTea = null;
        updated.livingsoilMulch = null;
      }
    }
    // Auto-detect fertilizer category when fertilizer is selected
    if (question.id === 'fertilizerType') {
      const { FERTILIZER_PROFILES } = require('../constants/fertilizers');
      const profile = FERTILIZER_PROFILES[newValue];
      updated.fertilizerCategory = profile?.type || null;
      // Reset organic fields when switching away from organic
      if (profile?.type !== 'organic' && profile?.type !== 'hybrid') {
        updated.organicMethod = null;
        updated.organicTea = null;
        updated.organicMycorrhiza = null;
        updated.organicPotSize = null;
        updated.organicWaterType = null;
      }
    }
    setQuestionnaire(updated);

    // Don't auto-advance for substrate (user might want to add perlite)
    if (question.id === 'substrateType') return;

    if (question.type === 'select' || question.type === 'searchable-select') {
      const nextQuestions = questions.filter((q) => {
        if (!q.conditional) return true;
        const { field, values, and: andRule } = q.conditional;
        const val = updated[field];
        if (!val) return false;
        const match = Array.isArray(val) ? val.some((v) => values.includes(v)) : values.includes(val as string);
        if (!match) return false;
        if (andRule) {
          const andVal = updated[andRule.field];
          if (!andVal) return false;
          return Array.isArray(andVal)
            ? andVal.some((v) => andRule.values.includes(v))
            : andRule.values.includes(andVal as string);
        }
        return true;
      });
      const nextIsLast = safeIndex >= nextQuestions.length - 1;

      setTimeout(() => {
        if (nextIsLast) {
          saveAnswers(updated);
          router.push('/analyzing');
        } else {
          setCurrentIndex(safeIndex + 1);
        }
      }, 100);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {/* Top bar with back + progress */}
        <View style={styles.topBar}>
          <TouchableOpacity onPress={goBack} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color={colors.text} />
          </TouchableOpacity>
          <View style={styles.progressWrap}>
            <ProgressBar current={safeIndex + 1} total={activeQuestions.length} sectionName={currentSection} />
          </View>
        </View>

        {/* Centered question card */}
        <View style={styles.centerArea}>
          <QuestionCard
            question={question}
            value={value}
            onChange={handleChange}
            perliteAdded={questionnaire.perliteAdded}
            perlitePercent={questionnaire.perlitePercent}
            onPerliteToggle={(added) => setQuestionnaire({ ...questionnaire, perliteAdded: added })}
            onPerlitePercentChange={(pct) => setQuestionnaire({ ...questionnaire, perlitePercent: pct })}
          />
        </View>

        {/* Show bottom button for multi-select, text/number, and substrate (needs confirm for perlite) */}
        {(question.type !== 'select' && question.type !== 'searchable-select') || question.id === 'substrateType' ? (
          <View style={styles.bottomBar}>
            <Button
              title={isLast ? t('questionnaire.startAnalysis') : t('questionnaire.next')}
              onPress={goNext}
              disabled={question.id === 'substrateType' && !value}
            />
          </View>
        ) : (
          <View style={styles.bottomSpacer} />
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    ...webContentContainer,
  },
  flex: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 12,
    paddingTop: 4,
  },
  backBtn: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backArrow: {
    fontSize: 32,
    fontWeight: '300',
    color: colors.accent,
    marginTop: -2,
  },
  progressWrap: {
    flex: 1,
  },
  centerArea: {
    flex: 1,
    justifyContent: 'center',
  },
  bottomBar: {
    padding: 20,
    backgroundColor: colors.cardDark,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  bottomSpacer: {
    height: 40,
  },
});
