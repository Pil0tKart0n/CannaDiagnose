import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import QuestionCard from '../components/QuestionCard';
import ProgressBar from '../components/ProgressBar';
import Button from '../components/Button';
import { questions } from '../constants/questions';
import { colors } from '../constants/colors';
import { useDiagnosis } from './_layout';

export default function QuestionnaireScreen() {
  const router = useRouter();
  const { questionnaire, setQuestionnaire } = useDiagnosis();
  const [currentIndex, setCurrentIndex] = useState(0);

  // Filter questions based on conditional rules
  const activeQuestions = useMemo(() => {
    return questions.filter((q) => {
      if (!q.conditional) return true;
      const { field, values } = q.conditional;
      const currentValue = questionnaire[field];
      if (!currentValue) return false;
      if (Array.isArray(currentValue)) {
        return currentValue.some((v) => values.includes(v));
      }
      return values.includes(currentValue as string);
    });
  }, [questionnaire]);

  const safeIndex = Math.min(currentIndex, activeQuestions.length - 1);
  const question = activeQuestions[safeIndex];

  if (!question) return null;

  const currentSection = question.section;
  const value = questionnaire[question.id];
  const isLast = safeIndex === activeQuestions.length - 1;
  const isFirst = safeIndex === 0;

  const goNext = useCallback(() => {
    if (isLast) {
      router.push('/analyzing');
    } else {
      setCurrentIndex(safeIndex + 1);
    }
  }, [safeIndex, isLast]);

  const goBack = () => {
    if (safeIndex > 0) {
      setCurrentIndex(safeIndex - 1);
    } else {
      router.back();
    }
  };

  const handleChange = (newValue: any) => {
    const updated = { ...questionnaire, [question.id]: newValue };
    setQuestionnaire(updated);

    // Auto-advance for single select (not multi-select)
    if (question.type === 'select') {
      setTimeout(() => {
        if (isLast) {
          router.push('/analyzing');
        } else {
          setCurrentIndex((prev) => Math.min(prev + 1, activeQuestions.length - 1));
        }
      }, 300);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Top bar with back + progress */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={goBack} style={styles.backBtn}>
          <Text style={styles.backArrow}>‹</Text>
        </TouchableOpacity>
        <View style={styles.progressWrap}>
          <ProgressBar
            current={safeIndex + 1}
            total={activeQuestions.length}
            sectionName={currentSection}
          />
        </View>
      </View>

      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <QuestionCard question={question} value={value} onChange={handleChange} />
      </ScrollView>

      {/* Only show bottom button for multi-select and text/number inputs */}
      {question.type !== 'select' && (
        <View style={styles.bottomBar}>
          <Button
            title={isLast ? 'Analyse starten' : 'Weiter'}
            onPress={goNext}
          />
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 12,
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
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    paddingVertical: 16,
  },
  bottomBar: {
    padding: 20,
    backgroundColor: colors.cardDark,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
});
