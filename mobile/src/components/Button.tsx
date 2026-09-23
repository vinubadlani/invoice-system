import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, ViewStyle } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { Text } from './Text';

type Variant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: Variant;
  size?: Size;
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  fullWidth?: boolean;
  style?: ViewStyle;
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled,
  loading,
  icon,
  fullWidth,
  style,
}: ButtonProps) {
  const theme = useTheme();
  const isDisabled = disabled || loading;

  const bg: Record<Variant, string> = {
    primary: theme.colors.primary,
    secondary: theme.colors.secondary,
    outline: 'transparent',
    ghost: 'transparent',
    destructive: theme.colors.destructive,
  };
  const fg: Record<Variant, string> = {
    primary: theme.colors.primaryForeground,
    secondary: theme.colors.secondaryForeground,
    outline: theme.colors.primary,
    ghost: theme.colors.primary,
    destructive: theme.colors.destructiveForeground,
  };
  const border: Record<Variant, string> = {
    primary: theme.colors.primary,
    secondary: theme.colors.secondary,
    outline: theme.colors.border,
    ghost: 'transparent',
    destructive: theme.colors.destructive,
  };
  const padding: Record<Size, number> = { sm: 8, md: 12, lg: 16 };
  const fontSize: Record<Size, number> = { sm: 13, md: 15, lg: 16 };

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        {
          backgroundColor: bg[variant],
          borderColor: border[variant],
          borderWidth: variant === 'outline' ? 1 : 0,
          paddingVertical: padding[size],
          opacity: isDisabled ? 0.5 : pressed ? 0.85 : 1,
          borderRadius: theme.radius.md,
          alignSelf: fullWidth ? 'stretch' : 'flex-start',
        },
        style,
      ]}
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled }}
    >
      {loading ? (
        <ActivityIndicator color={fg[variant]} size="small" />
      ) : (
        <>
          {icon}
          <Text style={{ color: fg[variant], fontSize: fontSize[size] }} weight="semibold">
            {label}
          </Text>
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 16,
    minHeight: 44,
  },
});
