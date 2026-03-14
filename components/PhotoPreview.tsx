import React from 'react';
import { View, Image, StyleSheet } from 'react-native';
import Button from './Button';
import { colors } from '../constants/colors';

interface PhotoPreviewProps {
  uri: string;
  onUse: () => void;
  onRetake: () => void;
}

export default function PhotoPreview({ uri, onUse, onRetake }: PhotoPreviewProps) {
  return (
    <View style={styles.container}>
      <Image source={{ uri }} style={styles.image} resizeMode="contain" />
      <View style={styles.buttons}>
        <Button title="Neu aufnehmen" onPress={onRetake} variant="outline" style={styles.btn} />
        <Button title="Verwenden" onPress={onUse} style={styles.btn} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  image: {
    flex: 1,
    width: '100%',
  },
  buttons: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
    backgroundColor: colors.cardDark,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  btn: {
    flex: 1,
  },
});
