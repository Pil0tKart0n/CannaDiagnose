import React, { useState, useEffect, useMemo, useRef } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, TextInput, Platform } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../constants/colors';
import {
  libraryEntries,
  categoryLabels,
  categoryColors,
  severityColors,
  LibraryCategory,
  LibraryEntry,
} from '../constants/library';
import { t, getLang } from '../services/i18n';
import { categoryLabelsEn, severityLabelsEn, libraryEntriesEn } from '../constants/library-en';

/** Get localized text for a library entry field */
function le(entry: LibraryEntry, field: 'name' | 'categoryLabel'): string {
  if (getLang() !== 'en') return entry[field];
  const en = libraryEntriesEn[entry.id];
  return en?.[field] || entry[field];
}
function leArr(entry: LibraryEntry, field: 'symptoms' | 'causes' | 'treatment' | 'prevention'): string[] {
  if (getLang() !== 'en') return entry[field];
  const en = libraryEntriesEn[entry.id];
  return en?.[field] || entry[field];
}
function catLabel(cat: LibraryCategory): string {
  return getLang() === 'en' ? categoryLabelsEn[cat] : categoryLabels[cat];
}
function sevLabel(sev: string): string {
  if (getLang() !== 'en') return sev.charAt(0).toUpperCase() + sev.slice(1);
  return (severityLabelsEn as any)[sev] || sev;
}

const ALL_CATEGORIES: LibraryCategory[] = [
  'naehrstoffmangel',
  'naehrstoffueberschuss',
  'schaedlinge',
  'krankheiten',
  'umweltprobleme',
];

export default function LibraryScreen() {
  const params = useLocalSearchParams<{ highlight?: string }>();
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<LibraryCategory | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(params.highlight || null);
  const flatListRef = useRef<FlatList>(null);

  // Auto-scroll to highlighted entry
  useEffect(() => {
    if (params.highlight && flatListRef.current) {
      const index = libraryEntries.findIndex((e) => e.id === params.highlight);
      if (index >= 0) {
        const timer = setTimeout(() => {
          flatListRef.current?.scrollToIndex({ index, animated: true, viewOffset: 20 });
        }, 300);
        return () => clearTimeout(timer);
      }
    }
  }, [params.highlight]);

  const filteredEntries = useMemo(() => {
    let entries = libraryEntries;
    if (selectedCategory) {
      entries = entries.filter((e) => e.category === selectedCategory);
    }
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      entries = entries.filter(
        (e) =>
          le(e, 'name').toLowerCase().includes(q) ||
          e.name.toLowerCase().includes(q) ||
          leArr(e, 'symptoms').some((s) => s.toLowerCase().includes(q)) ||
          le(e, 'categoryLabel').toLowerCase().includes(q),
      );
    }
    return entries;
  }, [search, selectedCategory]);

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  const renderItem = ({ item }: { item: LibraryEntry }) => {
    const isExpanded = expandedId === item.id;
    const catColor = categoryColors[item.category];
    const sevColor = severityColors[item.severity];

    return (
      <TouchableOpacity style={styles.card} activeOpacity={0.7} onPress={() => toggleExpand(item.id)}>
        {/* Header */}
        <View style={styles.cardHeader}>
          <Text style={styles.cardEmoji}>{item.emoji}</Text>
          <View style={styles.cardHeaderInfo}>
            <Text style={styles.cardName}>{le(item, 'name')}</Text>
            <View style={styles.cardBadges}>
              <View style={[styles.catBadge, { backgroundColor: `${catColor}18` }]}>
                <Text style={[styles.catBadgeText, { color: catColor }]}>{catLabel(item.category)}</Text>
              </View>
              <View style={[styles.sevBadge, { backgroundColor: `${sevColor}18` }]}>
                <View style={[styles.sevDot, { backgroundColor: sevColor }]} />
                <Text style={[styles.sevBadgeText, { color: sevColor }]}>{sevLabel(item.severity)}</Text>
              </View>
            </View>
          </View>
          <Ionicons name={isExpanded ? 'chevron-up' : 'chevron-down'} size={18} color={colors.textMuted} />
        </View>

        {/* Expanded detail */}
        {isExpanded && (
          <View style={styles.detail}>
            <DetailSection
              icon="medical-outline"
              title={t('library.symptoms')}
              items={leArr(item, 'symptoms')}
              color={colors.error}
            />
            <DetailSection
              icon="help-circle-outline"
              title={t('library.causes')}
              items={leArr(item, 'causes')}
              color={colors.warning}
            />
            <DetailSection
              icon="medkit-outline"
              title={t('library.treatment')}
              items={leArr(item, 'treatment')}
              color={colors.accent}
            />
            <DetailSection
              icon="shield-checkmark-outline"
              title={t('library.prevention')}
              items={leArr(item, 'prevention')}
              color={colors.accentTeal}
            />
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Search */}
      <View style={styles.searchWrap}>
        <Ionicons name="search" size={18} color={colors.textMuted} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder={t('library.search')}
          placeholderTextColor={colors.textMuted}
          value={search}
          onChangeText={setSearch}
          autoCorrect={false}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')} style={styles.searchClear}>
            <Ionicons name="close-circle" size={18} color={colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {/* Category filter chips */}
      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        data={ALL_CATEGORIES}
        keyExtractor={(item) => item}
        contentContainerStyle={styles.chipRow}
        renderItem={({ item: cat }) => {
          const active = selectedCategory === cat;
          const color = categoryColors[cat];
          return (
            <TouchableOpacity
              style={[styles.chip, active && { backgroundColor: `${color}20`, borderColor: color }]}
              activeOpacity={0.7}
              onPress={() => setSelectedCategory(active ? null : cat)}
            >
              <Text style={[styles.chipText, active && { color }]}>{catLabel(cat)}</Text>
            </TouchableOpacity>
          );
        }}
      />

      {/* List */}
      <FlatList
        ref={flatListRef}
        data={filteredEntries}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        onScrollToIndexFailed={(info) => {
          setTimeout(() => flatListRef.current?.scrollToIndex({ index: info.index, animated: true }), 500);
        }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>Keine Einträge gefunden.</Text>
          </View>
        }
      />
    </View>
  );
}

function DetailSection({ icon, title, items, color }: { icon: string; title: string; items: string[]; color: string }) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Ionicons name={icon as any} size={16} color={color} />
        <Text style={[styles.sectionTitle, { color }]}>{title}</Text>
      </View>
      {items.map((item, i) => (
        <View key={i} style={styles.sectionItem}>
          <View style={[styles.sectionDot, { backgroundColor: color }]} />
          <Text style={styles.sectionItemText}>{item}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },

  // Search
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardDark,
    borderRadius: 12,
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.text,
  },
  searchClear: {
    padding: 4,
  },

  // Chips
  chipRow: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.cardDark,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },

  // List
  list: {
    padding: 16,
    paddingTop: 4,
    paddingBottom: 80,
  },

  // Card
  card: {
    backgroundColor: colors.cardDark,
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.border,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 6 },
      android: { elevation: 2 },
      web: { boxShadow: '0 2px 8px rgba(0,0,0,0.15)' },
    }),
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardEmoji: {
    fontSize: 28,
    marginRight: 12,
  },
  cardHeaderInfo: {
    flex: 1,
  },
  cardName: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 6,
  },
  cardBadges: {
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
  },
  catBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  catBadgeText: {
    fontSize: 10,
    fontWeight: '600',
  },
  sevBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  sevDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    marginRight: 4,
  },
  sevBadgeText: {
    fontSize: 10,
    fontWeight: '600',
  },

  // Detail
  detail: {
    marginTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 12,
  },
  section: {
    marginBottom: 14,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  sectionItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 5,
    paddingLeft: 4,
  },
  sectionDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    marginTop: 6,
    marginRight: 10,
  },
  sectionItemText: {
    flex: 1,
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 19,
  },

  // Empty
  empty: {
    alignItems: 'center',
    paddingTop: 40,
  },
  emptyText: {
    fontSize: 14,
    color: colors.textMuted,
  },
});
