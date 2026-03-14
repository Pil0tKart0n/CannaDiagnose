import React, { useState } from 'react';
import {
  View, Text, TextInput, StyleSheet, TouchableOpacity, Image, Alert, Platform, KeyboardAvoidingView, ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { savePlant } from '../services/storage';
import { colors } from '../constants/colors';

export default function AddPlantScreen() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [strain, setStrain] = useState('');
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
      Alert.alert('Name fehlt', 'Gib deiner Pflanze einen Namen.');
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
              <Text style={styles.imagePlaceholderText}>Foto hinzufügen</Text>
            </View>
          )}
        </TouchableOpacity>

        {/* Name */}
        <Text style={styles.label}>Name *</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="z.B. Pflanze #1, Northern Lights..."
          placeholderTextColor={colors.textMuted}
          autoFocus
        />

        {/* Strain */}
        <Text style={styles.label}>Sorte (optional)</Text>
        <TextInput
          style={styles.input}
          value={strain}
          onChangeText={setStrain}
          placeholder="z.B. White Widow, Amnesia Haze..."
          placeholderTextColor={colors.textMuted}
        />
      </ScrollView>

      <View style={styles.bottomBar}>
        <TouchableOpacity onPress={handleSave} activeOpacity={0.85}>
          <LinearGradient
            colors={['#00E676', '#00C853', '#00A844']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.saveBtn}
          >
            <Text style={styles.saveBtnText}>Pflanze speichern</Text>
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
    width: 120, height: 120, borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
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
    fontSize: 13, fontWeight: '700', color: colors.textSecondary,
    marginBottom: 8, letterSpacing: 0.3,
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 14,
    padding: 16,
    fontSize: 16,
    color: colors.text,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    marginBottom: 20,
  },

  // Bottom
  bottomBar: { padding: 16, paddingBottom: 24 },
  saveBtn: {
    borderRadius: 16, paddingVertical: 16, alignItems: 'center',
    ...Platform.select({
      web: { boxShadow: '0 4px 20px rgba(0,230,118,0.2)' },
      ios: { shadowColor: 'rgba(0,230,118,0.4)', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 1, shadowRadius: 12 },
      android: { elevation: 6 },
    }),
  },
  saveBtnText: { color: colors.white, fontSize: 15, fontWeight: '700', letterSpacing: 0.3 },
});
