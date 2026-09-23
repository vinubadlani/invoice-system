import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { Card } from './Card';
import { Text } from './Text';

interface StatTileProps {
  label: string;
  value: string;
  icon?: keyof typeof Ionicons.glyphMap;
  deltaLabel?: string;
  deltaTone?: 'good' | 'critical' | 'neutral';
  compact?: boolean;
}

/** Stat tile for dashboard/analytics — a hero number + label is often clearer
 * than a chart for a single value (dataviz skill: prefer a stat tile when the
 * job is "a single headline", not magnitude-over-time). */
export function StatTile({ label, value, icon, deltaLabel, deltaTone = 'neutral', compact }: StatTileProps) {
  const theme = useTheme();
  const deltaColor = deltaTone === 'good' ? theme.status.good : deltaTone === 'critical' ? theme.status.critical : theme.colors.mutedForeground;

  return (
    <Card style={[styles.card, compact && styles.compactCard]}>
      <View style={styles.header}>
        <Text variant="caption" tone="muted" numberOfLines={1}>{label}</Text>
        {icon ? <Ionicons name={icon} size={16} color={theme.colors.mutedForeground} /> : null}
      </View>
      <Text variant={compact ? 'subtitle' : 'title'} weight="bold" numberOfLines={1} style={styles.value}>
        {value}
      </Text>
      {deltaLabel ? (
        <Text variant="caption" style={{ color: deltaColor }}>{deltaLabel}</Text>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { flex: 1, minWidth: 140 },
  compactCard: { minWidth: 110 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  value: { marginTop: 2 },
});
