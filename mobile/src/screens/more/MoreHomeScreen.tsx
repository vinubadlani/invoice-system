import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Card } from '../../components/Card';
import { Screen } from '../../components/Screen';
import { Text } from '../../components/Text';
import { MoreStackParamList } from '../../navigation/types';
import { useAuthStore } from '../../store/authStore';
import { useBusinessStore } from '../../store/businessStore';
import { useTheme } from '../../theme/ThemeProvider';
import { confirm } from '../../utils/confirm';

type Props = NativeStackScreenProps<MoreStackParamList, 'MoreHome'>;

const MENU: { key: keyof MoreStackParamList; label: string; description: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'PurchaseStack', label: 'Purchases', description: 'Purchase bills & analytics', icon: 'cart-outline' },
  { key: 'PaymentsStack', label: 'Payments', description: 'Payment in / payment out', icon: 'cash-outline' },
  { key: 'BankStack', label: 'Bank', description: 'Accounts, deposits & withdrawals', icon: 'card-outline' },
  { key: 'ExpensesStack', label: 'Expenses', description: 'Track business expenses', icon: 'wallet-outline' },
  { key: 'LedgerStack', label: 'Ledger', description: 'Party-wise transaction ledger', icon: 'book-outline' },
  { key: 'ReportsStack', label: 'Reports', description: 'Sales, GST, outstanding & more', icon: 'stats-chart-outline' },
  { key: 'SettingsStack', label: 'Settings', description: 'Business profile & preferences', icon: 'settings-outline' },
];

export function MoreHomeScreen({ navigation }: Props) {
  const theme = useTheme();
  const { businesses, selectedBusiness, deselectBusiness } = useBusinessStore();
  const user = useAuthStore((s) => s.user);
  const signOut = useAuthStore((s) => s.signOut);

  const handleLogout = async () => {
    const ok = await confirm({ title: 'Sign out?', message: 'You can sign back in anytime.', confirmLabel: 'Sign Out' });
    if (ok) await signOut();
  };

  return (
    <Screen edges={['left', 'right']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Card style={styles.profileCard}>
          <View style={styles.row}>
            <View style={[styles.iconWrap, { backgroundColor: theme.colors.accent }]}>
              <Ionicons name="person-outline" size={18} color={theme.colors.primary} />
            </View>
            <View style={styles.info}>
              <Text variant="caption" tone="muted">Signed in as</Text>
              <Text variant="body" weight="semibold" numberOfLines={1}>{user?.email}</Text>
            </View>
          </View>
        </Card>

        {businesses.length > 1 ? (
          <Pressable onPress={() => deselectBusiness()}>
            <Card style={styles.switchCard}>
              <View style={styles.row}>
                <View style={[styles.iconWrap, { backgroundColor: theme.colors.accent }]}>
                  <Ionicons name="swap-horizontal-outline" size={18} color={theme.colors.primary} />
                </View>
                <View style={styles.info}>
                  <Text variant="body" weight="medium">Switch Business</Text>
                  <Text variant="caption" tone="muted" numberOfLines={1}>Current: {selectedBusiness?.name}</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={theme.colors.mutedForeground} />
              </View>
            </Card>
          </Pressable>
        ) : null}

        {MENU.map((item) => (
          <Pressable key={item.key} onPress={() => navigation.navigate(item.key as any)}>
            <Card style={styles.card}>
              <View style={styles.row}>
                <View style={[styles.iconWrap, { backgroundColor: theme.colors.accent }]}>
                  <Ionicons name={item.icon} size={18} color={theme.colors.primary} />
                </View>
                <View style={styles.info}>
                  <Text variant="body" weight="medium">{item.label}</Text>
                  <Text variant="caption" tone="muted">{item.description}</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={theme.colors.mutedForeground} />
              </View>
            </Card>
          </Pressable>
        ))}

        <Pressable onPress={handleLogout} style={styles.logoutRow}>
          <Ionicons name="log-out-outline" size={20} color={theme.status.critical} />
          <Text variant="body" weight="semibold" tone="destructive">Sign Out</Text>
        </Pressable>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 10, paddingBottom: 40 },
  profileCard: { marginBottom: 6 },
  switchCard: { marginBottom: 6, borderStyle: 'dashed' },
  card: { marginBottom: 0 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconWrap: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  info: { flex: 1 },
  logoutRow: { flexDirection: 'row', alignItems: 'center', gap: 10, justifyContent: 'center', paddingVertical: 16, marginTop: 8 },
});
