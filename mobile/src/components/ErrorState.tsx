import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { Button } from './Button';
import { Text } from './Text';

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
}

/** Shown for failed fetches (network down, Supabase error). Never silently swallow — always surface this. */
export function ErrorState({ title = 'Something went wrong', message, onRetry }: ErrorStateProps) {
  const theme = useTheme();
  return (
    <View style={styles.wrap}>
      <Ionicons name="alert-circle-outline" size={32} color={theme.status.critical} />
      <Text variant="subtitle" weight="semibold" style={styles.title}>
        {title}
      </Text>
      {message ? (
        <Text variant="body" tone="muted" style={styles.message}>
          {message}
        </Text>
      ) : null}
      {onRetry ? <Button label="Try again" variant="outline" onPress={onRetry} style={styles.action} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center', paddingVertical: 40, paddingHorizontal: 24 },
  title: { marginTop: 12, textAlign: 'center' },
  message: { textAlign: 'center', marginTop: 4 },
  action: { marginTop: 16 },
});
