import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useToastStore } from '../store/toastStore';
import { useTheme } from '../theme/ThemeProvider';
import { Text } from './Text';

const ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  success: 'checkmark-circle',
  error: 'alert-circle',
  info: 'information-circle',
};

/** Global toast/snackbar host — mount once near the navigation root. */
export function ToastHost() {
  const { message, tone, hide } = useToastStore();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!message) return;
    Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }).start();
    const timer = setTimeout(() => {
      Animated.timing(opacity, { toValue: 0, duration: 180, useNativeDriver: true }).start(() => hide());
    }, 2600);
    return () => clearTimeout(timer);
  }, [message]);

  if (!message) return null;

  const color = tone === 'success' ? theme.status.good : tone === 'error' ? theme.status.critical : theme.colors.primary;

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.wrap,
        { bottom: insets.bottom + 20, backgroundColor: theme.colors.card, borderColor: theme.colors.border, opacity },
      ]}
    >
      <Ionicons name={ICONS[tone]} size={18} color={color} />
      <Text variant="body" style={styles.text} numberOfLines={2}>{message}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute', left: 16, right: 16,
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 12,
    shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 6,
  },
  text: { flex: 1 },
});
