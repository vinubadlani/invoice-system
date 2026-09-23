import React from 'react';
import { Text as RNText, TextProps, TextStyle } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';

type Variant = 'title' | 'subtitle' | 'body' | 'caption' | 'label' | 'mono';
type Tone = 'default' | 'muted' | 'primary' | 'destructive' | 'inverted';

interface AppTextProps extends TextProps {
  variant?: Variant;
  tone?: Tone;
  weight?: 'regular' | 'medium' | 'semibold' | 'bold';
}

const VARIANT_STYLE: Record<Variant, TextStyle> = {
  title: { fontSize: 22, lineHeight: 28 },
  subtitle: { fontSize: 17, lineHeight: 22 },
  body: { fontSize: 14, lineHeight: 20 },
  caption: { fontSize: 12, lineHeight: 16 },
  label: { fontSize: 13, lineHeight: 18 },
  mono: { fontSize: 14, lineHeight: 20, fontVariant: ['tabular-nums'] },
};

const WEIGHT_STYLE: Record<NonNullable<AppTextProps['weight']>, TextStyle> = {
  regular: { fontWeight: '400' },
  medium: { fontWeight: '500' },
  semibold: { fontWeight: '600' },
  bold: { fontWeight: '700' },
};

export function Text({ variant = 'body', tone = 'default', weight, style, ...rest }: AppTextProps) {
  const theme = useTheme();

  const toneColor: Record<Tone, string> = {
    default: theme.colors.foreground,
    muted: theme.colors.mutedForeground,
    primary: theme.colors.primary,
    destructive: theme.colors.destructive,
    inverted: theme.colors.primaryForeground,
  };

  const defaultWeight = variant === 'title' ? 'bold' : variant === 'subtitle' ? 'semibold' : 'regular';

  return (
    <RNText
      style={[
        VARIANT_STYLE[variant],
        WEIGHT_STYLE[weight ?? defaultWeight],
        { color: toneColor[tone] },
        style,
      ]}
      {...rest}
    />
  );
}
