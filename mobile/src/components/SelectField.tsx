import { Ionicons } from '@expo/vector-icons';
import React, { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { BottomSheet } from './BottomSheet';
import { Text } from './Text';

export interface SelectOption {
  label: string;
  value: string;
  description?: string;
}

interface SelectFieldProps {
  label?: string;
  required?: boolean;
  placeholder?: string;
  value?: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  searchable?: boolean;
  error?: string;
}

export function SelectField({ label, required, placeholder = 'Select…', value, options, onChange, searchable, error }: SelectFieldProps) {
  const theme = useTheme();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  const selected = options.find((o) => o.value === value);
  const filtered = useMemo(
    () => (query ? options.filter((o) => o.label.toLowerCase().includes(query.toLowerCase())) : options),
    [options, query],
  );

  return (
    <View style={styles.wrap}>
      {label ? (
        <Text variant="label" tone="muted" style={styles.label}>
          {label}
          {required ? <Text tone="destructive"> *</Text> : null}
        </Text>
      ) : null}
      <Pressable
        onPress={() => setOpen(true)}
        style={[
          styles.field,
          { borderColor: error ? theme.colors.destructive : theme.colors.border, backgroundColor: theme.colors.card, borderRadius: theme.radius.md },
        ]}
      >
        <Text variant="body" tone={selected ? 'default' : 'muted'} numberOfLines={1} style={styles.fieldText}>
          {selected ? selected.label : placeholder}
        </Text>
        <Ionicons name="chevron-down" size={18} color={theme.colors.mutedForeground} />
      </Pressable>
      {error ? (
        <Text variant="caption" tone="destructive" style={styles.helper}>
          {error}
        </Text>
      ) : null}

      <BottomSheet visible={open} onClose={() => setOpen(false)}>
        <View style={styles.sheetHeader}>
          <Text variant="subtitle" weight="semibold">{label ?? 'Select'}</Text>
        </View>
        {searchable ? (
          <View style={[styles.searchWrap, { borderColor: theme.colors.border, backgroundColor: theme.colors.secondary }]}>
            <Ionicons name="search" size={16} color={theme.colors.mutedForeground} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Search…"
              placeholderTextColor={theme.colors.mutedForeground}
              style={[styles.searchInput, { color: theme.colors.foreground }]}
            />
          </View>
        ) : null}
        <FlatList
          data={filtered}
          keyExtractor={(o) => o.value}
          style={styles.optionList}
          contentContainerStyle={{ paddingBottom: 24 }}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => (
            <Pressable
              onPress={() => {
                onChange(item.value);
                setOpen(false);
                setQuery('');
              }}
              style={styles.option}
            >
              <View style={styles.optionText}>
                <Text variant="body" weight={item.value === value ? 'semibold' : 'regular'}>{item.label}</Text>
                {item.description ? <Text variant="caption" tone="muted">{item.description}</Text> : null}
              </View>
              {item.value === value ? <Ionicons name="checkmark" size={18} color={theme.colors.primary} /> : null}
            </Pressable>
          )}
          ListEmptyComponent={<Text variant="body" tone="muted" style={styles.empty}>No matches</Text>}
        />
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 14 },
  label: { marginBottom: 6 },
  field: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    minHeight: 46, paddingHorizontal: 12, borderWidth: 1,
  },
  fieldText: { flex: 1, marginRight: 8 },
  helper: { marginTop: 4 },
  sheetHeader: { paddingHorizontal: 20, paddingBottom: 12 },
  searchWrap: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 20, marginBottom: 8, paddingHorizontal: 12, borderRadius: 10, borderWidth: 1, gap: 8 },
  searchInput: { flex: 1, paddingVertical: 10, fontSize: 15 },
  optionList: { paddingHorizontal: 20 },
  option: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14 },
  optionText: { flex: 1 },
  empty: { textAlign: 'center', paddingVertical: 24 },
});
