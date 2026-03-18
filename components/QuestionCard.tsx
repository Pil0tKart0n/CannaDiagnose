import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Platform,
  ScrollView,
  Animated,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Question } from '../types';
import { colors } from '../constants/colors';

const PERLITE_TIP_KEY = 'perlite_tip_shown';

interface QuestionCardProps {
  question: Question;
  value: any;
  onChange: (value: any) => void;
  perliteAdded?: boolean;
  perlitePercent?: string | null;
  onPerliteToggle?: (added: boolean) => void;
  onPerlitePercentChange?: (percent: string | null) => void;
}

function SearchableSelect({ question, value, onChange }: { question: Question; value: any; onChange: (value: any) => void }) {
  const [search, setSearch] = useState('');
  const options = question.options || [];

  const filtered = useMemo(() => {
    if (!search.trim()) return options;
    const q = search.toLowerCase();
    return options.filter((opt) => opt.toLowerCase().includes(q));
  }, [search, options]);

  return (
    <View style={styles.searchableContainer}>
      <TextInput
        style={styles.searchInput}
        placeholder="Suchen..."
        placeholderTextColor={colors.textMuted}
        value={search}
        onChangeText={setSearch}
        autoCorrect={false}
      />
      <ScrollView style={styles.searchableList} nestedScrollEnabled showsVerticalScrollIndicator={false}>
        {filtered.map((opt) => {
          const selected = value === opt;
          return (
            <TouchableOpacity
              key={opt}
              style={[styles.searchableItem, selected && styles.searchableItemSelected]}
              onPress={() => onChange(opt)}
              activeOpacity={0.7}
            >
              <Text style={[styles.searchableItemText, selected && styles.optionTextSelected]}>
                {opt}
              </Text>
              {selected && <Text style={styles.checkmark}>✓</Text>}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

export default function QuestionCard({ question, value, onChange, perliteAdded, perlitePercent, onPerliteToggle, onPerlitePercentChange }: QuestionCardProps) {
  const [showPerliteTip, setShowPerliteTip] = useState(false);
  const tipOpacity = useState(new Animated.Value(0))[0];

  useEffect(() => {
    if (question.id === 'substrateType' && value && onPerliteToggle && !perliteAdded) {
      AsyncStorage.getItem(PERLITE_TIP_KEY).then((shown) => {
        if (!shown) {
          setShowPerliteTip(true);
          Animated.timing(tipOpacity, { toValue: 1, duration: 400, useNativeDriver: true }).start();
          AsyncStorage.setItem(PERLITE_TIP_KEY, 'true');
        }
      });
    }
  }, [value]);

  const dismissPerliteTip = () => {
    Animated.timing(tipOpacity, { toValue: 0, duration: 300, useNativeDriver: true }).start(() => {
      setShowPerliteTip(false);
    });
  };
  const renderSelect = () => (
    <View style={styles.optionsGrid}>
      {question.options?.map((opt) => {
        const selected = value === opt;
        return (
          <TouchableOpacity
            key={opt}
            style={[styles.option, selected && styles.optionSelected]}
            onPress={() => onChange(opt)}
          >
            <Text style={[styles.optionText, selected && styles.optionTextSelected]}>
              {opt}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );

  const renderMultiSelect = () => {
    const selectedArr: string[] = value || [];
    return (
      <View style={styles.optionsGrid}>
        {question.options?.map((opt) => {
          const selected = selectedArr.includes(opt);
          return (
            <TouchableOpacity
              key={opt}
              style={[styles.option, selected && styles.optionSelected]}
              onPress={() => {
                if (selected) {
                  onChange(selectedArr.filter((v: string) => v !== opt));
                } else {
                  onChange([...selectedArr, opt]);
                }
              }}
            >
              <Text style={[styles.optionText, selected && styles.optionTextSelected]}>
                {opt}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    );
  };

  const renderNumber = () => (
    <View style={styles.numberRow}>
      <TextInput
        style={styles.numberInput}
        value={value != null ? String(value) : ''}
        onChangeText={(t) => {
          onChange(t.trim() || null);
        }}
        keyboardType="decimal-pad"
        placeholder={question.placeholder}
        placeholderTextColor={colors.textMuted}
      />
      {question.unit && <Text style={styles.unit}>{question.unit}</Text>}
    </View>
  );

  const renderText = () => (
    <TextInput
      style={styles.textInput}
      value={value || ''}
      onChangeText={onChange}
      placeholder={question.placeholder}
      placeholderTextColor={colors.textMuted}
      multiline
    />
  );

  const renderPerliteAddon = () => {
    if (question.id !== 'substrateType' || !value || !onPerliteToggle) return null;
    return (
      <View style={styles.perliteContainer}>
        <TouchableOpacity
          style={[styles.perliteToggle, perliteAdded && styles.perliteToggleActive]}
          onPress={() => {
            onPerliteToggle(!perliteAdded);
            if (perliteAdded && onPerlitePercentChange) {
              onPerlitePercentChange(null);
            }
            if (showPerliteTip) dismissPerliteTip();
          }}
        >
          <Text style={[styles.perliteToggleText, perliteAdded && styles.optionTextSelected]}>
            + Perlite
          </Text>
        </TouchableOpacity>
        {showPerliteTip && (
          <Animated.View style={[styles.perliteTip, { opacity: tipOpacity }]}>
            <View style={styles.perliteTipArrow} />
            <TouchableOpacity onPress={dismissPerliteTip} activeOpacity={0.8}>
              <Text style={styles.perliteTipText}>
                Wenn du Perlite in deinem Substrat hast, kannst du sie hier hinzufügen
              </Text>
            </TouchableOpacity>
          </Animated.View>
        )}
        {perliteAdded && onPerlitePercentChange && (
          <View style={styles.perlitePercentRow}>
            <Text style={styles.perliteLabel}>Anteil:</Text>
            {['10%', '20%', '30%', '40%', '50%'].map((pct) => (
              <TouchableOpacity
                key={pct}
                style={[styles.perliteChip, perlitePercent === pct && styles.perliteChipActive]}
                onPress={() => onPerlitePercentChange(perlitePercent === pct ? null : pct)}
              >
                <Text style={[styles.perliteChipText, perlitePercent === pct && styles.optionTextSelected]}>
                  {pct}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={styles.card}>
      <Text style={styles.question}>{question.question}</Text>
      {question.hint && <Text style={styles.hint}>{question.hint}</Text>}
      {question.type === 'select' && renderSelect()}
      {renderPerliteAddon()}
      {question.type === 'multi-select' && renderMultiSelect()}
      {question.type === 'searchable-select' && <SearchableSelect question={question} value={value} onChange={onChange} />}
      {question.type === 'number' && renderNumber()}
      {question.type === 'text' && renderText()}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.cardDark,
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 20,
    borderWidth: 1,
    borderColor: colors.border,
    ...Platform.select({
      ios: {
        shadowColor: colors.shadowDark,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 1,
        shadowRadius: 12,
      },
      android: { elevation: 6 },
      web: {
        boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
      },
    }),
  },
  question: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 6,
  },
  hint: {
    fontSize: 13,
    color: colors.textMuted,
    marginBottom: 12,
  },
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 14,
  },
  option: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.cardMid,
  },
  optionSelected: {
    borderColor: colors.accent,
    backgroundColor: colors.accentSubtle,
  },
  optionText: {
    fontSize: 15,
    color: colors.textSecondary,
  },
  optionTextSelected: {
    color: colors.accent,
    fontWeight: '600',
  },
  numberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 14,
    gap: 8,
  },
  numberInput: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: colors.text,
    backgroundColor: colors.cardMid,
  },
  unit: {
    fontSize: 16,
    color: colors.textMuted,
    fontWeight: '500',
  },
  textInput: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: colors.text,
    backgroundColor: colors.cardMid,
    minHeight: 60,
    marginTop: 14,
    textAlignVertical: 'top',
  },

  // Searchable select
  searchableContainer: {
    marginTop: 14,
  },
  searchInput: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 12,
    fontSize: 15,
    color: colors.text,
    backgroundColor: colors.cardMid,
    marginBottom: 10,
  },
  searchableList: {
    maxHeight: 220,
  },
  searchableItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 10,
    marginBottom: 4,
  },
  searchableItemSelected: {
    backgroundColor: colors.accentSubtle,
  },
  searchableItemText: {
    flex: 1,
    fontSize: 15,
    color: colors.textSecondary,
  },
  checkmark: {
    fontSize: 16,
    color: colors.accent,
    fontWeight: '700',
  },

  // Perlite addon
  perliteContainer: {
    marginTop: 16,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  perliteToggle: {
    alignSelf: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.cardMid,
  },
  perliteToggleActive: {
    borderColor: colors.accent,
    backgroundColor: colors.accentSubtle,
  },
  perliteToggleText: {
    fontSize: 15,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  perlitePercentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  perliteLabel: {
    fontSize: 14,
    color: colors.textMuted,
    marginRight: 4,
  },
  perliteChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.cardMid,
  },
  perliteChipActive: {
    borderColor: colors.accent,
    backgroundColor: colors.accentSubtle,
  },
  perliteChipText: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  perliteTip: {
    marginTop: 10,
    backgroundColor: colors.accent,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    alignSelf: 'flex-start',
    maxWidth: '85%',
  },
  perliteTipArrow: {
    position: 'absolute',
    top: -6,
    left: 20,
    width: 0,
    height: 0,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderBottomWidth: 6,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: colors.accent,
  },
  perliteTipText: {
    fontSize: 13,
    color: '#0A0E0D',
    fontWeight: '500',
    lineHeight: 18,
  },
});
