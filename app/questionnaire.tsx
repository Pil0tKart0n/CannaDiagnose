import React, { useState, useMemo } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
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

  // Clamp index
  const safeIndex = Math.min(currentIndex, activeQuestions.length - 1);
  const question = activeQuestions[safeIndex];

  if (!question) return null;

  const currentSection = question.section;
  const value = questionnaire[question.id];

  const handleChange = (newValue: any) => {
    setQuestionnaire({ ...questionnaire, [question.id]: newValue });
  };

  const goNext = () => {
    if (safeIndex < activeQuestions.length - 1) {
      setCurrentIndex(safeIndex + 1);
    } else {
      router.push('/analyzing');
    }
  };

  const goBack = () => {
    if (safeIndex > 0) {
      setCurrentIndex(safeIndex - 1);
    }
  };

  const isLast = safeIndex === activeQuestions.length - 1;
  const isFirst = safeIndex === 0;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ProgressBar
        current={safeIndex + 1}
        total={activeQuestions.length}
        sectionName={currentSection}
      />

      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <QuestionCard question={question} value={value} onChange={handleChange} />
      </ScrollView>

      <View style={styles.navButtons}>
        {!isFirst ? (
          <Button title="Zurück" onPress={goBack} variant="outline" style={styles.navBtn} />
        ) : (
          <View style={styles.navBtn} />
        )}
        <Button
          title={isLast ? 'Analyse starten' : 'Weiter'}
          onPress={goNext}
          style={styles.navBtn}
        />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    paddingVertical: 20,
  },
  navButtons: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
    backgroundColor: colors.cardDark,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  navBtn: {
    flex: 1,
  },
});
