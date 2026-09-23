import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useEffect, useLayoutEffect, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { Badge } from '../../components/Badge';
import { Card } from '../../components/Card';
import { EmptyState } from '../../components/EmptyState';
import { ErrorState } from '../../components/ErrorState';
import { FAB } from '../../components/FAB';
import { Screen } from '../../components/Screen';
import { Text } from '../../components/Text';
import { api } from '../../lib/api';
import { BankAccount, BankTransaction } from '../../lib/types';
import { BankStackParamList } from '../../navigation/types';
import { useBusinessStore } from '../../store/businessStore';
import { useTheme } from '../../theme/ThemeProvider';
import { formatCurrency, formatDateShort } from '../../utils/format';

type Props = NativeStackScreenProps<BankStackParamList, 'BankTransactionList'>;

export function BankTransactionListScreen({ route, navigation }: Props) {
  const theme = useTheme();
  const { accountId } = route.params;
  const selectedBusiness = useBusinessStore((s) => s.selectedBusiness);

  const [account, setAccount] = useState<BankAccount | null>(null);
  const [transactions, setTransactions] = useState<BankTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async (isRefresh = false) => {
    if (!selectedBusiness) return;
    isRefresh ? setRefreshing(true) : setLoading(true);
    setError(null);
    try {
      const [accounts, allTxns] = await Promise.all([
        api.bankAccount.getAll(selectedBusiness.id),
        api.bankTransaction.getAll(selectedBusiness.id),
      ]);
      const acc = accounts.find((a) => a.id === accountId) ?? null;
      setAccount(acc);
      setTransactions(
        acc ? allTxns.filter((t) => t.account_no === acc.account_number).sort((a, b) => b.date.localeCompare(a.date)) : [],
      );
    } catch (e: any) {
      setError(e.message ?? 'Could not load transactions');
    } finally {
      isRefresh ? setRefreshing(false) : setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [accountId, selectedBusiness?.id]);

  useLayoutEffect(() => {
    navigation.setOptions({ title: account?.bank_name ?? 'Transactions' });
  }, [account, navigation]);

  if (error) return <Screen><ErrorState message={error} onRetry={() => load()} /></Screen>;

  return (
    <Screen edges={['left', 'right']}>
      {account ? (
        <View style={styles.header}>
          <Text variant="caption" tone="muted">Current Balance</Text>
          <Text variant="title" weight="bold">{formatCurrency(account.current_balance)}</Text>
        </View>
      ) : null}

      <FlatList
        data={transactions}
        keyExtractor={(t) => t.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={theme.colors.primary} />}
        ListEmptyComponent={
          !loading ? (
            <EmptyState icon="swap-vertical-outline" title="No transactions yet" description="Record a deposit, withdrawal or expense." />
          ) : null
        }
        renderItem={({ item }) => (
          <Card style={styles.card}>
            <View style={styles.row}>
              <View style={styles.info}>
                <Text variant="body" weight="medium" numberOfLines={1}>{item.purpose}</Text>
                <Text variant="caption" tone="muted">{formatDateShort(item.date)}</Text>
              </View>
              <View style={styles.right}>
                <Text
                  variant="body"
                  weight="semibold"
                  style={{ color: item.type === 'Deposit' ? theme.status.good : theme.status.critical }}
                >
                  {item.type === 'Deposit' ? '+' : '-'}{formatCurrency(item.amount)}
                </Text>
                <Badge label={item.type} tone={item.type === 'Deposit' ? 'good' : item.type === 'Withdrawal' ? 'warning' : 'critical'} />
              </View>
            </View>
          </Card>
        )}
      />

      <FAB onPress={() => navigation.navigate('BankTransactionForm', { accountId })} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 16 },
  list: { paddingHorizontal: 16, paddingBottom: 100, gap: 10 },
  card: { marginBottom: 0 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  info: { flex: 1, marginRight: 8 },
  right: { alignItems: 'flex-end', gap: 6 },
});
