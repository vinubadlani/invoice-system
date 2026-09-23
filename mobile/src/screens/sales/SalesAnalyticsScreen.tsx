import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useMemo, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { SalesTrendChart } from '../../components/charts/SalesTrendChart';
import { ErrorState } from '../../components/ErrorState';
import { Screen } from '../../components/Screen';
import { Skeleton } from '../../components/Skeleton';
import { StatTile } from '../../components/StatTile';
import { Text } from '../../components/Text';
import { useBusinessData } from '../../hooks/useBusinessData';
import { api } from '../../lib/api';
import { SalesStackParamList } from '../../navigation/types';
import { useTheme } from '../../theme/ThemeProvider';
import {
  computeSalesSummary,
  DateRangePreset,
  filterInvoicesByRange,
  monthlyTrend,
  monthOverMonth,
  paymentCollection,
  resolveDateRange,
  topCustomers,
  topProducts,
} from '../../utils/analytics';
import { formatCurrency, formatCurrencyCompact, formatPercent } from '../../utils/format';

type Props = NativeStackScreenProps<SalesStackParamList, 'SalesAnalytics'>;

const PRESETS: { label: string; value: DateRangePreset }[] = [
  { label: 'Today', value: 'today' },
  { label: '7 Days', value: 'week' },
  { label: 'This Month', value: 'month' },
  { label: 'Prev Month', value: 'prevMonth' },
  { label: 'FY', value: 'fy' },
];

export function SalesAnalyticsScreen({}: Props) {
  const theme = useTheme();
  const [preset, setPreset] = useState<DateRangePreset>('month');

  const { data: invoices, loading, refreshing, error, refresh, reload } = useBusinessData(
    (businessId) => api.invoice.getAll(businessId, 'sales'),
  );

  const range = useMemo(() => resolveDateRange(preset), [preset]);
  const filtered = useMemo(() => filterInvoicesByRange(invoices ?? [], range), [invoices, range]);

  const summary = useMemo(() => computeSalesSummary(filtered), [filtered]);
  const trend = useMemo(() => monthlyTrend(invoices ?? []), [invoices]);
  const mom = useMemo(() => monthOverMonth(invoices ?? []), [invoices]);
  const customers = useMemo(() => topCustomers(filtered), [filtered]);
  const products = useMemo(() => topProducts(filtered), [filtered]);
  const collection = useMemo(() => paymentCollection(filtered), [filtered]);

  if (error) return <Screen><ErrorState message={error} onRetry={reload} /></Screen>;

  return (
    <Screen edges={['left', 'right']}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={theme.colors.primary} />}
      >
        <View style={styles.presetRow}>
          {PRESETS.map((p) => (
            <Button key={p.value} label={p.label} size="sm" variant={preset === p.value ? 'primary' : 'outline'} onPress={() => setPreset(p.value)} style={styles.presetChip} />
          ))}
        </View>

        {loading ? (
          <View style={styles.statsGrid}>{[1, 2, 3, 4].map((i) => <Skeleton key={i} width="47%" height={90} radius={12} />)}</View>
        ) : (
          <View style={styles.statsGrid}>
            <StatTile label="Total Sales" value={formatCurrencyCompact(summary.totalSales)} icon="trending-up-outline" />
            <StatTile label="Invoices" value={String(summary.invoiceCount)} icon="receipt-outline" />
            <StatTile label="Avg. Invoice" value={formatCurrencyCompact(summary.averageInvoiceValue)} icon="calculator-outline" />
            <StatTile label="Outstanding" value={formatCurrencyCompact(summary.outstanding)} icon="alert-circle-outline" deltaTone={summary.outstanding > 0 ? 'critical' : 'neutral'} />
          </View>
        )}

        <Card style={styles.section}>
          <Text variant="subtitle" weight="semibold" style={styles.sectionTitle}>Sales Trend (6 months)</Text>
          {loading ? <Skeleton width="100%" height={160} radius={12} /> : <SalesTrendChart points={trend} />}
        </Card>

        <Card style={styles.section}>
          <Text variant="subtitle" weight="semibold" style={styles.sectionTitle}>This Month vs Last Month</Text>
          <View style={styles.momRow}>
            <View>
              <Text variant="caption" tone="muted">This Month</Text>
              <Text variant="subtitle" weight="bold">{formatCurrency(mom.current)}</Text>
            </View>
            <View>
              <Text variant="caption" tone="muted">Last Month</Text>
              <Text variant="subtitle" weight="bold">{formatCurrency(mom.previous)}</Text>
            </View>
            <View>
              <Text variant="caption" tone="muted">Change</Text>
              <Text variant="subtitle" weight="bold" tone={mom.deltaPercent >= 0 ? 'default' : 'destructive'} style={mom.deltaPercent >= 0 ? { color: theme.status.good } : undefined}>
                {mom.deltaPercent >= 0 ? '+' : ''}{formatPercent(mom.deltaPercent)}
              </Text>
            </View>
          </View>
        </Card>

        <Card style={styles.section}>
          <Text variant="subtitle" weight="semibold" style={styles.sectionTitle}>Payment Collection</Text>
          <View style={styles.momRow}>
            <View>
              <Text variant="caption" tone="muted">Collected</Text>
              <Text variant="subtitle" weight="bold" style={{ color: theme.status.good }}>{formatCurrency(collection.collected)}</Text>
            </View>
            <View>
              <Text variant="caption" tone="muted">Pending</Text>
              <Text variant="subtitle" weight="bold" tone="destructive">{formatCurrency(collection.pending)}</Text>
            </View>
          </View>
        </Card>

        <Text variant="subtitle" weight="semibold" style={styles.sectionTitle}>Top Customers</Text>
        {customers.length === 0 ? <Text variant="body" tone="muted">No sales in this period</Text> : customers.map((c, i) => (
          <RankRow key={c.name} rank={i + 1} name={c.name} value={formatCurrency(c.value)} sub={`${c.count} invoice${c.count === 1 ? '' : 's'}`} />
        ))}

        <Text variant="subtitle" weight="semibold" style={styles.sectionTitle}>Top Products</Text>
        {products.length === 0 ? <Text variant="body" tone="muted">No sales in this period</Text> : products.map((p, i) => (
          <RankRow key={p.name} rank={i + 1} name={p.name} value={formatCurrency(p.value)} sub={`${p.count} sold`} />
        ))}
      </ScrollView>
    </Screen>
  );
}

function RankRow({ rank, name, value, sub }: { rank: number; name: string; value: string; sub: string }) {
  const theme = useTheme();
  return (
    <Card style={styles.rankCard}>
      <View style={styles.rankRow}>
        <View style={[styles.rankBadge, { backgroundColor: theme.colors.accent }]}>
          <Text variant="caption" weight="bold" tone="primary">{rank}</Text>
        </View>
        <View style={styles.rankInfo}>
          <Text variant="body" weight="medium" numberOfLines={1}>{name}</Text>
          <Text variant="caption" tone="muted">{sub}</Text>
        </View>
        <Text variant="body" weight="semibold">{value}</Text>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 40 },
  presetRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  presetChip: {},
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
  section: { marginBottom: 16 },
  sectionTitle: { marginBottom: 12 },
  momRow: { flexDirection: 'row', justifyContent: 'space-between' },
  rankCard: { marginBottom: 8 },
  rankRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  rankBadge: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  rankInfo: { flex: 1 },
});
