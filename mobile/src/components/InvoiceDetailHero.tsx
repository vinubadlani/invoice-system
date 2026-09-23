import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { formatCurrency, formatDate } from '../utils/format';
import { Badge, statusToTone } from './Badge';
import { BottomSheet } from './BottomSheet';
import { GradientCard } from './GradientCard';
import { Text } from './Text';

interface OverflowAction {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  destructive?: boolean;
}

interface InvoiceDetailHeroProps {
  invoiceNo: string;
  partyName: string;
  description: string;
  date: string;
  dueDate?: string;
  amount: number;
  status: string;
  actions: OverflowAction[];
}

/** "Invoice Details" style hero card — invoice no, bill-to/description, issued/due
 * date, and a big amount total, with an overflow menu for edit/share/delete. */
export function InvoiceDetailHero({ invoiceNo, partyName, description, date, dueDate, amount, status, actions }: InvoiceDetailHeroProps) {
  const theme = useTheme();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <>
      <GradientCard style={styles.card}>
        <View style={styles.topRow}>
          <View>
            <Text variant="caption" style={styles.mutedLight}>Invoice no</Text>
            <Text variant="subtitle" weight="bold" style={styles.lightText}>{invoiceNo}</Text>
          </View>
          <Pressable onPress={() => setMenuOpen(true)} hitSlop={10} style={styles.menuButton}>
            <Ionicons name="ellipsis-horizontal" size={18} color="#fff" />
          </Pressable>
        </View>

        <View style={styles.infoRow}>
          <View style={styles.infoCol}>
            <Text variant="caption" style={styles.mutedLight}>Bill to</Text>
            <Text variant="body" weight="semibold" style={styles.lightText} numberOfLines={1}>{partyName}</Text>
          </View>
          <View style={styles.infoCol}>
            <Text variant="caption" style={styles.mutedLight}>Description</Text>
            <Text variant="body" weight="semibold" style={styles.lightText} numberOfLines={1}>{description}</Text>
          </View>
        </View>

        <View style={styles.infoRow}>
          <View style={styles.infoCol}>
            <Text variant="caption" style={styles.mutedLight}>Issued on</Text>
            <Text variant="body" weight="semibold" style={styles.lightText}>{formatDate(date)}</Text>
          </View>
          <View style={styles.infoCol}>
            <Text variant="caption" style={styles.mutedLight}>Due date</Text>
            <Text variant="body" weight="semibold" style={styles.lightText}>{dueDate ? formatDate(dueDate) : '—'}</Text>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.totalRow}>
          <View>
            <Text variant="caption" style={styles.mutedLight}>Amount total</Text>
            <Text variant="title" weight="bold" style={[styles.lightText, styles.amount]}>{formatCurrency(amount)}</Text>
          </View>
          <Badge label={status} tone={statusToTone(status)} />
        </View>
      </GradientCard>

      <BottomSheet visible={menuOpen} onClose={() => setMenuOpen(false)}>
        <View style={styles.sheetPad}>
          {actions.map((action) => (
            <Pressable
              key={action.label}
              onPress={() => {
                setMenuOpen(false);
                action.onPress();
              }}
              style={styles.actionRow}
            >
              <Ionicons name={action.icon} size={20} color={action.destructive ? theme.status.critical : theme.colors.primary} />
              <Text variant="body" weight="medium" tone={action.destructive ? 'destructive' : 'default'}>{action.label}</Text>
            </Pressable>
          ))}
        </View>
      </BottomSheet>
    </>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: 16 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18 },
  menuButton: { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.16)', alignItems: 'center', justifyContent: 'center' },
  infoRow: { flexDirection: 'row', marginBottom: 14, gap: 12 },
  infoCol: { flex: 1 },
  mutedLight: { color: 'rgba(255,255,255,0.75)', marginBottom: 3 },
  lightText: { color: '#fff' },
  divider: { height: 1, backgroundColor: 'rgba(255,255,255,0.2)', marginVertical: 6 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 10 },
  amount: { marginTop: 4 },
  sheetPad: { paddingHorizontal: 20, paddingBottom: 24, gap: 4 },
  actionRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14 },
});
