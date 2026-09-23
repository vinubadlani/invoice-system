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
import { Party } from '../../lib/types';
import { LedgerStackParamList } from '../../navigation/types';
import { useTheme } from '../../theme/ThemeProvider';

type Props = NativeStackScreenProps<LedgerStackParamList, 'LedgerHome'>;

export function LedgerHomeScreen({ navigation }: Props) {
  const theme = useTheme();
  const [query, setQuery] = useState('');

  const { data: parties, loading, refreshing, error, refresh, reload } = useBusinessData(
    (businessId) => api.party.getAll(businessId),
  );

  const filtered = useMemo(() => {
    if (!parties) return [];
    if (!query.trim()) return parties;
    const q = query.trim().toLowerCase();
    return parties.filter((p) => p.name.toLowerCase().includes(q));
  }, [parties, query]);

  if (error) return <Screen><ErrorState message={error} onRetry={reload} /></Screen>;

  return (
    <Screen edges={['left', 'right']}>
      <SearchBar value={query} onChangeText={setQuery} placeholder="Search party…" />

      {loading ? (
        <View>{[1, 2, 3, 4].map((i) => <SkeletonListItem key={i} />)}</View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(p) => p.id}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={theme.colors.primary} />}
          ListEmptyComponent={<EmptyState icon="book-outline" title="No parties yet" description="Add a party to see their ledger." />}
          renderItem={({ item }: { item: Party }) => (
            <Pressable onPress={() => navigation.navigate('PartyLedger', { partyId: item.id })}>
              <Card style={styles.card}>
                <Text variant="body" weight="semibold">{item.name}</Text>
                <Text variant="caption" tone="muted">{item.type} · {item.mobile}</Text>
              </Card>
            </Pressable>
          )}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: { paddingHorizontal: 16, paddingBottom: 40, gap: 10 },
  card: { marginBottom: 0, gap: 2 },
});
