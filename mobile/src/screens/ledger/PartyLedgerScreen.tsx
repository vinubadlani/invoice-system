import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useEffect, useLayoutEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Card } from '../../components/Card';
import { ErrorState } from '../../components/ErrorState';
import { Screen } from '../../components/Screen';
import { Text } from '../../components/Text';
import { api } from '../../lib/api';
import { Invoice, LedgerEntry, Party, Payment } from '../../lib/types';
import { LedgerStackParamList } from '../../navigation/types';
import { useBusinessStore } from '../../store/businessStore';
import { useTheme } from '../../theme/ThemeProvider';
import { formatCurrency, formatDateShort } from '../../utils/format';
import { computePartyLedger, currentBalance } from '../../utils/ledger';

type Props = NativeStackScreenProps<LedgerStackParamList, 'PartyLedger'>;

export function PartyLedgerScreen({ route, navigation }: Props) {
  const theme = useTheme();
  const { partyId } = route.params;
  const selectedBusiness = useBusinessStore((s) => s.selectedBusiness);

  const [party, setParty] = useState<Party | null>(null);
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    if (!selectedBusiness) return;
    setLoading(true);
    setError(null);
    try {
      const [parties, invoices, payments] = await Promise.all([
        api.party.getAll(selectedBusiness.id),
        api.invoice.getAll(selectedBusiness.id),
        api.payment.getAll(selectedBusiness.id),
      ]);
      const p = parties.find((x) => x.id === partyId) ?? null;
      setParty(p);
      if (p) setEntries(computePartyLedger(p, invoices as Invoice[], payments as Payment[]));
    } catch (e: any) {
      setError(e.message ?? 'Could not load ledger');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [partyId, selectedBusiness?.id]);

  useLayoutEffect(() => {
    navigation.setOptions({ title: party ? `${party.name} — Ledger` : 'Ledger' });
  }, [party, navigation]);

  if (error) return <Screen><ErrorState message={error} onRetry={load} /></Screen>;
  if (loading || !party) return <Screen><></></Screen>;

  const balance = currentBalance(entries);

  return (
    <Screen edges={['left', 'right']}>
      <View style={styles.header}>
        <Text variant="caption" tone="muted">Current Balance</Text>
        <Text variant="title" weight="bold" tone={balance.label === 'Dr' ? 'default' : 'destructive'}>
          {formatCurrency(balance.amount)} {balance.label}
        </Text>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator style={styles.tableScroll}>
        <View>
          <View style={[styles.tableHeader, { borderColor: theme.colors.border }]}>
            <Text variant="caption" weight="semibold" style={styles.colDate}>Date</Text>
            <Text variant="caption" weight="semibold" style={styles.colParticulars}>Particulars</Text>
            <Text variant="caption" weight="semibold" style={styles.colAmount}>Debit</Text>
            <Text variant="caption" weight="semibold" style={styles.colAmount}>Credit</Text>
            <Text variant="caption" weight="semibold" style={styles.colAmount}>Balance</Text>
          </View>
          <ScrollView contentContainerStyle={styles.tableBody}>
            {entries.map((entry) => (
              <View key={entry.id} style={[styles.tableRow, { borderColor: theme.colors.border }]}>
                <Text variant="caption" style={styles.colDate}>{entry.date ? formatDateShort(entry.date) : '—'}</Text>
                <Text variant="caption" style={styles.colParticulars} numberOfLines={2}>{entry.particulars}</Text>
                <Text variant="caption" style={styles.colAmount}>{entry.debit > 0 ? formatCurrency(entry.debit) : '—'}</Text>
                <Text variant="caption" style={styles.colAmount}>{entry.credit > 0 ? formatCurrency(entry.credit) : '—'}</Text>
                <Text variant="caption" weight="semibold" style={styles.colAmount}>{formatCurrency(Math.abs(entry.balance))}</Text>
              </View>
            ))}
          </ScrollView>
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12 },
  tableScroll: { flex: 1 },
  tableHeader: { flexDirection: 'row', borderBottomWidth: 1, paddingHorizontal: 16, paddingBottom: 8 },
  tableRow: { flexDirection: 'row', borderBottomWidth: 1, paddingHorizontal: 16, paddingVertical: 10 },
  tableBody: { paddingBottom: 24 },
  colDate: { width: 80 },
  colParticulars: { width: 180 },
  colAmount: { width: 100, textAlign: 'right' },
});
