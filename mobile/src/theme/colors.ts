/**
 * Design tokens ported from the HisabKitab web app (app/globals.css,
 * tailwind.config.ts) so the Android app reads as the same product.
 * Chart-specific tokens are the dataviz-skill validated default palette.
 */

export interface ThemeColors {
  background: string;
  foreground: string;
  card: string;
  cardForeground: string;
  primary: string;
  primaryForeground: string;
  secondary: string;
  secondaryForeground: string;
  muted: string;
  mutedForeground: string;
  accent: string;
  accentForeground: string;
  destructive: string;
  destructiveForeground: string;
  border: string;
  input: string;
  ring: string;
}

export const lightColors: ThemeColors = {
  background: 'hsl(0, 0%, 98%)',
  foreground: 'hsl(224, 71%, 4%)',
  card: 'hsl(0, 0%, 100%)',
  cardForeground: 'hsl(224, 71%, 4%)',
  primary: 'hsl(226, 70%, 55%)',
  primaryForeground: 'hsl(0, 0%, 100%)',
  secondary: 'hsl(220, 14%, 96%)',
  secondaryForeground: 'hsl(224, 71%, 4%)',
  muted: 'hsl(220, 14%, 95%)',
  mutedForeground: 'hsl(220, 9%, 46%)',
  accent: 'hsl(226, 70%, 97%)',
  accentForeground: 'hsl(226, 70%, 40%)',
  destructive: 'hsl(0, 84%, 60%)',
  destructiveForeground: 'hsl(0, 0%, 100%)',
  border: 'hsl(220, 13%, 91%)',
  input: 'hsl(220, 13%, 91%)',
  ring: 'hsl(226, 70%, 55%)',
};

export const darkColors: ThemeColors = {
  background: 'hsl(224, 71%, 4%)',
  foreground: 'hsl(213, 31%, 91%)',
  card: 'hsl(224, 71%, 6%)',
  cardForeground: 'hsl(213, 31%, 91%)',
  primary: 'hsl(226, 70%, 60%)',
  primaryForeground: 'hsl(0, 0%, 100%)',
  secondary: 'hsl(222, 47%, 11%)',
  secondaryForeground: 'hsl(213, 31%, 91%)',
  muted: 'hsl(223, 47%, 11%)',
  mutedForeground: 'hsl(215, 20%, 55%)',
  accent: 'hsl(222, 47%, 14%)',
  accentForeground: 'hsl(213, 31%, 91%)',
  destructive: 'hsl(0, 63%, 31%)',
  destructiveForeground: 'hsl(213, 31%, 91%)',
  border: 'hsl(222, 47%, 14%)',
  input: 'hsl(222, 47%, 14%)',
  ring: 'hsl(226, 70%, 60%)',
};

/** Status colors — fixed, never themed by light/dark. Always paired with an icon + label. */
export const statusColors = {
  good: '#0ca30c',
  warning: '#fab219',
  serious: '#ec835a',
  critical: '#d03b3b',
} as const;

/** Categorical series palette (validated order — never reorder/cycle). */
export const chartCategorical = {
  light: ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300', '#4a3aa7', '#e34948'],
  dark: ['#3987e5', '#d95926', '#199e70', '#c98500', '#d55181', '#008300', '#9085e9', '#e66767'],
} as const;

/** Sequential blue ramp, light -> dark, for magnitude (e.g. stock heat). */
export const chartSequential = {
  100: '#cde2fb', 150: '#b7d3f6', 200: '#9ec5f4', 250: '#86b6ef',
  300: '#6da7ec', 350: '#5598e7', 400: '#3987e5', 450: '#2a78d6',
  500: '#256abf', 550: '#1c5cab', 600: '#184f95', 650: '#104281', 700: '#0d366b',
} as const;

/** Diverging pair for month-over-month style deltas. */
export const chartDiverging = {
  positive: '#2a78d6',
  negative: '#e34948',
  neutralLight: '#f0efec',
  neutralDark: '#383835',
} as const;

/** Bold gradient tokens for hero cards (balance/invoice-total cards, onboarding,
 * app icon). Drawn directly from the validated chartSequential blue ramp above —
 * not a separately invented hex pair — so the gradient stays one coherent family
 * with the chart palette instead of introducing a second, uncoordinated blue. */
export interface GradientTokens {
  primary: readonly [string, string];
  primaryOnColor: string;
  primarySubtle: string;
}

export const gradients: { light: GradientTokens; dark: GradientTokens } = {
  light: {
    primary: [chartSequential[450], chartSequential[650]],
    primaryOnColor: '#FFFFFF',
    primarySubtle: 'rgba(255,255,255,0.16)',
  },
  dark: {
    primary: [chartSequential[400], chartSequential[600]],
    primaryOnColor: '#FFFFFF',
    primarySubtle: 'rgba(255,255,255,0.14)',
  },
};

export const radius = {
  sm: 6,
  md: 8,
  lg: 10,
  xl: 16,
  full: 999,
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;
