import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Card } from '../../components/Card';
import { Screen } from '../../components/Screen';
import { Text } from '../../components/Text';
import { SettingsStackParamList } from '../../navigation/types';
import { useBusinessStore } from '../../store/businessStore';
import { toast } from '../../store/toastStore';
import { useTheme } from '../../theme/ThemeProvider';

type Props = NativeStackScreenProps<SettingsStackParamList, 'InvoiceTemplateSettings'>;

// 'classic' is the confirmed default template value on businesses.invoice_template.
// Custom drag-and-drop templates (lib/template-renderer.ts on the web) aren't
// editable from mobile yet — only the built-in named templates are offered here.
const TEMPLATES = [
  { value: 'classic', label: 'Classic', description: 'Traditional tax invoice layout' },
  { value: 'modern', label: 'Modern', description: 'Clean, minimal layout' },
  { value: 'compact', label: 'Compact', description: 'Denser layout for many line items' },
];

export function InvoiceTemplateSettingsScreen({}: Props) {
  const theme = useTheme();
  const { selectedBusiness, updateBusiness } = useBusinessStore();
  const [saving, setSaving] = useState<string | null>(null);
  const current = selectedBusiness?.invoice_template ?? 'classic';

  const handleSelect = async (value: string) => {
    if (!selectedBusiness || value === current) return;
    setSaving(value);
    try {
      await updateBusiness(selectedBusiness.id, { invoice_template: value });
      toast.success('Invoice template updated');
    } catch (e: any) {
      toast.error(e.message ?? 'Could not update template');
    } finally {
      setSaving(null);
    }
  };

  return (
    <Screen edges={['left', 'right']}>
      <ScrollView contentContainerStyle={styles.content}>
        {TEMPLATES.map((t) => (
          <Pressable key={t.value} onPress={() => handleSelect(t.value)}>
            <Card style={[styles.card, current === t.value && { borderColor: theme.colors.primary, borderWidth: 1.5 }]}>
              <View style={styles.row}>
                <View style={styles.info}>
                  <Text variant="body" weight="semibold">{t.label}</Text>
                  <Text variant="caption" tone="muted">{t.description}</Text>
                </View>
                {saving === t.value ? null : current === t.value ? (
                  <Ionicons name="checkmark-circle" size={22} color={theme.colors.primary} />
                ) : null}
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
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  info: { flex: 1 },
});
