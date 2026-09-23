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
import { formatCurrency } from '../../utils/format';
import { computeOutstandingByParty, totalOverdue } from '../../utils/outstandingReport';

type Props = NativeStackScreenProps<ReportStackParamList, 'OutstandingReport'>;

export function OutstandingReportScreen({}: Props) {
  const { data: invoices, loading, error, reload } = useBusinessData((businessId) => api.invoice.getAll(businessId));

  const receivables = useMemo(() => computeOutstandingByParty(invoices ?? [], 'sales'), [invoices]);
  const payables = useMemo(() => computeOutstandingByParty(invoices ?? [], 'purchase'), [invoices]);
  const overdue = useMemo(() => totalOverdue(invoices ?? []), [invoices]);

  if (error) return <Screen><ErrorState message={error} onRetry={reload} /></Screen>;
  if (loading) return <Screen><></></Screen>;

  return (
    <Screen edges={['left', 'right']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Card style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <Text variant="body" tone="muted">Total Receivable</Text>
            <Text variant="body" weight="bold">{formatCurrency(receivables.reduce((s, r) => s + r.amount, 0))}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text variant="body" tone="muted">Total Payable</Text>
            <Text variant="body" weight="bold">{formatCurrency(payables.reduce((s, r) => s + r.amount, 0))}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text variant="body" tone="muted">Overdue</Text>
            <Text variant="body" weight="bold" tone="destructive">{formatCurrency(overdue)}</Text>
          </View>
        </Card>

        <Text variant="subtitle" weight="semibold" style={styles.sectionTitle}>Customer Outstanding</Text>
        <Card style={styles.tableCard}>
          {receivables.length === 0 ? <Text variant="body" tone="muted">All caught up</Text> : receivables.map((r) => (
            <View key={r.partyName} style={styles.tableRow}>
              <View style={styles.flex}>
                <Text variant="body" numberOfLines={1}>{r.partyName}</Text>
                <Text variant="caption" tone="muted">{r.invoiceCount} invoice{r.invoiceCount === 1 ? '' : 's'}{r.overdueCount > 0 ? ` · ${r.overdueCount} overdue` : ''}</Text>
              </View>
              <Text variant="body" weight="medium" tone={r.overdueCount > 0 ? 'destructive' : 'default'}>{formatCurrency(r.amount)}</Text>
            </View>
          ))}
        </Card>

        <Text variant="subtitle" weight="semibold" style={styles.sectionTitle}>Supplier Outstanding</Text>
        <Card style={styles.tableCard}>
          {payables.length === 0 ? <Text variant="body" tone="muted">All caught up</Text> : payables.map((r) => (
            <View key={r.partyName} style={styles.tableRow}>
              <View style={styles.flex}>
                <Text variant="body" numberOfLines={1}>{r.partyName}</Text>
                <Text variant="caption" tone="muted">{r.invoiceCount} bill{r.invoiceCount === 1 ? '' : 's'}{r.overdueCount > 0 ? ` · ${r.overdueCount} overdue` : ''}</Text>
              </View>
              <Text variant="body" weight="medium" tone={r.overdueCount > 0 ? 'destructive' : 'default'}>{formatCurrency(r.amount)}</Text>
            </View>
          ))}
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
  tableCard: { gap: 12, marginBottom: 16 },
  tableRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  flex: { flex: 1 },
});
