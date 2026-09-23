import React, { useState } from 'react';
import { StyleSheet, TextInput, TextInputProps, View } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { Text } from './Text';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  hint?: string;
  required?: boolean;
  rightElement?: React.ReactNode;
}

export function Input({ label, error, hint, required, rightElement, style, ...rest }: InputProps) {
  const theme = useTheme();
  const [focused, setFocused] = useState(false);

  return (
    <View style={styles.wrap}>
      {label ? (
        <Text variant="label" tone="muted" style={styles.label}>
          {label}
          {required ? <Text tone="destructive"> *</Text> : null}
        </Text>
      ) : null}
      <View
        style={[
          styles.field,
          {
            borderColor: error ? theme.colors.destructive : focused ? theme.colors.ring : theme.colors.border,
            backgroundColor: theme.colors.card,
            borderRadius: theme.radius.md,
            borderWidth: focused || error ? 1.5 : 1,
          },
        ]}
      >
        <TextInput
          placeholderTextColor={theme.colors.mutedForeground}
          style={[styles.input, { color: theme.colors.foreground }, style]}
          onFocus={(e) => {
            setFocused(true);
            rest.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            rest.onBlur?.(e);
          }}
          {...rest}
        />
        {rightElement}
      </View>
      {error ? (
        <Text variant="caption" tone="destructive" style={styles.helper}>
          {error}
        </Text>
      ) : hint ? (
        <Text variant="caption" tone="muted" style={styles.helper}>
          {hint}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 14 },
  label: { marginBottom: 6 },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 46,
    paddingHorizontal: 12,
  },
  input: { flex: 1, fontSize: 15, paddingVertical: 10 },
  helper: { marginTop: 4 },
});
