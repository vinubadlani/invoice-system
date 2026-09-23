import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useEffect, useLayoutEffect, useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Badge } from '../../components/Badge';
import { Card } from '../../components/Card';
import { ErrorState } from '../../components/ErrorState';
import { Screen } from '../../components/Screen';
import { Text } from '../../components/Text';
import { api } from '../../lib/api';
import { Invoice, Party, Payment } from '../../lib/types';
import { PartyStackParamList } from '../../navigation/types';
import { useBusinessStore } from '../../store/businessStore';
import { toast } from '../../store/toastStore';
import { confirm } from '../../utils/confirm';
import { currentBalance, computePartyLedger } from '../../utils/ledger';
import { formatCurrency } from '../../utils/format';
import { useTheme } from '../../theme/ThemeProvider';

type Props = NativeStackScreenProps<PartyStackParamList, 'PartyDetail'>;

export function PartyDetailScreen({ route, navigation }: Props) {
  const theme = useTheme();
  const { partyId } = route.params;
  const selectedBusiness = useBusinessStore((s) => s.selectedBusiness);

  const [party, setParty] = useState<Party | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    if (!selectedBusiness) return;
    setLoading(true);
    setError(null);
    try {
      const [parties, allInvoices, allPayments] = await Promise.all([
        api.party.getAll(selectedBusiness.id),
        api.invoice.getAll(selectedBusiness.id),
        api.payment.getAll(selectedBusiness.id),
      ]);
      setParty(parties.find((p) => p.id === partyId) ?? null);
      setInvoices(allInvoices);
      setPayments(allPayments);
    } catch (e: any) {
      setError(e.message ?? 'Could not load party');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [partyId, selectedBusiness?.id]);

  useLayoutEffect(() => {
    navigation.setOptions({ title: party?.name ?? 'Party' });
  }, [party, navigation]);

  const handleDelete = async () => {
    if (!party) return;
    const ok = await confirm({
      title: 'Delete party?',
      message: `This permanently deletes "${party.name}". This cannot be undone.`,
      confirmLabel: 'Delete',
      destructive: true,
    });
    if (!ok) return;
    try {
      await api.party.delete(party.id);
      toast.success('Party deleted');
      navigation.goBack();
    } catch (e: any) {
      toast.error(e.message ?? 'Could not delete party');
    }
  };

  if (error) return <Screen><ErrorState message={error} onRetry={load} /></Screen>;
  if (loading || !party) return <Screen><></></Screen>;

  const ledger = computePartyLedger(party, invoices, payments);
  const balance = currentBalance(ledger);
  const partyInvoices = invoices.filter((i) => i.party_id === party.id || i.party_name === party.name);

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
        <Card style={styles.headerCard}>
          <View style={styles.headerRow}>
            <Badge label={party.type} tone={party.type === 'Debtor' ? 'primary' : party.type === 'Creditor' ? 'warning' : 'neutral'} />
          </View>
          <Text variant="caption" tone="muted" style={styles.balanceLabel}>
            {balance.label === 'Dr' ? 'Receivable (owes you)' : 'Payable (you owe)'}
          </Text>
          <Text variant="title" weight="bold" tone={balance.label === 'Dr' ? 'default' : 'destructive'}>
            {formatCurrency(balance.amount)} {balance.label}
          </Text>

          <View style={styles.actionsRow}>
            <Pressable style={styles.actionBtn} onPress={() => Linking.openURL(`tel:${party.mobile}`)}>
              <Ionicons name="call-outline" size={20} color={theme.colors.primary} />
              <Text variant="caption" tone="primary">Call</Text>
            </Pressable>
            <Pressable style={styles.actionBtn} onPress={() => navigation.navigate('PartyForm', { partyId: party.id })}>
              <Ionicons name="create-outline" size={20} color={theme.colors.primary} />
              <Text variant="caption" tone="primary">Edit</Text>
            </Pressable>
            <Pressable style={styles.actionBtn} onPress={handleDelete}>
              <Ionicons name="trash-outline" size={20} color={theme.colors.destructive} />
              <Text variant="caption" tone="destructive">Delete</Text>
            </Pressable>
          </View>
        </Card>

        <Card style={styles.infoCard}>
          <InfoRow label="Mobile" value={party.mobile} />
          {party.email ? <InfoRow label="Email" value={party.email} /> : null}
          {party.gstin ? <InfoRow label="GSTIN" value={party.gstin} /> : null}
          <InfoRow label="Address" value={`${party.address}, ${party.city}, ${party.state} - ${party.pincode}`} />
        </Card>

        <Text variant="subtitle" weight="semibold" style={styles.sectionTitle}>
          Recent Transactions ({partyInvoices.length})
        </Text>
        {partyInvoices.slice(0, 10).map((inv) => (
          <Card key={inv.id} style={styles.txnCard}>
            <View style={styles.txnRow}>
              <View style={styles.txnInfo}>
                <Text variant="body" weight="medium">{inv.invoice_no}</Text>
                <Text variant="caption" tone="muted">{inv.type === 'sales' ? 'Sales Invoice' : 'Purchase Bill'} · {inv.date}</Text>
              </View>
              <Text variant="body" weight="semibold">{formatCurrency(inv.net_total)}</Text>
            </View>
          </Card>
        ))}
      </ScrollView>
    </Screen>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text variant="caption" tone="muted" style={styles.infoLabel}>{label}</Text>
      <Text variant="body" style={styles.infoValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 40, gap: 12 },
  headerCard: { alignItems: 'center', gap: 4 },
  headerRow: { marginBottom: 4 },
  balanceLabel: { marginTop: 6 },
  actionsRow: { flexDirection: 'row', gap: 24, marginTop: 16 },
  actionBtn: { alignItems: 'center', gap: 4 },
  infoCard: { gap: 10 },
  infoRow: { flexDirection: 'row', gap: 8 },
  infoLabel: { width: 70 },
  infoValue: { flex: 1 },
  sectionTitle: { marginTop: 4 },
  txnCard: { marginBottom: 0 },
  txnRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  txnInfo: {},
});
