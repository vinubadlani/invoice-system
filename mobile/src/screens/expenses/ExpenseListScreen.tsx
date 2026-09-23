import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useMemo, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, View } from 'react-native';
import { Card } from '../../components/Card';
import { EmptyState } from '../../components/EmptyState';
import { ErrorState } from '../../components/ErrorState';
import { Screen } from '../../components/Screen';
import { SearchBar } from '../../components/SearchBar';
import { SkeletonListItem } from '../../components/Skeleton';
import { Text } from '../../components/Text';
import { useBusinessData } from '../../hooks/useBusinessData';
import { api } from '../../lib/api';
import { Expense } from '../../lib/types';
import { ExpenseStackParamList } from '../../navigation/types';
import { useTheme } from '../../theme/ThemeProvider';
import { formatCurrency, formatDateShort } from '../../utils/format';

type Props = NativeStackScreenProps<ExpenseStackParamList, 'ExpenseList'>;

export function ExpenseListScreen({ navigation }: Props) {
  const theme = useTheme();
  const [query, setQuery] = useState('');

  const { data: expenses, loading, refreshing, error, refresh, reload } = useBusinessData(
    (businessId) => api.expense.getAll(businessId),
  );

  const filtered = useMemo(() => {
    let list = [...(expenses ?? [])].sort((a, b) => b.date.localeCompare(a.date));
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      list = list.filter((e) => e.category.toLowerCase().includes(q) || e.description.toLowerCase().includes(q));
    }
    return list;
  }, [expenses, query]);

  const total = useMemo(() => (expenses ?? []).reduce((s, e) => s + e.amount, 0), [expenses]);

  if (error) return <Screen><ErrorState message={error} onRetry={reload} /></Screen>;

  return (
    <Screen edges={['left', 'right']}>
      {!loading ? (
        <View style={styles.summary}>
          <Text variant="caption" tone="muted">Total Expenses</Text>
          <Text variant="title" weight="bold">{formatCurrency(total)}</Text>
        </View>
      ) : null}

      <SearchBar value={query} onChangeText={setQuery} placeholder="Search category or description…" />

      {loading ? (
        <View>{[1, 2, 3, 4, 5].map((i) => <SkeletonListItem key={i} />)}</View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(e) => e.id}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={theme.colors.primary} />}
          ListEmptyComponent={
            <EmptyState
              icon="receipt-outline"
              title={query ? 'No matching expenses' : 'No expenses yet'}
              description={query ? 'Try a different search.' : 'Log your first business expense.'}
              actionLabel={!query ? 'Add Expense' : undefined}
              onAction={!query ? () => navigation.navigate('ExpenseForm', undefined) : undefined}
            />
          }
          renderItem={({ item }: { item: Expense }) => (
            <Pressable onPress={() => navigation.navigate('ExpenseForm', { expenseId: item.id })}>
              <Card style={styles.card}>
                <View style={styles.row}>
                  <View style={styles.info}>
                    <Text variant="body" weight="semibold" numberOfLines={1}>{item.category}</Text>
                    <Text variant="caption" tone="muted" numberOfLines={1}>{item.description}</Text>
                    <Text variant="caption" tone="muted">{formatDateShort(item.date)}</Text>
                  </View>
                  <Text variant="body" weight="semibold" tone="destructive">-{formatCurrency(item.amount)}</Text>
                </View>
              </Card>
            </Pressable>
          )}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  summary: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12 },
  list: { paddingHorizontal: 16, paddingBottom: 100, gap: 10 },
  card: { marginBottom: 0 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  info: { flex: 1, marginRight: 8, gap: 2 },
});
