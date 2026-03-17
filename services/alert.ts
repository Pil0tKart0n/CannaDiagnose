import { Alert, Platform } from 'react-native';

/**
 * Cross-platform confirmation dialog.
 * Uses window.confirm on web (where Alert.alert is a no-op),
 * and Alert.alert on native.
 */
export function confirmAlert(
  title: string,
  message: string,
  onConfirm: () => void,
): void {
  if (Platform.OS === 'web') {
    if (window.confirm(`${title}\n\n${message}`)) {
      onConfirm();
    }
  } else {
    Alert.alert(title, message, [
      { text: 'Abbrechen', style: 'cancel' },
      { text: 'Löschen', style: 'destructive', onPress: onConfirm },
    ]);
  }
}
