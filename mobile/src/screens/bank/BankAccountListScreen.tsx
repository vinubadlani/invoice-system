import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, View } from 'react-native';
import { Card } from '../../components/Card';
import { EmptyState } from '../../components/EmptyState';
import { ErrorState } from '../../components/ErrorState';
import { FAB } from '../../components/FAB';
import { Screen } from '../../components/Screen';
import { SkeletonListItem } from '../../components/Skeleton';
import { Text } from '../../components/Text';
import { useBusinessData } from '../../hooks/useBusinessData';
import { api } from '../../lib/api';
import { BankAccount } from '../../lib/types';
import { BankStackParamList } from '../../navigation/types';
import { useTheme } from '../../theme/ThemeProvider';
import { formatCurrency } from '../../utils/format';

type Props = NativeStackScreenProps<BankStackParamList, 'BankAccountList'>;

export function BankAccountListScreen({ navigation }: Props) {
  const theme = useTheme();
  const { data: accounts, loading, refreshing, error, refresh, reload } = useBusinessData(
    (businessId) => api.bankAccount.getAll(businessId),
  );

  if (error) return <Screen><ErrorState message={error} onRetry={reload} /></Screen>;

  return (
    <Screen edges={['left', 'right']}>
      {loading ? (
        <View>{[1, 2, 3].map((i) => <SkeletonListItem key={i} />)}</View>
      ) : (
        <FlatList
          data={accounts ?? []}
          keyExtractor={(a) => a.id}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={theme.colors.primary} />}
          ListEmptyComponent={
            <EmptyState
              icon="card-outline"
              title="No bank accounts yet"
              description="Add a bank account to track deposits, withdrawals and expenses."
              actionLabel="Add Bank Account"
              onAction={() => navigation.navigate('BankAccountForm', undefined)}
            />
          }
          renderItem={({ item }: { item: BankAccount }) => (
            <Pressable onPress={() => navigation.navigate('BankTransactionList', { accountId: item.id })}>
              <Card style={styles.card}>
                <View style={styles.row}>
                  <View style={styles.info}>
                    <Text variant="subtitle" weight="semibold">{item.bank_name}</Text>
                    <Text variant="caption" tone="muted">{item.account_holder_name} · ••••{item.account_number.slice(-4)}</Text>
                    <Text variant="caption" tone="muted">{item.account_type} · {item.branch_name}</Text>
                  </View>
                  <Text variant="subtitle" weight="bold">{formatCurrency(item.current_balance)}</Text>
                </View>
              </Card>
            </Pressable>
          )}
        />
      )}

      <FAB onPress={() => navigation.navigate('BankAccountForm', undefined)} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: { paddingHorizontal: 16, paddingBottom: 100, gap: 10 },
  card: { marginBottom: 0 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  info: { flex: 1, gap: 2 },
});
