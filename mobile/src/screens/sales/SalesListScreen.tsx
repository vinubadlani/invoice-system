import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useMemo, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, View } from 'react-native';
import { Badge, statusToTone } from '../../components/Badge';
import { BottomSheet } from '../../components/BottomSheet';
import { Card } from '../../components/Card';
import { EmptyState } from '../../components/EmptyState';
import { ErrorState } from '../../components/ErrorState';
import { Screen } from '../../components/Screen';
import { SearchBar } from '../../components/SearchBar';
import { SkeletonListItem } from '../../components/Skeleton';
import { Text } from '../../components/Text';
import { useBusinessData } from '../../hooks/useBusinessData';
import { api } from '../../lib/api';
import { Invoice, InvoiceStatus } from '../../lib/types';
import { SalesStackParamList } from '../../navigation/types';
import { useTheme } from '../../theme/ThemeProvider';
import { formatCurrency, formatDateShort } from '../../utils/format';

type Props = NativeStackScreenProps<SalesStackParamList, 'SalesList'>;

const STATUS_FILTERS: { label: string; value: InvoiceStatus | 'all' }[] = [
  { label: 'All', value: 'all' },
  { label: 'Paid', value: 'paid' },
  { label: 'Partially Paid', value: 'partial' },
  { label: 'Unpaid / Sent', value: 'sent' },
  { label: 'Overdue', value: 'overdue' },
  { label: 'Draft', value: 'draft' },
];

export function SalesListScreen({ navigation }: Props) {
  const theme = useTheme();
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<InvoiceStatus | 'all'>('all');
  const [filterOpen, setFilterOpen] = useState(false);

  const { data: invoices, loading, refreshing, error, refresh, reload } = useBusinessData(
    (businessId) => api.invoice.getAll(businessId, 'sales'),
  );

  const filtered = useMemo(() => {
    let list = invoices ?? [];
    if (statusFilter !== 'all') list = list.filter((i) => i.status === statusFilter);
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      list = list.filter((i) => i.invoice_no.toLowerCase().includes(q) || i.party_name.toLowerCase().includes(q));
    }
    return [...list].sort((a, b) => b.date.localeCompare(a.date));
  }, [invoices, statusFilter, query]);

  const summary = useMemo(() => {
    const total = (invoices ?? []).reduce((s, i) => s + i.net_total, 0);
    const outstanding = (invoices ?? []).reduce((s, i) => s + (i.balance_due > 0 ? i.balance_due : 0), 0);
    return { total, outstanding, count: invoices?.length ?? 0 };
  }, [invoices]);

  if (error) return <Screen><ErrorState message={error} onRetry={reload} /></Screen>;

  return (
    <Screen edges={['left', 'right']}>
      {!loading ? (
        <View style={styles.summaryRow}>
          <SummaryChip label="Invoices" value={String(summary.count)} />
          <SummaryChip label="Total" value={formatCurrency(summary.total)} />
          <SummaryChip label="Outstanding" value={formatCurrency(summary.outstanding)} tone="critical" />
        </View>
      ) : null}

      <SearchBar
        value={query}
        onChangeText={setQuery}
        placeholder="Search invoice no. or customer…"
        onFilterPress={() => setFilterOpen(true)}
        filterActive={statusFilter !== 'all'}
      />

      {loading ? (
        <View>{[1, 2, 3, 4, 5].map((i) => <SkeletonListItem key={i} />)}</View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(i) => i.id}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={theme.colors.primary} />}
          ListEmptyComponent={
            <EmptyState
              icon="receipt-outline"
              title={query || statusFilter !== 'all' ? 'No matching sales' : 'No sales yet'}
              description={query || statusFilter !== 'all' ? 'Try a different search or filter.' : 'Create your first sales invoice.'}
              actionLabel={!query && statusFilter === 'all' ? 'New Sale' : undefined}
              onAction={!query && statusFilter === 'all' ? () => navigation.navigate('SalesEntry', undefined) : undefined}
            />
          }
          renderItem={({ item }: { item: Invoice }) => (
            <Pressable onPress={() => navigation.navigate('SalesDetail', { invoiceId: item.id })}>
              <Card style={styles.card}>
                <View style={styles.row}>
                  <View style={styles.info}>
                    <Text variant="body" weight="semibold" numberOfLines={1}>{item.invoice_no}</Text>
                    <Text variant="caption" tone="muted" numberOfLines={1}>{item.party_name}</Text>
                    <Text variant="caption" tone="muted">{formatDateShort(item.date)}</Text>
                  </View>
                  <View style={styles.right}>
                    <Text variant="body" weight="semibold">{formatCurrency(item.net_total)}</Text>
                    <Badge label={item.status} tone={statusToTone(item.status)} />
                  </View>
                </View>
              </Card>
            </Pressable>
          )}
        />
      )}

      <BottomSheet visible={filterOpen} onClose={() => setFilterOpen(false)}>
        <View style={styles.sheetPad}>
          <Text variant="subtitle" weight="semibold" style={styles.sheetTitle}>Filter by status</Text>
          {STATUS_FILTERS.map((f) => (
            <Pressable key={f.value} onPress={() => { setStatusFilter(f.value); setFilterOpen(false); }} style={styles.filterOption}>
              <Text variant="body" weight={statusFilter === f.value ? 'semibold' : 'regular'}>{f.label}</Text>
              {statusFilter === f.value ? <Ionicons name="checkmark" size={18} color={theme.colors.primary} /> : null}
            </Pressable>
          ))}
        </View>
      </BottomSheet>
    </Screen>
  );
}

function SummaryChip({ label, value, tone }: { label: string; value: string; tone?: 'critical' }) {
  return (
    <View style={styles.summaryChip}>
      <Text variant="caption" tone="muted">{label}</Text>
      <Text variant="body" weight="semibold" tone={tone === 'critical' ? 'destructive' : 'default'}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  summaryRow: { flexDirection: 'row', paddingHorizontal: 16, paddingTop: 12, gap: 16 },
  summaryChip: { flex: 1 },
  list: { paddingHorizontal: 16, paddingBottom: 100, gap: 10 },
  card: { marginBottom: 0 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  info: { flex: 1, marginRight: 8, gap: 2 },
  right: { alignItems: 'flex-end', gap: 6 },
  sheetPad: { paddingHorizontal: 20, paddingBottom: 24 },
  sheetTitle: { marginBottom: 8 },
  filterOption: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14 },
});
