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
import { computeSalesSummary, monthlyTrend, topCustomers, topProducts } from '../../utils/analytics';
import { formatCurrency } from '../../utils/format';

type Props = NativeStackScreenProps<ReportStackParamList, 'SalesReport'>;

export function SalesReportScreen({}: Props) {
  const { data: invoices, loading, error, reload } = useBusinessData((businessId) => api.invoice.getAll(businessId, 'sales'));

  const summary = useMemo(() => computeSalesSummary(invoices ?? []), [invoices]);
  const trend = useMemo(() => monthlyTrend(invoices ?? [], 12), [invoices]);
  const customers = useMemo(() => topCustomers(invoices ?? [], 10), [invoices]);
  const products = useMemo(() => topProducts(invoices ?? [], 10), [invoices]);

  if (error) return <Screen><ErrorState message={error} onRetry={reload} /></Screen>;
  if (loading) return <Screen><></></Screen>;

  return (
    <Screen edges={['left', 'right']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Card style={styles.summaryCard}>
          <SummaryRow label="Total Sales" value={formatCurrency(summary.totalSales)} bold />
          <SummaryRow label="Invoices" value={String(summary.invoiceCount)} />
          <SummaryRow label="Average Invoice" value={formatCurrency(summary.averageInvoiceValue)} />
          <SummaryRow label="Paid" value={String(summary.paidCount)} />
          <SummaryRow label="Partially Paid" value={String(summary.partialCount)} />
          <SummaryRow label="Unpaid" value={String(summary.unpaidCount)} />
          <SummaryRow label="Outstanding" value={formatCurrency(summary.outstanding)} />
        </Card>

        <Text variant="subtitle" weight="semibold" style={styles.sectionTitle}>Monthly Sales (12 months)</Text>
        <Card style={styles.tableCard}>
          {trend.map((m) => (
            <View key={m.label} style={styles.tableRow}>
              <Text variant="body">{m.label}</Text>
              <Text variant="body" weight="medium">{formatCurrency(m.value)}</Text>
            </View>
          ))}
        </Card>

        <Text variant="subtitle" weight="semibold" style={styles.sectionTitle}>Sales by Customer</Text>
        <Card style={styles.tableCard}>
          {customers.length === 0 ? <Text variant="body" tone="muted">No data</Text> : customers.map((c) => (
            <View key={c.name} style={styles.tableRow}>
              <Text variant="body" numberOfLines={1} style={styles.flex}>{c.name}</Text>
              <Text variant="body" weight="medium">{formatCurrency(c.value)}</Text>
            </View>
          ))}
        </Card>

        <Text variant="subtitle" weight="semibold" style={styles.sectionTitle}>Sales by Product</Text>
        <Card style={styles.tableCard}>
          {products.length === 0 ? <Text variant="body" tone="muted">No data</Text> : products.map((p) => (
            <View key={p.name} style={styles.tableRow}>
              <Text variant="body" numberOfLines={1} style={styles.flex}>{p.name}</Text>
              <Text variant="body" weight="medium">{formatCurrency(p.value)}</Text>
            </View>
          ))}
        </Card>
      </ScrollView>
    </Screen>
  );
}

function SummaryRow({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <View style={styles.summaryRow}>
      <Text variant="body" tone="muted">{label}</Text>
      <Text variant="body" weight={bold ? 'bold' : 'medium'}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 40 },
  summaryCard: { gap: 8, marginBottom: 16 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between' },
  sectionTitle: { marginBottom: 10 },
  tableCard: { gap: 10, marginBottom: 16 },
  tableRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  flex: { flex: 1 },
});
