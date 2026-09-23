import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Card } from '../../components/Card';
import { Screen } from '../../components/Screen';
import { Text } from '../../components/Text';
import { ReportStackParamList } from '../../navigation/types';
import { useTheme } from '../../theme/ThemeProvider';

type Props = NativeStackScreenProps<ReportStackParamList, 'ReportsHome'>;

const REPORTS: { key: keyof ReportStackParamList; label: string; description: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'SalesReport', label: 'Sales Report', description: 'Summary, by customer, by product, monthly', icon: 'trending-up-outline' },
  { key: 'PurchaseReport', label: 'Purchase Report', description: 'Summary, by supplier, by product', icon: 'cart-outline' },
  { key: 'ExpenseReport', label: 'Expense Report', description: 'Summary and category-wise breakdown', icon: 'wallet-outline' },
  { key: 'GstReport', label: 'GST Report', description: 'Taxable amount, CGST, SGST, IGST, HSN summary', icon: 'document-text-outline' },
  { key: 'OutstandingReport', label: 'Outstanding Report', description: 'Receivables, payables and overdue amounts', icon: 'alert-circle-outline' },
];

export function ReportsHomeScreen({ navigation }: Props) {
  const theme = useTheme();
  return (
    <Screen edges={['left', 'right']}>
      <ScrollView contentContainerStyle={styles.content}>
        {REPORTS.map((r) => (
          <Pressable key={r.key} onPress={() => navigation.navigate(r.key as any)}>
            <Card style={styles.card}>
              <View style={styles.row}>
                <View style={[styles.iconWrap, { backgroundColor: theme.colors.accent }]}>
                  <Ionicons name={r.icon} size={20} color={theme.colors.primary} />
                </View>
                <View style={styles.info}>
                  <Text variant="body" weight="semibold">{r.label}</Text>
                  <Text variant="caption" tone="muted">{r.description}</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={theme.colors.mutedForeground} />
              </View>
            </Card>
          </Pressable>
        ))}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 10, paddingBottom: 40 },
  card: { marginBottom: 0 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconWrap: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  info: { flex: 1 },
});
