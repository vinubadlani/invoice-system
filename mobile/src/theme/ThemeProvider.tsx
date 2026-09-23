import React, { createContext, useContext, useMemo } from 'react';
import { useColorScheme } from 'react-native';
import { darkColors, gradients, lightColors, radius, spacing, statusColors, ThemeColors } from './colors';

export interface Theme {
  colors: ThemeColors;
  status: typeof statusColors;
  gradient: typeof gradients.light;
  radius: typeof radius;
  spacing: typeof spacing;
  isDark: boolean;
}

const ThemeContext = createContext<Theme | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';

  const theme = useMemo<Theme>(
    () => ({
      colors: isDark ? darkColors : lightColors,
      status: statusColors,
      gradient: isDark ? gradients.dark : gradients.light,
      radius,
      spacing,
      isDark,
    }),
    [isDark],
  );

  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
}

export function useTheme(): Theme {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within a ThemeProvider');
  return ctx;
}
