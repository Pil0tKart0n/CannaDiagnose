import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
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
      <Text style={styles.hint}>
        Fotografiere die betroffenen Blätter aus der Nähe für die beste Diagnose.
      </Text>

      <View style={styles.cards}>
        <TouchableOpacity onPress={takePhoto} activeOpacity={0.8}>
          <LinearGradient
            colors={[colors.primaryLight, colors.primaryAccent]}
            style={styles.card}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.cardIconWrap}>
              <Text style={styles.cardIcon}>📷</Text>
            </View>
            <Text style={styles.cardTitle}>Foto aufnehmen</Text>
            <Text style={styles.cardSub}>Kamera öffnen</Text>
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity onPress={pickImage} activeOpacity={0.8}>
          <LinearGradient
            colors={[colors.cardDark, colors.cardMid]}
            style={styles.card}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.cardIconWrap}>
              <Text style={styles.cardIcon}>🖼</Text>
            </View>
            <Text style={styles.cardTitle}>Aus Galerie wählen</Text>
            <Text style={styles.cardSub}>Vorhandenes Foto nutzen</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: colors.background,
  },
  hint: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
    paddingHorizontal: 10,
  },
  cards: {
    flex: 1,
    gap: 14,
    justifyContent: 'center',
  },
  card: {
    borderRadius: 22,
    padding: 28,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    ...Platform.select({
      ios: {
        shadowColor: colors.shadowDark,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 1,
        shadowRadius: 16,
      },
      android: { elevation: 8 },
      web: {
        boxShadow: '0 6px 24px rgba(0,0,0,0.3)',
      },
    }),
  },
  cardIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  cardIcon: {
    fontSize: 28,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.white,
    marginBottom: 4,
  },
  cardSub: {
    fontSize: 13,
    color: colors.textMuted,
  },
});
