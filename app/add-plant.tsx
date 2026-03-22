import React, { useState } from 'react';
import {
  View, Text, TextInput, StyleSheet, TouchableOpacity, Image, Alert, Platform, KeyboardAvoidingView, ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { savePlant } from '../services/storage';
import { colors } from '../constants/colors';
import { t } from '../services/i18n';

export default function AddPlantScreen() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [strain, setStrain] = useState('');
  const [showExtras, setShowExtras] = useState(false);
  const [imageUri, setImageUri] = useState<string | null>(null);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.7,
      allowsEditing: true,
      aspect: [1, 1],
    });
    if (!result.canceled && result.assets[0]) {
      setImageUri(result.assets[0].uri);
    }
  };

  const handleSave = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      Alert.alert(t('plantDetail.nameMissing'), t('plantDetail.nameRequired'));
      return;
    }
    await savePlant({
      id: Date.now().toString(),
      name: trimmed,
      strain: strain.trim() || undefined,
      imageUri: imageUri || undefined,
      createdAt: new Date().toISOString(),
      entries: [],
    });
    router.back();
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.content}>
        {/* Image picker */}
        <TouchableOpacity style={styles.imagePicker} onPress={pickImage} activeOpacity={0.7}>
          {imageUri ? (
            <Image source={{ uri: imageUri }} style={styles.imagePreview} />
          ) : (
            <View style={styles.imagePlaceholder}>
              <Text style={styles.imagePlaceholderIcon}>+</Text>
              <Text style={styles.imagePlaceholderText}>{t('addPlant.addPhoto')}</Text>
            </View>
          )}
        </TouchableOpacity>

        {/* Name / Sorte */}
        <Text style={styles.label}>{t('addPlant.nameLabel')}</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder={t('addPlant.namePlaceholder')}
          placeholderTextColor={colors.textMuted}
          autoFocus
        />

        {/* Optional extras toggle */}
        {!showExtras && (
          <TouchableOpacity style={styles.extrasToggle} onPress={() => setShowExtras(true)} activeOpacity={0.7}>
            <Text style={styles.extrasToggleText}>{t('addPlant.addMore')}</Text>
          </TouchableOpacity>
        )}

        {showExtras && (
          <>
            <Text style={styles.label}>{t('addPlant.noteLabel')}</Text>
            <TextInput
              style={styles.input}
              value={strain}
              onChangeText={setStrain}
              placeholder={t('addPlant.notePlaceholder')}
              placeholderTextColor={colors.textMuted}
            />
          </>
        )}
      </ScrollView>

      <View style={styles.bottomBar}>
        <TouchableOpacity onPress={handleSave} activeOpacity={0.85}>
          <LinearGradient
            colors={['#5AEF90', '#4ADE80', '#3CC870']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.saveBtn}
          >
            <Text style={styles.saveBtnText}>{t('addPlant.save')}</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 20, paddingBottom: 100 },

  // Image
  imagePicker: {
    alignSelf: 'center',
    marginBottom: 28,
    marginTop: 8,
  },
  imagePreview: {
    width: 120, height: 120, borderRadius: 30,
  },
  imagePlaceholder: {
    width: 120, height: 120, borderRadius: 24,
    backgroundColor: colors.cardDark,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  imagePlaceholderIcon: {
    fontSize: 28, color: colors.textMuted, fontWeight: '300',
  },
  imagePlaceholderText: {
    fontSize: 12, color: colors.textMuted, marginTop: 4,
  },

  // Form
  label: {
    fontSize: 12, fontWeight: '600', color: colors.textSecondary, textTransform: 'uppercase',
    marginBottom: 8, letterSpacing: 0.5,
  },
  input: {
    backgroundColor: colors.cardDark,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 20,
  },
  extrasToggle: {
    paddingVertical: 12,
    marginBottom: 8,
  },
  extrasToggleText: {
    color: colors.accent,
    fontSize: 14,
    fontWeight: '500',
  },

  // Bottom
  bottomBar: { padding: 16, paddingBottom: 24 },
  saveBtn: {
    borderRadius: 12, paddingVertical: 16, alignItems: 'center',
    ...Platform.select({
      web: { boxShadow: '0 4px 20px rgba(74,222,128,0.2)' },
      ios: { shadowColor: 'rgba(74,222,128,0.4)', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 1, shadowRadius: 12 },
      android: { elevation: 6 },
    }),
  },
  saveBtnText: { color: colors.textOnAccent, fontSize: 15, fontWeight: '600', letterSpacing: 0.3 },
});
