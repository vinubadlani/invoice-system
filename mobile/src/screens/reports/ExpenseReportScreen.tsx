import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Card } from '../../components/Card';
import { ErrorState } from '../../components/ErrorState';
import { Screen } from '../../components/Screen';
import { Text } from '../../components/Text';
import { useBusinessData } from '../../hooks/useBusinessData';
import { api } from '../../lib/api';
import { ReportStackParamList } from '../../navigation/types';
import { topExpenseCategories } from '../../utils/analytics';
import { formatCurrency, formatPercent } from '../../utils/format';

type Props = NativeStackScreenProps<ReportStackParamList, 'ExpenseReport'>;

export function ExpenseReportScreen({}: Props) {
  const { data: expenses, loading, error, reload } = useBusinessData((businessId) => api.expense.getAll(businessId));

  const total = useMemo(() => (expenses ?? []).reduce((s, e) => s + e.amount, 0), [expenses]);
  const categories = useMemo(() => topExpenseCategories(expenses ?? [], 20), [expenses]);

  if (error) return <Screen><ErrorState message={error} onRetry={reload} /></Screen>;
  if (loading) return <Screen><></></Screen>;

  return (
    <Screen edges={['left', 'right']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Card style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <Text variant="body" tone="muted">Total Expenses</Text>
            <Text variant="body" weight="bold">{formatCurrency(total)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text variant="body" tone="muted">Entries</Text>
            <Text variant="body" weight="medium">{expenses?.length ?? 0}</Text>
          </View>
        </Card>

        <Text variant="subtitle" weight="semibold" style={styles.sectionTitle}>Category-wise Breakdown</Text>
        <Card style={styles.tableCard}>
          {categories.length === 0 ? (
            <Text variant="body" tone="muted">No expenses recorded</Text>
          ) : (
            categories.map((c) => (
              <View key={c.name} style={styles.tableRow}>
                <Text variant="body" numberOfLines={1} style={styles.flex}>{c.name}</Text>
                <Text variant="caption" tone="muted">{formatPercent(total > 0 ? (c.value / total) * 100 : 0)}</Text>
                <Text variant="body" weight="medium">{formatCurrency(c.value)}</Text>
              </View>
            ))
          )}
        </Card>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 40 },
  summaryCard: { gap: 8, marginBottom: 16 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between' },
  sectionTitle: { marginBottom: 10 },
  tableCard: { gap: 10, marginBottom: 16 },
  tableRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  flex: { flex: 1 },
});
