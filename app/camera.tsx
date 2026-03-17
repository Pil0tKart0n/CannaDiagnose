import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Alert, Platform, Image, ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../constants/colors';
import { useDiagnosis } from './_layout';

const MAX_PHOTOS = 3;

export default function CameraScreen() {
  const router = useRouter();
  const { setImageUris } = useDiagnosis();
  const [photos, setPhotos] = useState<string[]>([]);

  const takePhoto = async () => {
    if (photos.length >= MAX_PHOTOS) return;
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Berechtigung benötigt', 'Bitte erlaube den Kamerazugriff in den Einstellungen.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      setPhotos((prev) => [...prev, result.assets[0].uri]);
    }
  };

  const pickImage = async () => {
    if (photos.length >= MAX_PHOTOS) return;
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Berechtigung benötigt', 'Bitte erlaube den Zugriff auf die Galerie.');
      return;
    }
    const remaining = MAX_PHOTOS - photos.length;
    const result = await ImagePicker.launchImageLibraryAsync({
      quality: 0.8,
      selectionLimit: remaining,
      allowsMultipleSelection: remaining > 1,
    });
    if (!result.canceled && result.assets.length > 0) {
      const newUris = result.assets.map((a) => a.uri);
      setPhotos((prev) => [...prev, ...newUris].slice(0, MAX_PHOTOS));
    }
  };

  const removePhoto = (index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const proceed = () => {
    if (photos.length === 0) return;
    setImageUris(photos);
    router.push('/questionnaire');
  };

  const hasPhotos = photos.length > 0;
  const canAddMore = photos.length < MAX_PHOTOS;

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      {/* Photo thumbnails strip */}
      {hasPhotos && (
        <View style={styles.thumbnailStrip}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.thumbnailScroll}>
            {photos.map((uri, index) => (
              <View key={`${uri}-${index}`} style={styles.thumbnailWrapper}>
                <Image source={{ uri }} style={styles.thumbnail} />
                <TouchableOpacity
                  style={styles.removeBtn}
                  onPress={() => removePhoto(index)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="close-circle" size={22} color={colors.error} />
                </TouchableOpacity>
                <View style={styles.thumbnailBadge}>
                  <Text style={styles.thumbnailBadgeText}>{index + 1}</Text>
                </View>
              </View>
            ))}
          </ScrollView>
          <View style={styles.counterContainer}>
            <Text style={styles.counterText}>{photos.length}/{MAX_PHOTOS} Fotos</Text>
          </View>
        </View>
      )}

      {/* Viewfinder bracket illustration */}
      <View style={styles.viewfinderArea}>
        <View style={styles.viewfinder}>
          {/* Corner brackets */}
          <View style={[styles.corner, styles.cornerTL]} />
          <View style={[styles.corner, styles.cornerTR]} />
          <View style={[styles.corner, styles.cornerBL]} />
          <View style={[styles.corner, styles.cornerBR]} />

          {/* Inner content */}
          {hasPhotos ? (
            <>
              <Ionicons
                name={canAddMore ? 'add-circle-outline' : 'checkmark-circle-outline'}
                size={40}
                color={canAddMore ? colors.accent : colors.accentSoft}
                style={{ opacity: 0.7 }}
              />
              <Text style={styles.viewfinderText}>
                {canAddMore
                  ? 'Weiteres Foto hinzufügen'
                  : 'Maximale Anzahl erreicht'}
              </Text>
              <Text style={styles.viewfinderHint}>
                {canAddMore ? '(optional)' : ''}
              </Text>
            </>
          ) : (
            <>
              <Ionicons name="leaf-outline" size={40} color={colors.textMuted} style={{ opacity: 0.4 }} />
              <Text style={styles.viewfinderText}>Blatt, Stängel oder Pflanze</Text>
            </>
          )}
        </View>
      </View>

      {/* Primary action: large shutter button (native only — web has no camera API) */}
      {canAddMore && Platform.OS !== 'web' && (
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
          <Text style={styles.shutterLabel}>
            {hasPhotos ? 'Weiteres Foto aufnehmen' : 'Foto aufnehmen'}
          </Text>
        </View>
      )}

      {/* Divider (native only) */}
      {canAddMore && Platform.OS !== 'web' && (
        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>oder</Text>
          <View style={styles.dividerLine} />
        </View>
      )}

      {/* Web: primary upload button */}
      {canAddMore && Platform.OS === 'web' && (
        <View style={styles.shutterArea}>
          <TouchableOpacity onPress={pickImage} activeOpacity={0.8} style={styles.shutterOuter}>
            <LinearGradient
              colors={['#5AEF90', '#4ADE80', '#3CC870']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.shutterInner}
            >
              <Ionicons name="cloud-upload-outline" size={32} color={colors.textOnAccent} />
            </LinearGradient>
          </TouchableOpacity>
          <Text style={styles.shutterLabel}>
            {hasPhotos ? 'Weiteres Foto hochladen' : 'Foto hochladen'}
          </Text>
        </View>
      )}

      {/* Secondary action: gallery row (native only) */}
      {canAddMore && Platform.OS !== 'web' && (
        <TouchableOpacity onPress={pickImage} activeOpacity={0.7} style={styles.galleryRow}>
          <View style={styles.galleryIcon}>
            <Ionicons name="images-outline" size={20} color={colors.accent} />
          </View>
          <Text style={styles.galleryText}>Aus Galerie wählen</Text>
          <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
        </TouchableOpacity>
      )}

      {/* Weiter button */}
      {hasPhotos && (
        <View style={styles.proceedArea}>
          <TouchableOpacity onPress={proceed} activeOpacity={0.85}>
            <LinearGradient
              colors={['#5AEF90', '#4ADE80', '#3CC870']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.proceedBtn}
            >
              <Text style={styles.proceedBtnText}>Weiter</Text>
              <Ionicons name="arrow-forward" size={18} color={colors.textOnAccent} />
            </LinearGradient>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.bottomSpacer} />
    </SafeAreaView>
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

  // Thumbnail strip
  thumbnailStrip: {
    paddingTop: 16,
  },
  thumbnailScroll: {
    gap: 12,
    paddingVertical: 4,
  },
  thumbnailWrapper: {
    position: 'relative',
  },
  thumbnail: {
    width: 72,
    height: 72,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: colors.accent,
  },
  removeBtn: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: colors.background,
    borderRadius: 11,
  },
  thumbnailBadge: {
    position: 'absolute',
    bottom: -4,
    left: '50%',
    marginLeft: -10,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbnailBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textOnAccent,
  },
  counterContainer: {
    alignItems: 'center',
    marginTop: 12,
  },
  counterText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    letterSpacing: 0.5,
  },

  // Viewfinder
  viewfinderArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 8,
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
    textAlign: 'center',
  },
  viewfinderHint: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 4,
    opacity: 0.4,
  },

  // Shutter button
  shutterArea: {
    alignItems: 'center',
    paddingBottom: 16,
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
    paddingVertical: 12,
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

  // Proceed button
  proceedArea: {
    marginTop: 16,
  },
  proceedBtn: {
    borderRadius: 14,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    ...Platform.select({
      ios: {
        shadowColor: 'rgba(74,222,128,0.4)',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 1,
        shadowRadius: 12,
      },
      android: { elevation: 6 },
      web: { boxShadow: '0 4px 20px rgba(0,230,118,0.2)' },
    }),
  },
  proceedBtnText: {
    color: colors.textOnAccent,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },

  bottomSpacer: {
    height: 24,
  },
});
