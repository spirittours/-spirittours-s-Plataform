/**
 * Loading Overlay Component
 * Shows full-screen loading indicator
 */

import React from 'react';
import {
  View,
  Modal,
  ActivityIndicator,
  Text,
  StyleSheet,
  StatusBar,
} from 'react-native';
import { useTheme } from 'react-native-paper';

interface LoadingOverlayProps {
  visible: boolean;
  message?: string;
}

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
  visible,
  message,
}) => {
  const theme = useTheme();

  return (
    <Modal transparent visible={visible} animationType="fade">
      <StatusBar barStyle="light-content" backgroundColor="rgba(0,0,0,0.7)" />
      <View style={styles.container}>
        <View style={[styles.content, { backgroundColor: theme.colors.surface }]}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          {message && (
            <Text style={[styles.message, { color: theme.colors.onSurface }]}>
              {message}
            </Text>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  content: {
    padding: 24,
    borderRadius: 12,
    minWidth: 150,
    alignItems: 'center',
  },
  message: {
    marginTop: 16,
    fontSize: 14,
    textAlign: 'center',
  },
});
