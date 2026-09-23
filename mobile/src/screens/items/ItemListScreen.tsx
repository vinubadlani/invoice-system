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
import { SkeletonListItem } from '../../components/Skeleton';
import { Text } from '../../components/Text';
import { useBusinessData } from '../../hooks/useBusinessData';
import { api } from '../../lib/api';
import { Item } from '../../lib/types';
import { ItemStackParamList } from '../../navigation/types';
import { useTheme } from '../../theme/ThemeProvider';
import { formatCurrency } from '../../utils/format';
import { stockStatus } from '../../utils/inventory';

type Props = NativeStackScreenProps<ItemStackParamList, 'ItemList'>;

export function ItemListScreen({ navigation }: Props) {
  const theme = useTheme();
  const [query, setQuery] = useState('');

  const { data: items, loading, refreshing, error, refresh, reload } = useBusinessData(
    (businessId) => api.item.getAll(businessId),
  );

  const filtered = useMemo(() => {
    if (!items) return [];
    if (!query.trim()) return items;
    const q = query.trim().toLowerCase();
    return items.filter((i) => i.name.toLowerCase().includes(q) || i.code.toLowerCase().includes(q) || i.hsn_code?.toLowerCase().includes(q));
  }, [items, query]);

  if (error) return <Screen><ErrorState message={error} onRetry={reload} /></Screen>;

  return (
    <Screen edges={['left', 'right']}>
      <SearchBar value={query} onChangeText={setQuery} placeholder="Search items, code, HSN…" />

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
              icon="cube-outline"
              title={query ? 'No matching items' : 'No items yet'}
              description={query ? 'Try a different search.' : 'Add products or services you sell.'}
              actionLabel={!query ? 'Add Item' : undefined}
              onAction={!query ? () => navigation.navigate('ItemForm', undefined) : undefined}
            />
          }
          renderItem={({ item }: { item: Item }) => {
            const status = stockStatus(item);
            return (
              <Pressable onPress={() => navigation.navigate('ItemForm', { itemId: item.id })}>
                <Card style={styles.card}>
                  <View style={styles.row}>
                    <View style={[styles.avatar, { backgroundColor: theme.colors.accent }]}>
                      <Ionicons name="cube-outline" size={20} color={theme.colors.primary} />
                    </View>
                    <View style={styles.info}>
                      <Text variant="subtitle" weight="semibold" numberOfLines={1}>{item.name}</Text>
                      <Text variant="caption" tone="muted">
                        {item.code} · {item.unit} · GST {item.gst_percent}%
                      </Text>
                    </View>
                    <View style={styles.right}>
                      <Text variant="body" weight="semibold">{formatCurrency(item.sales_price)}</Text>
                      <Badge
                        label={status === 'out' ? 'Out of stock' : status === 'low' ? `Low: ${item.opening_stock}` : `Stock: ${item.opening_stock}`}
                        tone={status === 'out' ? 'critical' : status === 'low' ? 'warning' : 'good'}
                      />
                    </View>
                  </View>
                </Card>
              </Pressable>
            );
          }}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: { paddingHorizontal: 16, paddingBottom: 24, gap: 10 },
  card: { marginBottom: 0 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  info: { flex: 1 },
  right: { alignItems: 'flex-end', gap: 6 },
});
