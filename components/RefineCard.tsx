import React from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../constants/colors';
import { KNOWN_COLORS, ColorCorrection } from '../constants/colorCorrections';
import { getFertilizerNames } from '../constants/fertilizers';
import { t } from '../services/i18n';

interface RefineCardProps {
  refineOpen: boolean;
  onToggleOpen: () => void;
  refineLoading: boolean;
  onRefine: () => void;
  // pH / EC / soil temp
  phInput: string;
  onPhChange: (val: string) => void;
  ecInput: string;
  onEcChange: (val: string) => void;
  soilTempInput: string;
  onSoilTempChange: (val: string) => void;
  // Fertilizer
  fertilizerInput: string | null;
  fertilizerPickerOpen: boolean;
  onFertilizerPickerToggle: () => void;
  fertilizerSearch: string;
  onFertilizerSearchChange: (val: string) => void;
  onFertilizerSelect: (name: string | null) => void;
  // Color
  colorInput: string;
  onColorInputChange: (val: string) => void;
  selectedColor: ColorCorrection | null;
  colorSuggestions: ColorCorrection[];
  onColorSelect: (color: ColorCorrection) => void;
  onColorRemove: () => void;
  // Questionnaire context
  substrateType: string | null;
  isLivingSoil: boolean;
  isOrganic: boolean;
  hasFertilizerFromQuestionnaire: boolean;
  // Scroll helpers
  onInputFocus?: (offset?: number) => void;
}

export default function RefineCard({
  refineOpen,
  onToggleOpen,
  refineLoading,
  onRefine,
  phInput,
  onPhChange,
  ecInput,
  onEcChange,
  soilTempInput,
  onSoilTempChange,
  fertilizerInput,
  fertilizerPickerOpen,
  onFertilizerPickerToggle,
  fertilizerSearch,
  onFertilizerSearchChange,
  onFertilizerSelect,
  colorInput,
  onColorInputChange,
  selectedColor,
  colorSuggestions,
  onColorSelect,
  onColorRemove,
  substrateType,
  isLivingSoil,
  isOrganic,
  hasFertilizerFromQuestionnaire,
  onInputFocus,
}: RefineCardProps) {
  return (
    <View style={styles.refineCard}>
      <TouchableOpacity
        onPress={onToggleOpen}
        style={styles.refineHeader}
        activeOpacity={0.7}
      >
        <View style={styles.refineHeaderLeft}>
          <Ionicons name="flask-outline" size={18} color={colors.accent} />
          <Text style={styles.refineTitle}>{t('results.refineTitle')}</Text>
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
            {substrateType === 'Living Soil'
              ? t('results.refineHintLivingSoil')
              : t('results.refineHintDefault')}
          </Text>

          {/* Color correction field */}
          <View style={[styles.refineInputGroup, { zIndex: 10 }]}>
            <Text style={styles.refineLabel}>{t('results.leafColor')}</Text>
            {selectedColor ? (
              <View style={styles.colorChipRow}>
                <View style={styles.colorChip}>
                  <Text style={styles.colorChipText}>{selectedColor.label}</Text>
                  <TouchableOpacity onPress={onColorRemove} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Ionicons name="close-circle" size={18} color={colors.textMuted} />
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <View style={{ position: 'relative' }}>
                <TextInput
                  style={styles.refineInput}
                  placeholder={t('results.colorPlaceholder')}
                  placeholderTextColor={colors.textMuted}
                  value={colorInput}
                  onChangeText={onColorInputChange}
                  autoCapitalize="none"
                  onFocus={() => onInputFocus?.()}
                />
                {colorSuggestions.length > 0 && (
                  <View style={styles.colorSuggestions}>
                    {colorSuggestions.map((c) => (
                      <TouchableOpacity
                        key={c.label}
                        onPress={() => onColorSelect(c)}
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

          {/* pH + EC/Soil temp row */}
          <View style={[styles.refineInputRow, { zIndex: 1 }]}>
            <View style={styles.refineInputGroup}>
              <Text style={styles.refineLabel}>{t('results.phValue')}</Text>
              <TextInput
                style={styles.refineInput}
                placeholder="z.B. 6.5"
                placeholderTextColor={colors.textMuted}
                keyboardType="decimal-pad"
                value={phInput}
                onChangeText={onPhChange}
                onFocus={() => onInputFocus?.()}
              />
            </View>
            {(isLivingSoil || isOrganic) ? (
              <View style={styles.refineInputGroup}>
                <Text style={styles.refineLabel}>{t('results.soilTemp')}</Text>
                <TextInput
                  style={styles.refineInput}
                  placeholder="z.B. 22"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="decimal-pad"
                  value={soilTempInput}
                  onChangeText={onSoilTempChange}
                  onFocus={() => onInputFocus?.()}
                />
              </View>
            ) : (
              <View style={styles.refineInputGroup}>
                <Text style={styles.refineLabel}>{t('results.ecPpm')}</Text>
                <TextInput
                  style={styles.refineInput}
                  placeholder="z.B. 1.2"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="decimal-pad"
                  value={ecInput}
                  onChangeText={onEcChange}
                  onFocus={() => onInputFocus?.()}
                />
              </View>
            )}
          </View>

          {/* Fertilizer selector -- hidden for Living Soil */}
          {substrateType !== 'Living Soil' && (
            <View style={styles.refineInputGroup}>
              <Text style={styles.refineLabel}>
                {hasFertilizerFromQuestionnaire
                  ? t('results.fertilizerFromQ')
                  : t('results.fertilizerOptional')}
              </Text>
              <TouchableOpacity
                onPress={onFertilizerPickerToggle}
                style={styles.refineSelect}
                activeOpacity={0.7}
              >
                <Text style={[styles.refineSelectText, !fertilizerInput && { color: colors.textMuted }]}>
                  {fertilizerInput || t('results.fertilizerSearch')}
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
                    placeholder={t('results.fertilizerSearchPlaceholder')}
                    placeholderTextColor={colors.textMuted}
                    value={fertilizerSearch}
                    onChangeText={onFertilizerSearchChange}
                    autoFocus
                    onFocus={() => onInputFocus?.(100)}
                  />
                  <ScrollView nestedScrollEnabled style={styles.fertilizerScroll}>
                    {getFertilizerNames()
                      .filter((name) => name.toLowerCase().includes(fertilizerSearch.toLowerCase()))
                      .map((name) => (
                        <TouchableOpacity
                          key={name}
                          onPress={() => {
                            onFertilizerSelect(
                              name === 'Anderer Dünger' || name === 'Kein Dünger / nur Wasser' ? null : name,
                            );
                          }}
                          style={[
                            styles.fertilizerOption,
                            fertilizerInput === name && styles.fertilizerOptionSelected,
                          ]}
                          activeOpacity={0.7}
                        >
                          <Text
                            style={[
                              styles.fertilizerOptionText,
                              fertilizerInput === name && styles.fertilizerOptionTextSelected,
                            ]}
                          >
                            {name}
                          </Text>
                        </TouchableOpacity>
                      ))}
                  </ScrollView>
                </View>
              )}
            </View>
          )}

          <TouchableOpacity
            onPress={onRefine}
            style={[styles.refineButton, refineLoading && styles.refineButtonDisabled]}
            activeOpacity={0.7}
            disabled={refineLoading}
          >
            {refineLoading ? (
              <ActivityIndicator size="small" color={colors.textOnAccent} />
            ) : (
              <>
                <Ionicons name="refresh-outline" size={16} color={colors.textOnAccent} />
                <Text style={styles.refineButtonText}>{t('results.refineAnalysis')}</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
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
    fontSize: 16,
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
});
