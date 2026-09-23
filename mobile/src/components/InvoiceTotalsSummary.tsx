import React from 'react';
import { StyleSheet, View } from 'react-native';
import { InvoiceTotals, TaxMode } from '../utils/gst';
import { formatCurrency } from '../utils/format';
import { Card } from './Card';
import { Text } from './Text';
import { useTheme } from '../theme/ThemeProvider';

interface InvoiceTotalsSummaryProps {
  totals: InvoiceTotals;
  gstEnabled: boolean;
  taxMode: TaxMode;
}

export function InvoiceTotalsSummary({ totals, gstEnabled, taxMode }: InvoiceTotalsSummaryProps) {
  const theme = useTheme();
  return (
    <Card style={styles.card}>
      <Row label="Subtotal" value={formatCurrency(totals.subtotal)} />
      {totals.discountAmount > 0 ? <Row label="Discount" value={`- ${formatCurrency(totals.discountAmount)}`} /> : null}
      <Row label="Taxable Amount" value={formatCurrency(totals.taxableAmount)} />

      {gstEnabled ? (
        taxMode === 'intra' ? (
          <>
            <Row label="CGST" value={formatCurrency(totals.cgst)} />
            <Row label="SGST" value={formatCurrency(totals.sgst)} />
          </>
        ) : (
          <Row label="IGST" value={formatCurrency(totals.igst)} />
        )
      ) : (
        <Row label="GST" value="Not applicable" muted />
      )}

      {totals.otherCharges > 0 ? <Row label="Other Charges" value={formatCurrency(totals.otherCharges)} /> : null}
      {totals.roundOff !== 0 ? <Row label="Round Off" value={formatCurrency(totals.roundOff)} /> : null}

      <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />
      <Row label="Grand Total" value={formatCurrency(totals.netTotal)} bold />
      <Row label="Payment Received" value={formatCurrency(totals.paymentReceived)} />
      <Row label="Balance Due" value={formatCurrency(totals.balanceDue)} bold tone={totals.balanceDue > 0 ? 'destructive' : 'default'} />
    </Card>
  );
}

function Row({ label, value, bold, muted, tone }: { label: string; value: string; bold?: boolean; muted?: boolean; tone?: 'default' | 'destructive' }) {
  return (
    <View style={styles.row}>
      <Text variant="body" tone={muted ? 'muted' : 'default'}>{label}</Text>
      <Text variant="body" weight={bold ? 'bold' : 'regular'} tone={tone ?? (muted ? 'muted' : 'default')}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { gap: 8 },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  divider: { height: 1, marginVertical: 6 },
});
