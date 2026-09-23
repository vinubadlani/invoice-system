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
import { computeGstReport, computeHsnSummary } from '../../utils/gstReport';
import { formatCurrency } from '../../utils/format';

type Props = NativeStackScreenProps<ReportStackParamList, 'GstReport'>;

export function GstReportScreen({}: Props) {
  const { data: invoices, loading, error, reload } = useBusinessData((businessId) => api.invoice.getAll(businessId, 'sales'));

  const gst = useMemo(() => computeGstReport(invoices ?? []), [invoices]);
  const hsnRows = useMemo(() => computeHsnSummary(invoices ?? []), [invoices]);

  if (error) return <Screen><ErrorState message={error} onRetry={reload} /></Screen>;
  if (loading) return <Screen><></></Screen>;

  return (
    <Screen edges={['left', 'right']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Card style={styles.summaryCard}>
          <SummaryRow label="Taxable Amount" value={formatCurrency(gst.taxableAmount)} />
          <SummaryRow label="CGST" value={formatCurrency(gst.cgst)} />
          <SummaryRow label="SGST" value={formatCurrency(gst.sgst)} />
          <SummaryRow label="IGST" value={formatCurrency(gst.igst)} />
          <SummaryRow label="Total GST" value={formatCurrency(gst.totalGst)} bold />
        </Card>

        <Text variant="subtitle" weight="semibold" style={styles.sectionTitle}>HSN Summary</Text>
        <Card style={styles.tableCard}>
          <View style={styles.hsnHeader}>
            <Text variant="caption" weight="semibold" style={styles.hsnCode}>HSN</Text>
            <Text variant="caption" weight="semibold" style={styles.hsnAmount}>Taxable</Text>
            <Text variant="caption" weight="semibold" style={styles.hsnAmount}>GST</Text>
          </View>
          {hsnRows.length === 0 ? (
            <Text variant="body" tone="muted">No sales data</Text>
          ) : (
            hsnRows.map((row) => (
              <View key={row.hsn} style={styles.hsnRow}>
                <Text variant="body" style={styles.hsnCode}>{row.hsn}</Text>
                <Text variant="body" style={styles.hsnAmount}>{formatCurrency(row.taxableAmount)}</Text>
                <Text variant="body" style={styles.hsnAmount}>{formatCurrency(row.gstAmount)}</Text>
              </View>
            ))
          )}
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
  hsnHeader: { flexDirection: 'row', gap: 8 },
  hsnRow: { flexDirection: 'row', gap: 8 },
  hsnCode: { flex: 1 },
  hsnAmount: { width: 90, textAlign: 'right' },
});
