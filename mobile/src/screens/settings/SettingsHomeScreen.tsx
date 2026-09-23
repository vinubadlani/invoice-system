import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Card } from '../../components/Card';
import { Screen } from '../../components/Screen';
import { Text } from '../../components/Text';
import { SettingsStackParamList } from '../../navigation/types';
import { useAuthStore } from '../../store/authStore';
import { useBusinessStore } from '../../store/businessStore';
import { useTheme } from '../../theme/ThemeProvider';
import { confirm } from '../../utils/confirm';

type Props = NativeStackScreenProps<SettingsStackParamList, 'SettingsHome'>;

export function SettingsHomeScreen({ navigation }: Props) {
  const theme = useTheme();
  const selectedBusiness = useBusinessStore((s) => s.selectedBusiness);
  const signOut = useAuthStore((s) => s.signOut);
  const user = useAuthStore((s) => s.user);

  const handleLogout = async () => {
    const ok = await confirm({ title: 'Sign out?', message: 'You can sign back in anytime.', confirmLabel: 'Sign Out' });
    if (ok) await signOut();
  };

  return (
    <Screen edges={['left', 'right']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Card style={styles.profileCard}>
          <Text variant="caption" tone="muted">Signed in as</Text>
          <Text variant="body" weight="semibold">{user?.email}</Text>
        </Card>

        <MenuItem icon="business-outline" label="Business Profile" description={selectedBusiness?.name} onPress={() => navigation.navigate('BusinessProfile')} />
        <MenuItem icon="document-text-outline" label="Invoice Template" description="Choose how your invoices look" onPress={() => navigation.navigate('InvoiceTemplateSettings')} />

        <Pressable onPress={handleLogout} style={styles.logoutRow}>
          <Ionicons name="log-out-outline" size={20} color={theme.colors.destructive} />
          <Text variant="body" tone="destructive" weight="medium">Sign Out</Text>
        </Pressable>
      </ScrollView>
    </Screen>
  );
}

function MenuItem({ icon, label, description, onPress }: { icon: keyof typeof Ionicons.glyphMap; label: string; description?: string; onPress: () => void }) {
  const theme = useTheme();
  return (
    <Pressable onPress={onPress}>
      <Card style={styles.menuCard}>
        <View style={styles.menuRow}>
          <View style={[styles.iconWrap, { backgroundColor: theme.colors.accent }]}>
            <Ionicons name={icon} size={18} color={theme.colors.primary} />
          </View>
          <View style={styles.menuInfo}>
            <Text variant="body" weight="medium">{label}</Text>
            {description ? <Text variant="caption" tone="muted" numberOfLines={1}>{description}</Text> : null}
          </View>
          <Ionicons name="chevron-forward" size={18} color={theme.colors.mutedForeground} />
        </View>
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 10, paddingBottom: 40 },
  profileCard: { marginBottom: 6 },
  menuCard: { marginBottom: 0 },
  menuRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconWrap: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  menuInfo: { flex: 1 },
  logoutRow: { flexDirection: 'row', alignItems: 'center', gap: 10, justifyContent: 'center', paddingVertical: 16, marginTop: 8 },
});
