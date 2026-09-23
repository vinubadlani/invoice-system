import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useMemo } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { Card } from '../../components/Card';
import { ErrorState } from '../../components/ErrorState';
import { GradientCard } from '../../components/GradientCard';
import { Screen } from '../../components/Screen';
import { Skeleton } from '../../components/Skeleton';
import { StatTile } from '../../components/StatTile';
import { Text } from '../../components/Text';
import { useBusinessData } from '../../hooks/useBusinessData';
import { api } from '../../lib/api';
import { ItemStackParamList } from '../../navigation/types';
import { useTheme } from '../../theme/ThemeProvider';
import { formatCurrency, formatCurrencyCompact } from '../../utils/format';
import { stockStatus, summarizeInventory } from '../../utils/inventory';

type Props = NativeStackScreenProps<ItemStackParamList, 'InventoryHome'>;

export function InventoryHomeScreen({ navigation }: Props) {
  const theme = useTheme();
  const { data: items, loading, refreshing, error, refresh, reload } = useBusinessData(
    (businessId) => api.item.getAll(businessId),
  );

  const summary = useMemo(() => summarizeInventory(items ?? []), [items]);
  const lowStockItems = useMemo(() => (items ?? []).filter((i) => stockStatus(i) !== 'ok').slice(0, 8), [items]);

  if (error) return <Screen><ErrorState message={error} onRetry={reload} /></Screen>;

  return (
    <Screen edges={['top', 'left', 'right']}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={theme.colors.primary} />}
      >
        <Text variant="title" weight="bold" style={styles.heading}>Inventory</Text>

        {loading ? (
          <Skeleton width="100%" height={140} radius={theme.radius.xl} style={styles.heroSkeleton} />
        ) : (
          <GradientCard style={styles.hero}>
            <Text variant="label" style={styles.heroLabel}>Stock Value</Text>
            <Text variant="title" weight="bold" style={styles.heroValue}>{formatCurrency(summary.stockValue)}</Text>
            <View style={styles.heroFooter}>
              <View style={styles.heroChip}>
                <Ionicons name="cube-outline" size={14} color="#fff" />
                <Text variant="caption" style={styles.heroChipText}>{summary.totalItems} items</Text>
              </View>
              {summary.outOfStockCount > 0 ? (
                <View style={styles.heroChip}>
                  <Ionicons name="close-circle-outline" size={14} color="#fff" />
                  <Text variant="caption" style={styles.heroChipText}>{summary.outOfStockCount} out of stock</Text>
                </View>
              ) : null}
            </View>
          </GradientCard>
        )}

        {loading ? (
          <View style={styles.statsGrid}>
            {[1, 2, 3].map((i) => <Skeleton key={i} width="31%" height={80} radius={12} />)}
          </View>
        ) : (
          <View style={styles.statsGrid}>
            <StatTile compact label="Total Items" value={String(summary.totalItems)} icon="cube-outline" />
            <StatTile compact label="Low Stock" value={String(summary.lowStockCount)} icon="alert-circle-outline" deltaTone={summary.lowStockCount > 0 ? 'critical' : 'neutral'} />
            <StatTile compact label="Out of Stock" value={String(summary.outOfStockCount)} icon="close-circle-outline" deltaTone={summary.outOfStockCount > 0 ? 'critical' : 'neutral'} />
          </View>
        )}

        <Pressable onPress={() => navigation.navigate('ItemList')}>
          <Card style={styles.viewAll}>
            <Text variant="body" weight="semibold" tone="primary">View all items</Text>
            <Ionicons name="arrow-forward" size={16} color={theme.colors.primary} />
          </Card>
        </Pressable>

        {lowStockItems.length > 0 ? (
          <>
            <Text variant="subtitle" weight="semibold" style={styles.sectionTitle}>Needs attention</Text>
            <Card style={styles.attentionCard} padded={false}>
              {lowStockItems.map((item, idx) => {
                const status = stockStatus(item);
                return (
                  <Pressable key={item.id} onPress={() => navigation.navigate('ItemForm', { itemId: item.id })}>
                    <View style={[styles.itemRow, idx > 0 && { borderTopWidth: 1, borderTopColor: theme.colors.border }]}>
                      <View style={[styles.itemIconWrap, { backgroundColor: status === 'out' ? theme.status.critical + '1a' : theme.status.warning + '1a' }]}>
                        <Ionicons name="cube-outline" size={18} color={status === 'out' ? theme.status.critical : theme.status.warning} />
                      </View>
                      <Text variant="body" weight="medium" numberOfLines={1} style={styles.itemName}>{item.name}</Text>
                      <Text variant="caption" tone={status === 'out' ? 'destructive' : 'muted'}>
                        {status === 'out' ? 'Out of stock' : `${item.opening_stock} ${item.unit} left`}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </Card>
          </>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 40 },
  heading: { marginBottom: 16 },
  heroSkeleton: { marginBottom: 16 },
  hero: { marginBottom: 16 },
  heroLabel: { color: 'rgba(255,255,255,0.85)' },
  heroValue: { color: '#fff', marginTop: 6, fontSize: 30 },
  heroFooter: { flexDirection: 'row', gap: 10, marginTop: 16, flexWrap: 'wrap' },
  heroChip: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.16)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
  heroChipText: { color: '#fff' },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
  viewAll: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 20 },
  sectionTitle: { marginBottom: 10 },
  attentionCard: { overflow: 'hidden' },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12 },
  itemIconWrap: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  itemName: { flex: 1, marginRight: 8 },
});
