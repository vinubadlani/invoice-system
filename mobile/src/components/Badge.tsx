import React from 'react';
import { StyleSheet, View } from 'react-native';
import { chartSequential } from '../theme/colors';
import { useTheme } from '../theme/ThemeProvider';
import { Text } from './Text';

export type BadgeTone = 'good' | 'warning' | 'serious' | 'critical' | 'neutral' | 'primary';

interface BadgeProps {
  label: string;
  tone?: BadgeTone;
}

export function Badge({ label, tone = 'neutral' }: BadgeProps) {
  const theme = useTheme();

  // Hex only — theme.colors.* are `hsl(...)` strings and can't take a hex alpha
  // suffix (`color + '1f'` below), which silently produced an invalid color and
  // rendered as an opaque, textless blob. Status colors are already hex.
  const colorFor: Record<BadgeTone, string> = {
    good: theme.status.good,
    warning: theme.status.warning,
    serious: theme.status.serious,
    critical: theme.status.critical,
    neutral: theme.isDark ? '#8b96a5' : '#6b7280',
    primary: theme.isDark ? chartSequential[400] : chartSequential[450],
  };
  const color = colorFor[tone];

  return (
    <View style={[styles.badge, { backgroundColor: color + '1f', borderColor: color + '55' }]}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text variant="caption" weight="semibold" style={{ color }}>
        {label}
      </Text>
    </View>
  );
}

/** Maps invoice/payment status strings to a badge tone — one place so tone
 * choices stay consistent across sales, purchase, payments screens. */
export function statusToTone(status: string): BadgeTone {
  switch (status) {
    case 'paid':
      return 'good';
    case 'partial':
      return 'warning';
    case 'overdue':
      return 'critical';
    case 'cancelled':
      return 'neutral';
    case 'sent':
      return 'primary';
    default:
      return 'neutral';
  }
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999, borderWidth: 1, alignSelf: 'flex-start',
  },
  dot: { width: 6, height: 6, borderRadius: 3 },
});
