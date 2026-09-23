import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useMemo } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { Card } from '../../components/Card';
import { SalesTrendChart } from '../../components/charts/SalesTrendChart';
import { ErrorState } from '../../components/ErrorState';
import { Screen } from '../../components/Screen';
import { Skeleton } from '../../components/Skeleton';
import { StatTile } from '../../components/StatTile';
import { Text } from '../../components/Text';
import { useBusinessData } from '../../hooks/useBusinessData';
import { api } from '../../lib/api';
import { ExpenseStackParamList } from '../../navigation/types';
import { useTheme } from '../../theme/ThemeProvider';
import { expenseMonthlyTrend, expenseMonthOverMonth, topExpenseCategories } from '../../utils/analytics';
import { formatCurrency, formatCurrencyCompact, formatPercent } from '../../utils/format';

type Props = NativeStackScreenProps<ExpenseStackParamList, 'ExpenseAnalytics'>;

export function ExpenseAnalyticsScreen({}: Props) {
  const theme = useTheme();
  const { data: expenses, loading, refreshing, error, refresh, reload } = useBusinessData(
    (businessId) => api.expense.getAll(businessId),
  );

  const total = useMemo(() => (expenses ?? []).reduce((s, e) => s + e.amount, 0), [expenses]);
  const trend = useMemo(() => expenseMonthlyTrend(expenses ?? []), [expenses]);
  const mom = useMemo(() => expenseMonthOverMonth(expenses ?? []), [expenses]);
  const categories = useMemo(() => topExpenseCategories(expenses ?? []), [expenses]);

  if (error) return <Screen><ErrorState message={error} onRetry={reload} /></Screen>;

  return (
    <Screen edges={['left', 'right']}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={theme.colors.primary} />}
      >
        {loading ? (
          <View style={styles.statsGrid}>{[1, 2].map((i) => <Skeleton key={i} width="47%" height={90} radius={12} />)}</View>
        ) : (
          <View style={styles.statsGrid}>
            <StatTile label="Total Expenses" value={formatCurrencyCompact(total)} icon="wallet-outline" />
            <StatTile label="This Month" value={formatCurrencyCompact(mom.current)} icon="calendar-outline" />
          </View>
        )}

        <Card style={styles.section}>
          <Text variant="subtitle" weight="semibold" style={styles.sectionTitle}>Expense Trend (6 months)</Text>
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
              <Text variant="subtitle" weight="bold" tone={mom.deltaPercent > 0 ? 'destructive' : 'default'}>
                {mom.deltaPercent >= 0 ? '+' : ''}{formatPercent(mom.deltaPercent)}
              </Text>
            </View>
          </View>
        </Card>

        <Text variant="subtitle" weight="semibold" style={styles.sectionTitle}>Top Categories</Text>
        {categories.length === 0 ? (
          <Text variant="body" tone="muted">No expenses recorded</Text>
        ) : (
          categories.map((c, i) => {
            const pct = total > 0 ? (c.value / total) * 100 : 0;
            return (
              <Card key={c.name} style={styles.catCard}>
                <View style={styles.catTop}>
                  <Text variant="body" weight="medium">{c.name}</Text>
                  <Text variant="body" weight="semibold">{formatCurrency(c.value)}</Text>
                </View>
                <View style={[styles.barTrack, { backgroundColor: theme.colors.muted }]}>
                  <View style={[styles.barFill, { width: `${pct}%`, backgroundColor: theme.colors.primary }]} />
                </View>
                <Text variant="caption" tone="muted">{formatPercent(pct)} of total · {c.count} entries</Text>
              </Card>
            );
          })
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 40 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
  section: { marginBottom: 16 },
  sectionTitle: { marginBottom: 12 },
  momRow: { flexDirection: 'row', justifyContent: 'space-between' },
  catCard: { marginBottom: 8, gap: 6 },
  catTop: { flexDirection: 'row', justifyContent: 'space-between' },
  barTrack: { height: 6, borderRadius: 3, overflow: 'hidden' },
  barFill: { height: 6, borderRadius: 3 },
});
