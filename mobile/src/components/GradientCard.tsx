import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { StyleSheet, ViewProps } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';

interface GradientCardProps extends ViewProps {
  padded?: boolean;
}

/** Bold gradient hero card — dashboard balance card, invoice-total card, onboarding panel. */
export function GradientCard({ style, padded = true, children, ...rest }: GradientCardProps) {
  const theme = useTheme();
  return (
    <LinearGradient
      colors={theme.gradient.primary}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[
        {
          borderRadius: theme.radius.xl,
          padding: padded ? theme.spacing.xl : 0,
        },
        styles.shadow,
        style,
      ]}
      {...rest}
    >
      {children}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  shadow: {
    shadowColor: '#0d366b',
    shadowOpacity: 0.25,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
});
