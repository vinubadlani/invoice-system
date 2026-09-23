import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useMemo, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, View } from 'react-native';
import { Badge } from '../../components/Badge';
import { Card } from '../../components/Card';
import { EmptyState } from '../../components/EmptyState';
import { ErrorState } from '../../components/ErrorState';
import { Screen } from '../../components/Screen';
import { SearchBar } from '../../components/SearchBar';
import { BottomSheet } from '../../components/BottomSheet';
import { SkeletonListItem } from '../../components/Skeleton';
import { Text } from '../../components/Text';
import { useBusinessData } from '../../hooks/useBusinessData';
import { api } from '../../lib/api';
import { Party, PartyType } from '../../lib/types';
import { PartyStackParamList } from '../../navigation/types';
import { useTheme } from '../../theme/ThemeProvider';
import { formatCurrencyCompact } from '../../utils/format';

type Props = NativeStackScreenProps<PartyStackParamList, 'PartyList'>;

const TYPE_FILTERS: { label: string; value: PartyType | 'all' }[] = [
  { label: 'All', value: 'all' },
  { label: 'Customers (Debtor)', value: 'Debtor' },
  { label: 'Suppliers (Creditor)', value: 'Creditor' },
  { label: 'Expense Parties', value: 'Expense' },
];

export function PartyListScreen({ navigation }: Props) {
  const theme = useTheme();
  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<PartyType | 'all'>('all');
  const [filterOpen, setFilterOpen] = useState(false);

  const { data: parties, loading, refreshing, error, refresh, reload } = useBusinessData(
    (businessId) => api.party.getAll(businessId),
  );

  const filtered = useMemo(() => {
    let list = parties ?? [];
    if (typeFilter !== 'all') list = list.filter((p) => p.type === typeFilter);
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      list = list.filter(
        (p) => p.name.toLowerCase().includes(q) || p.mobile.includes(q) || p.gstin?.toLowerCase().includes(q),
      );
    }
    return list;
  }, [parties, typeFilter, query]);

  if (error) {
    return (
      <Screen>
        <ErrorState message={error} onRetry={reload} />
      </Screen>
    );
  }

  return (
    <Screen edges={['left', 'right']}>
      <SearchBar
        value={query}
        onChangeText={setQuery}
        placeholder="Search parties, mobile, GSTIN…"
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
              icon="people-outline"
              title={query || typeFilter !== 'all' ? 'No matching parties' : 'No parties yet'}
              description={query || typeFilter !== 'all' ? 'Try a different search or filter.' : 'Add your first customer or supplier.'}
              actionLabel={!query && typeFilter === 'all' ? 'Add Party' : undefined}
              onAction={!query && typeFilter === 'all' ? () => navigation.navigate('PartyForm', undefined) : undefined}
            />
          }
          renderItem={({ item }: { item: Party }) => (
            <Pressable onPress={() => navigation.navigate('PartyDetail', { partyId: item.id })}>
              <Card style={styles.card}>
                <View style={styles.row}>
                  <View style={[styles.avatar, { backgroundColor: theme.colors.accent }]}>
                    <Text variant="subtitle" tone="primary">{item.name.charAt(0).toUpperCase()}</Text>
                  </View>
                  <View style={styles.info}>
                    <Text variant="subtitle" weight="semibold" numberOfLines={1}>{item.name}</Text>
                    <Text variant="caption" tone="muted">{item.mobile}{item.city ? ` · ${item.city}` : ''}</Text>
                  </View>
                  <View style={styles.right}>
                    <Badge label={item.type} tone={item.type === 'Debtor' ? 'primary' : item.type === 'Creditor' ? 'warning' : 'neutral'} />
                    <Text variant="caption" tone="muted" style={styles.balance}>
                      {formatCurrencyCompact(item.opening_balance)}
                    </Text>
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
            <Pressable
              key={f.value}
              onPress={() => {
                setTypeFilter(f.value);
                setFilterOpen(false);
              }}
              style={styles.filterOption}
            >
              <Text variant="body" weight={typeFilter === f.value ? 'semibold' : 'regular'}>{f.label}</Text>
              {typeFilter === f.value ? <Ionicons name="checkmark" size={18} color={theme.colors.primary} /> : null}
            </Pressable>
          ))}
        </View>
      </BottomSheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: { paddingHorizontal: 16, paddingBottom: 100, gap: 10 },
  card: { marginBottom: 0 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  info: { flex: 1 },
  right: { alignItems: 'flex-end', gap: 4 },
  balance: {},
  sheetPad: { paddingHorizontal: 20, paddingBottom: 24 },
  sheetTitle: { marginBottom: 8 },
  filterOption: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14 },
});
