import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useMemo, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, View } from 'react-native';
import { Badge } from '../../components/Badge';
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
import { Payment, PaymentDirection } from '../../lib/types';
import { PaymentStackParamList } from '../../navigation/types';
import { useTheme } from '../../theme/ThemeProvider';
import { formatCurrency, formatDateShort } from '../../utils/format';

type Props = NativeStackScreenProps<PaymentStackParamList, 'PaymentList'>;

const TYPE_FILTERS: { label: string; value: PaymentDirection | 'all' }[] = [
  { label: 'All', value: 'all' },
  { label: 'Received', value: 'Received' },
  { label: 'Paid', value: 'Paid' },
];

export function PaymentListScreen({ navigation }: Props) {
  const theme = useTheme();
  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<PaymentDirection | 'all'>('all');
  const [filterOpen, setFilterOpen] = useState(false);

  const { data: payments, loading, refreshing, error, refresh, reload } = useBusinessData(
    (businessId) => api.payment.getAll(businessId),
  );

  const filtered = useMemo(() => {
    let list = payments ?? [];
    if (typeFilter !== 'all') list = list.filter((p) => p.type === typeFilter);
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      list = list.filter((p) => p.party_name.toLowerCase().includes(q) || p.invoice_no?.toLowerCase().includes(q));
    }
    return [...list].sort((a, b) => b.date.localeCompare(a.date));
  }, [payments, typeFilter, query]);

  const summary = useMemo(() => {
    const received = (payments ?? []).filter((p) => p.type === 'Received').reduce((s, p) => s + p.amount, 0);
    const paid = (payments ?? []).filter((p) => p.type === 'Paid').reduce((s, p) => s + p.amount, 0);
    return { received, paid };
  }, [payments]);

  if (error) return <Screen><ErrorState message={error} onRetry={reload} /></Screen>;

  return (
    <Screen edges={['left', 'right']}>
      {!loading ? (
        <View style={styles.summaryRow}>
          <SummaryChip label="Received" value={formatCurrency(summary.received)} tone="good" />
          <SummaryChip label="Paid" value={formatCurrency(summary.paid)} tone="critical" />
        </View>
      ) : null}

      <SearchBar
        value={query}
        onChangeText={setQuery}
        placeholder="Search party or invoice…"
        onFilterPress={() => setFilterOpen(true)}
        filterActive={typeFilter !== 'all'}
      />

      {loading ? (
        <View>{[1, 2, 3, 4, 5].map((i) => <SkeletonListItem key={i} />)}</View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(p) => p.id}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={theme.colors.primary} />}
          ListEmptyComponent={
            <EmptyState
              icon="cash-outline"
              title={query || typeFilter !== 'all' ? 'No matching payments' : 'No payments yet'}
              description={query || typeFilter !== 'all' ? 'Try a different search or filter.' : 'Record a payment in or out.'}
              actionLabel={!query && typeFilter === 'all' ? 'Add Payment' : undefined}
              onAction={!query && typeFilter === 'all' ? () => navigation.navigate('PaymentForm', undefined) : undefined}
            />
          }
          renderItem={({ item }: { item: Payment }) => (
            <Pressable onPress={() => navigation.navigate('PaymentForm', { paymentId: item.id })}>
              <Card style={styles.card}>
                <View style={styles.row}>
                  <View style={styles.info}>
                    <Text variant="body" weight="semibold" numberOfLines={1}>{item.party_name}</Text>
                    <Text variant="caption" tone="muted">{item.mode} {item.invoice_no ? `· ${item.invoice_no}` : ''}</Text>
                    <Text variant="caption" tone="muted">{formatDateShort(item.date)}</Text>
                  </View>
                  <View style={styles.right}>
                    <Text variant="body" weight="semibold" style={{ color: item.type === 'Received' ? theme.status.good : theme.status.critical }}>
                      {item.type === 'Received' ? '+' : '-'}{formatCurrency(item.amount)}
                    </Text>
                    <Badge label={item.type} tone={item.type === 'Received' ? 'good' : 'critical'} />
                  </View>
                </View>
              </Card>
            </Pressable>
          )}
        />
      )}

      <BottomSheet visible={filterOpen} onClose={() => setFilterOpen(false)}>
        <View style={styles.sheetPad}>
          <Text variant="subtitle" weight="semibold" style={styles.sheetTitle}>Filter by type</Text>
          {TYPE_FILTERS.map((f) => (
            <Pressable key={f.value} onPress={() => { setTypeFilter(f.value); setFilterOpen(false); }} style={styles.filterOption}>
              <Text variant="body" weight={typeFilter === f.value ? 'semibold' : 'regular'}>{f.label}</Text>
              {typeFilter === f.value ? <Ionicons name="checkmark" size={18} color={theme.colors.primary} /> : null}
            </Pressable>
          ))}
        </View>
      </BottomSheet>
    </Screen>
  );
}

function SummaryChip({ label, value, tone }: { label: string; value: string; tone: 'good' | 'critical' }) {
  const theme = useTheme();
  return (
    <View style={styles.summaryChip}>
      <Text variant="caption" tone="muted">{label}</Text>
      <Text variant="body" weight="semibold" style={{ color: tone === 'good' ? theme.status.good : theme.status.critical }}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  summaryRow: { flexDirection: 'row', paddingHorizontal: 16, paddingTop: 12, gap: 24 },
  summaryChip: {},
  list: { paddingHorizontal: 16, paddingBottom: 100, gap: 10 },
  card: { marginBottom: 0 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  info: { flex: 1, marginRight: 8, gap: 2 },
  right: { alignItems: 'flex-end', gap: 6 },
  sheetPad: { paddingHorizontal: 20, paddingBottom: 24 },
  sheetTitle: { marginBottom: 8 },
  filterOption: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14 },
});
