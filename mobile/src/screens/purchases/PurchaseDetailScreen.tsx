import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useEffect, useLayoutEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Card } from '../../components/Card';
import { ErrorState } from '../../components/ErrorState';
import { InvoiceDetailHero } from '../../components/InvoiceDetailHero';
import { Screen } from '../../components/Screen';
import { Text } from '../../components/Text';
import { api } from '../../lib/api';
import { Business, Invoice, Party } from '../../lib/types';
import { PurchaseStackParamList } from '../../navigation/types';
import { useBusinessStore } from '../../store/businessStore';
import { toast } from '../../store/toastStore';
import { useTheme } from '../../theme/ThemeProvider';
import { confirm } from '../../utils/confirm';
import { showFullError } from '../../utils/errorAlert';
import { formatCurrency } from '../../utils/format';
import { extractLineItems } from '../../utils/invoiceItems';
import { shareInvoicePdf } from '../../utils/invoicePdf';

type Props = NativeStackScreenProps<PurchaseStackParamList, 'PurchaseDetail'>;

export function PurchaseDetailScreen({ route, navigation }: Props) {
  const theme = useTheme();
  const { invoiceId } = route.params;
  const selectedBusiness = useBusinessStore((s) => s.selectedBusiness);

  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [party, setParty] = useState<Party | undefined>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sharing, setSharing] = useState(false);

  const load = async () => {
    if (!selectedBusiness) return;
    setLoading(true);
    setError(null);
    try {
      const [inv] = await api.invoice.getById(invoiceId);
      setInvoice(inv ?? null);
      if (inv?.party_id) {
        const parties = await api.party.getAll(selectedBusiness.id);
        setParty(parties.find((p) => p.id === inv.party_id));
      }
    } catch (e: any) {
      setError(e.message ?? 'Could not load bill');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [invoiceId]);

  useLayoutEffect(() => {
    navigation.setOptions({ title: invoice?.invoice_no ?? 'Purchase' });
  }, [invoice, navigation]);

  const handleDelete = async () => {
    if (!invoice) return;
    const ok = await confirm({ title: 'Delete bill?', message: `This permanently deletes bill ${invoice.invoice_no}.`, confirmLabel: 'Delete', destructive: true });
    if (!ok) return;
    try {
      await api.invoice.delete(invoice.id);
      toast.success('Bill deleted');
      navigation.goBack();
    } catch (e: any) {
      toast.error(e.message ?? 'Could not delete bill');
    }
  };

  const handleShare = async () => {
    if (!invoice || !selectedBusiness) return;
    setSharing(true);
    try {
      await shareInvoicePdf(invoice, selectedBusiness as Business, party);
    } catch (e: any) {
      showFullError('Could not share PDF', e);
    } finally {
      setSharing(false);
    }
  };

  if (error) return <Screen><ErrorState message={error} onRetry={load} /></Screen>;
  if (loading || !invoice) return <Screen><></></Screen>;

  const lineItems = extractLineItems(invoice.items);
  const description = lineItems.length > 0 ? (lineItems.length === 1 ? lineItems[0].item_name : `${lineItems[0].item_name} +${lineItems.length - 1} more`) : '—';

  return (
    <Screen edges={['left', 'right']}>
      <ScrollView contentContainerStyle={styles.content}>
        <InvoiceDetailHero
          invoiceNo={invoice.invoice_no}
          partyName={invoice.party_name}
          description={description}
          date={invoice.date}
          dueDate={invoice.due_date}
          amount={invoice.net_total}
          status={invoice.status}
          actions={[
            { label: 'Edit Purchase', icon: 'create-outline', onPress: () => navigation.navigate('PurchaseEntry', { invoiceId: invoice.id }) },
            { label: sharing ? 'Preparing PDF…' : 'Share PDF', icon: 'share-outline', onPress: handleShare },
            { label: 'Delete Bill', icon: 'trash-outline', onPress: handleDelete, destructive: true },
          ]}
        />

        <Text variant="subtitle" weight="semibold" style={styles.sectionTitle}>Items</Text>
        <Card style={styles.servicesCard} padded={false}>
          {lineItems.map((li, idx) => (
            <View key={idx} style={[styles.lineRow, idx > 0 && { borderTopWidth: 1, borderTopColor: theme.colors.border }]}>
              <View style={styles.lineInfo}>
                <Text variant="body" weight="medium">{li.item_name}</Text>
                <Text variant="caption" tone="muted">QTY {li.quantity} × {formatCurrency(li.rate)}</Text>
              </View>
              <Text variant="body" weight="semibold">{formatCurrency(li.total_amount)}</Text>
            </View>
          ))}
        </Card>

        <Card style={styles.totalsCard}>
          <TotalRow label="Subtotal" value={formatCurrency(invoice.subtotal)} />
          {invoice.discount_amount > 0 ? <TotalRow label="Discount" value={`- ${formatCurrency(invoice.discount_amount)}`} /> : null}
          <TotalRow label="Total Tax" value={formatCurrency(invoice.total_tax)} />
          {invoice.round_off ? <TotalRow label="Round Off" value={formatCurrency(invoice.round_off)} /> : null}
          <TotalRow label="Grand Total" value={formatCurrency(invoice.net_total)} bold />
          <TotalRow label="Payment Made" value={formatCurrency(invoice.payment_received)} />
          <TotalRow
            label="Balance Payable"
            value={formatCurrency(invoice.balance_due)}
            bold
            color={invoice.balance_due > 0 ? theme.status.critical : theme.status.good}
          />
        </Card>
      </ScrollView>
    </Screen>
  );
}

function TotalRow({ label, value, bold, color }: { label: string; value: string; bold?: boolean; color?: string }) {
  return (
    <View style={styles.totalRow}>
      <Text variant="body">{label}</Text>
      <Text variant="body" weight={bold ? 'bold' : 'regular'} style={color ? { color } : undefined}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 40 },
  sectionTitle: { marginBottom: 10 },
  servicesCard: { marginBottom: 16, overflow: 'hidden' },
  lineRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
  lineInfo: { flex: 1 },
  totalsCard: { gap: 8 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between' },
});
