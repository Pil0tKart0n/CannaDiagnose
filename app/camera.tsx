import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import PhotoPreview from '../components/PhotoPreview';
import { colors } from '../constants/colors';
import { useDiagnosis } from './_layout';

export default function CameraScreen() {
  const router = useRouter();
  const { setImageUri } = useDiagnosis();
  const [tempUri, setTempUri] = useState<string | null>(null);

  const takePhoto = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Berechtigung benötigt', 'Bitte erlaube den Kamerazugriff in den Einstellungen.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      quality: 0.8,
      allowsEditing: true,
    });
    if (!result.canceled && result.assets[0]) {
      setTempUri(result.assets[0].uri);
    }
  };

  const pickImage = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Berechtigung benötigt', 'Bitte erlaube den Zugriff auf die Galerie.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      quality: 0.8,
      allowsEditing: true,
    });
    if (!result.canceled && result.assets[0]) {
      setTempUri(result.assets[0].uri);
    }
  };

  const usePhoto = () => {
    if (tempUri) {
      setImageUri(tempUri);
      router.push('/questionnaire');
    }
  };

  if (tempUri) {
    return (
      <PhotoPreview
        uri={tempUri}
        onUse={usePhoto}
        onRetake={() => setTempUri(null)}
      />
    );
  }

  return (
    <View style={styles.container}>
      {/* Viewfinder bracket illustration */}
      <View style={styles.viewfinderArea}>
        <View style={styles.viewfinder}>
          {/* Corner brackets */}
          <View style={[styles.corner, styles.cornerTL]} />
          <View style={[styles.corner, styles.cornerTR]} />
          <View style={[styles.corner, styles.cornerBL]} />
          <View style={[styles.corner, styles.cornerBR]} />

          {/* Inner content */}
          <Ionicons name="leaf-outline" size={40} color={colors.textMuted} style={{ opacity: 0.4 }} />
          <Text style={styles.viewfinderText}>Blatt, Stängel oder Pflanze</Text>
        </View>
      </View>

      {/* Primary action: large shutter button */}
      <View style={styles.shutterArea}>
        <TouchableOpacity onPress={takePhoto} activeOpacity={0.8} style={styles.shutterOuter}>
          <LinearGradient
            colors={['#5AEF90', '#4ADE80', '#3CC870']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.shutterInner}
          >
            <Ionicons name="camera" size={32} color={colors.textOnAccent} />
          </LinearGradient>
        </TouchableOpacity>
        <Text style={styles.shutterLabel}>Foto aufnehmen</Text>
      </View>

      {/* Divider */}
      <View style={styles.divider}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerText}>oder</Text>
        <View style={styles.dividerLine} />
      </View>

      {/* Secondary action: gallery row */}
      <TouchableOpacity onPress={pickImage} activeOpacity={0.7} style={styles.galleryRow}>
        <View style={styles.galleryIcon}>
          <Ionicons name="images-outline" size={20} color={colors.accent} />
        </View>
        <Text style={styles.galleryText}>Aus Galerie wählen</Text>
        <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
      </TouchableOpacity>

      <View style={styles.bottomSpacer} />
    </View>
  );
}

const CORNER_SIZE = 24;
const CORNER_THICKNESS = 3;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: 24,
  },

  // Viewfinder
  viewfinderArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 16,
  },
  viewfinder: {
    width: 200,
    height: 200,
    alignItems: 'center',
    justifyContent: 'center',
  },
  corner: {
    position: 'absolute',
    width: CORNER_SIZE,
    height: CORNER_SIZE,
  },
  cornerTL: {
    top: 0,
    left: 0,
    borderTopWidth: CORNER_THICKNESS,
    borderLeftWidth: CORNER_THICKNESS,
    borderColor: colors.textMuted,
    borderTopLeftRadius: 8,
  },
  cornerTR: {
    top: 0,
    right: 0,
    borderTopWidth: CORNER_THICKNESS,
    borderRightWidth: CORNER_THICKNESS,
    borderColor: colors.textMuted,
    borderTopRightRadius: 8,
  },
  cornerBL: {
    bottom: 0,
    left: 0,
    borderBottomWidth: CORNER_THICKNESS,
    borderLeftWidth: CORNER_THICKNESS,
    borderColor: colors.textMuted,
    borderBottomLeftRadius: 8,
  },
  cornerBR: {
    bottom: 0,
    right: 0,
    borderBottomWidth: CORNER_THICKNESS,
    borderRightWidth: CORNER_THICKNESS,
    borderColor: colors.textMuted,
    borderBottomRightRadius: 8,
  },
  viewfinderText: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 12,
    opacity: 0.6,
  },

  // Shutter button
  shutterArea: {
    alignItems: 'center',
    paddingBottom: 20,
  },
  shutterOuter: {
    width: 92,
    height: 92,
    borderRadius: 46,
    borderWidth: 3,
    borderColor: 'rgba(74,222,128,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: 'rgba(74,222,128,0.4)',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 1,
        shadowRadius: 16,
      },
      android: { elevation: 8 },
      web: { boxShadow: '0 4px 24px rgba(74,222,128,0.2)' },
    }),
  },
  shutterInner: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
    marginTop: 14,
    letterSpacing: 0.3,
  },

  // Divider
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  dividerText: {
    fontSize: 13,
    color: colors.textMuted,
    paddingHorizontal: 16,
  },

  // Gallery row
  galleryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardDark,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  galleryIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.accentSubtle,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  galleryText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    color: colors.text,
  },

  bottomSpacer: {
    height: 40,
  },
});
