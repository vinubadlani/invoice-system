import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { endOfMonth, format, startOfMonth } from 'date-fns';
import React, { useEffect, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { Card } from '../../components/Card';
import { Sparkline } from '../../components/charts/Sparkline';
import { ErrorState } from '../../components/ErrorState';
import { GradientCard } from '../../components/GradientCard';
import { Screen } from '../../components/Screen';
import { Skeleton } from '../../components/Skeleton';
import { StatTile } from '../../components/StatTile';
import { Text } from '../../components/Text';
import { api } from '../../lib/api';
import { Expense, Invoice, Payment } from '../../lib/types';
import { DashboardStackParamList } from '../../navigation/types';
import { useBusinessStore } from '../../store/businessStore';
import { useTheme } from '../../theme/ThemeProvider';
import { dailyTrend, weekOverWeek } from '../../utils/analytics';
import { formatCurrency, formatCurrencyCompact, formatDateShort, formatPercent } from '../../utils/format';
import { outstandingTotals } from '../../utils/ledger';

type Props = NativeStackScreenProps<DashboardStackParamList, 'DashboardHome'>;

const TODAY_KEY = format(new Date(), 'yyyy-MM-dd');

export function DashboardHomeScreen({ navigation }: Props) {
  const theme = useTheme();
  const selectedBusiness = useBusinessStore((s) => s.selectedBusiness);
  const switchToken = useBusinessStore((s) => s.switchToken);
  const nav = navigation as any;

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async (isRefresh = false) => {
    if (!selectedBusiness) return;
    isRefresh ? setRefreshing(true) : setLoading(true);
    setError(null);
    try {
      const [inv, pay, exp] = await Promise.all([
        api.invoice.getAll(selectedBusiness.id),
        api.payment.getAll(selectedBusiness.id),
        api.expense.getAll(selectedBusiness.id),
      ]);
      setInvoices(inv);
      setPayments(pay);
      setExpenses(exp);
    } catch (e: any) {
      setError(e.message ?? 'Could not load dashboard');
    } finally {
      isRefresh ? setRefreshing(false) : setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [selectedBusiness?.id, switchToken]);

  if (error) return <Screen><ErrorState message={error} onRetry={() => load()} /></Screen>;

  const salesInvoices = invoices.filter((i) => i.type === 'sales');
  const todaySales = salesInvoices.filter((i) => i.date === TODAY_KEY).reduce((s, i) => s + i.net_total, 0);
  const todayPurchases = invoices.filter((i) => i.type === 'purchase' && i.date === TODAY_KEY).reduce((s, i) => s + i.net_total, 0);
  const todayReceived = payments.filter((p) => p.type === 'Received' && p.date === TODAY_KEY).reduce((s, p) => s + p.amount, 0);
  const todayPaid = payments.filter((p) => p.type === 'Paid' && p.date === TODAY_KEY).reduce((s, p) => s + p.amount, 0);
  const todayExpenses = expenses.filter((e) => e.date === TODAY_KEY).reduce((s, e) => s + e.amount, 0);

  const now = new Date();
  const monthStart = format(startOfMonth(now), 'yyyy-MM-dd');
  const monthEnd = format(endOfMonth(now), 'yyyy-MM-dd');
  const inMonth = (d: string) => d >= monthStart && d <= monthEnd;

  const monthSales = salesInvoices.filter((i) => inMonth(i.date)).reduce((s, i) => s + i.net_total, 0);
  const monthPurchases = invoices.filter((i) => i.type === 'purchase' && inMonth(i.date)).reduce((s, i) => s + i.net_total, 0);
  const monthExpenses = expenses.filter((e) => inMonth(e.date)).reduce((s, e) => s + e.amount, 0);
  const { totalReceivable, totalPayable } = outstandingTotals(invoices);
  const outstandingInvoiceCount = invoices.filter((i) => (i.balance_due ?? 0) > 0).length;

  const trendPoints = dailyTrend(salesInvoices);
  const wow = weekOverWeek(salesInvoices);

  const recentActivity = [
    ...invoices.map((i) => ({ id: i.id, date: i.date, label: i.party_name, sub: i.type === 'sales' ? 'Sale' : 'Purchase', amount: i.net_total, positive: i.type === 'sales', status: i.status })),
    ...payments.map((p) => ({ id: p.id, date: p.date, label: p.party_name, sub: p.type === 'Received' ? 'Payment' : 'Payment sent', amount: p.amount, positive: p.type === 'Received', status: p.type })),
    ...expenses.map((e) => ({ id: e.id, date: e.date, label: e.category, sub: 'Expense', amount: e.amount, positive: false, status: 'Paid' })),
  ]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 6);

  return (
    <Screen edges={['left', 'right']}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={theme.colors.primary} />}
      >
        <View style={styles.header}>
          <View>
            <Text variant="body" tone="muted">Good {greeting()},</Text>
            <Text variant="title" weight="bold">{selectedBusiness?.name}</Text>
          </View>
        </View>

        {loading ? (
          <Skeleton width="100%" height={140} radius={theme.radius.xl} style={styles.heroSkeleton} />
        ) : (
          <GradientCard style={styles.hero}>
            <Text variant="label" style={styles.heroLabel}>This Month's Sales</Text>
            <Text variant="title" weight="bold" style={styles.heroValue}>{formatCurrency(monthSales)}</Text>
            <View style={styles.heroFooter}>
              <View style={styles.heroChip}>
                <Ionicons name="trending-up-outline" size={14} color="#fff" />
                <Text variant="caption" style={styles.heroChipText}>{outstandingInvoiceCount} open invoices</Text>
              </View>
              <View style={styles.heroChip}>
                <Ionicons name="cash-outline" size={14} color="#fff" />
                <Text variant="caption" style={styles.heroChipText}>{formatCurrencyCompact(totalReceivable)} receivable</Text>
              </View>
            </View>
          </GradientCard>
        )}

        <Card style={styles.section}>
          <View style={styles.insightsHeader}>
            <View>
              <Text variant="caption" tone="muted">Sales Insights</Text>
              <Text variant="subtitle" weight="bold">{formatCurrency(wow.current)}</Text>
            </View>
            <View style={[styles.deltaPill, { backgroundColor: (wow.deltaPercent >= 0 ? theme.status.good : theme.status.critical) + '1f' }]}>
              <Ionicons name={wow.deltaPercent >= 0 ? 'arrow-up' : 'arrow-down'} size={12} color={wow.deltaPercent >= 0 ? theme.status.good : theme.status.critical} />
              <Text variant="caption" weight="semibold" style={{ color: wow.deltaPercent >= 0 ? theme.status.good : theme.status.critical }}>
                {formatPercent(Math.abs(wow.deltaPercent))}
              </Text>
            </View>
          </View>
          <Text variant="caption" tone="muted" style={styles.insightsSub}>vs previous 7 days</Text>
          {loading ? <Skeleton width="100%" height={48} radius={8} /> : <Sparkline points={trendPoints} />}
        </Card>

        <View style={styles.rowBetween}>
          <Text variant="subtitle" weight="semibold">Activity</Text>
          <Pressable onPress={() => nav.navigate('SalesTab', { screen: 'SalesList' })}>
            <Text variant="caption" tone="primary" weight="semibold">View all</Text>
          </Pressable>
        </View>
        {loading ? (
          <View>{[1, 2, 3].map((i) => <Skeleton key={i} width="100%" height={60} radius={12} style={styles.activitySkeleton} />)}</View>
        ) : recentActivity.length === 0 ? (
          <Text variant="body" tone="muted">No activity yet</Text>
        ) : (
          <Card style={styles.activityCard} padded={false}>
            {recentActivity.map((item, idx) => (
              <View key={`${item.sub}-${item.id}`} style={[styles.activityRow, idx > 0 && { borderTopWidth: 1, borderTopColor: theme.colors.border }]}>
                <View style={[styles.avatar, { backgroundColor: theme.colors.accent }]}>
                  <Text variant="body" weight="bold" tone="primary">{item.label.charAt(0).toUpperCase()}</Text>
                </View>
                <View style={styles.activityInfo}>
                  <Text variant="body" weight="medium" numberOfLines={1}>{item.label}</Text>
                  <Text variant="caption" tone="muted">{item.sub} · {formatDateShort(item.date)}</Text>
                </View>
                <View style={styles.activityRight}>
                  <Text variant="body" weight="semibold" style={{ color: item.positive ? theme.status.good : theme.colors.foreground }}>
                    {item.positive ? '+' : ''}{formatCurrency(item.amount)}
                  </Text>
                  <Text variant="caption" tone="muted">{item.status}</Text>
                </View>
              </View>
            ))}
          </Card>
        )}

        <Text variant="subtitle" weight="semibold" style={styles.sectionTitle}>Today</Text>
        {loading ? (
          <View style={styles.grid}>{[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} width="47%" height={90} radius={12} />)}</View>
        ) : (
          <View style={styles.grid}>
            <StatTile compact label="Sales" value={formatCurrencyCompact(todaySales)} icon="trending-up-outline" />
            <StatTile compact label="Purchases" value={formatCurrencyCompact(todayPurchases)} icon="cart-outline" />
            <StatTile compact label="Received" value={formatCurrencyCompact(todayReceived)} icon="arrow-down-circle-outline" />
            <StatTile compact label="Paid" value={formatCurrencyCompact(todayPaid)} icon="arrow-up-circle-outline" />
            <StatTile compact label="Expenses" value={formatCurrencyCompact(todayExpenses)} icon="wallet-outline" />
          </View>
        )}

        <Text variant="subtitle" weight="semibold" style={styles.sectionTitle}>This Month</Text>
        {loading ? (
          <View style={styles.grid}>{[1, 2, 3, 4, 5, 6].map((i) => <Skeleton key={i} width="47%" height={90} radius={12} />)}</View>
        ) : (
          <View style={styles.grid}>
            <StatTile compact label="Total Sales" value={formatCurrencyCompact(monthSales)} icon="trending-up-outline" />
            <StatTile compact label="Total Purchases" value={formatCurrencyCompact(monthPurchases)} icon="cart-outline" />
            <StatTile compact label="Total Expenses" value={formatCurrencyCompact(monthExpenses)} icon="wallet-outline" />
            <StatTile compact label="Receivables" value={formatCurrencyCompact(totalReceivable)} icon="download-outline" />
            <StatTile compact label="Payables" value={formatCurrencyCompact(totalPayable)} icon="cloud-upload-outline" deltaTone={totalPayable > 0 ? 'critical' : 'neutral'} />
            <StatTile compact label="Outstanding Invoices" value={String(outstandingInvoiceCount)} icon="alert-circle-outline" />
          </View>
        )}

        <Text variant="subtitle" weight="semibold" style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.quickActions}>
          <QuickAction icon="add-circle-outline" label="Sale" onPress={() => nav.navigate('SalesTab', { screen: 'SalesEntry' })} />
          <QuickAction icon="cart-outline" label="Purchase" onPress={() => nav.navigate('MoreTab', { screen: 'PurchaseStack', params: { screen: 'PurchaseEntry' } })} />
          <QuickAction icon="cash-outline" label="Payment" onPress={() => nav.navigate('MoreTab', { screen: 'PaymentsStack', params: { screen: 'PaymentForm' } })} />
          <QuickAction icon="wallet-outline" label="Expense" onPress={() => nav.navigate('MoreTab', { screen: 'ExpensesStack', params: { screen: 'ExpenseForm' } })} />
          <QuickAction icon="person-add-outline" label="Party" onPress={() => nav.navigate('PartyTab', { screen: 'PartyForm' })} />
          <QuickAction icon="cube-outline" label="Item" onPress={() => nav.navigate('ItemTab', { screen: 'ItemForm' })} />
        </View>
      </ScrollView>
    </Screen>
  );
}

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'morning';
  if (hour < 17) return 'afternoon';
  return 'evening';
}

function QuickAction({ icon, label, onPress }: { icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void }) {
  const theme = useTheme();
  return (
    <Pressable onPress={onPress} style={styles.quickActionItem}>
      <View style={[styles.quickActionIcon, { backgroundColor: theme.colors.accent }]}>
        <Ionicons name={icon} size={22} color={theme.colors.primary} />
      </View>
      <Text variant="caption" weight="medium">{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 40 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  heroSkeleton: { marginBottom: 20 },
  hero: { marginBottom: 20 },
  heroLabel: { color: 'rgba(255,255,255,0.85)' },
  heroValue: { color: '#fff', marginTop: 6, fontSize: 30 },
  heroFooter: { flexDirection: 'row', gap: 10, marginTop: 16, flexWrap: 'wrap' },
  heroChip: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.16)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
  heroChipText: { color: '#fff' },
  section: { marginBottom: 20 },
  insightsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  insightsSub: { marginTop: 2, marginBottom: 10 },
  deltaPill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  activityCard: { marginBottom: 20, overflow: 'hidden' },
  activitySkeleton: { marginBottom: 8 },
  activityRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12 },
  avatar: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  activityInfo: { flex: 1 },
  activityRight: { alignItems: 'flex-end' },
  sectionTitle: { marginTop: 4, marginBottom: 10 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 4 },
  quickActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  quickActionItem: { width: '30%', alignItems: 'center', gap: 6 },
  quickActionIcon: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
});
