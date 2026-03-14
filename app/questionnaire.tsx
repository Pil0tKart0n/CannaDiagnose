import React, { useState } from 'react';
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

  const question = questions[currentIndex];
  const currentSection = question.section;

  const value = questionnaire[question.id];

  const handleChange = (newValue: any) => {
    setQuestionnaire({ ...questionnaire, [question.id]: newValue });
  };

  const goNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      router.push('/analyzing');
    }
  };

  const goBack = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const isLast = currentIndex === questions.length - 1;
  const isFirst = currentIndex === 0;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ProgressBar
        current={currentIndex + 1}
        total={questions.length}
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
