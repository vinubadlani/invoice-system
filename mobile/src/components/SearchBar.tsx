import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';

interface SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  onFilterPress?: () => void;
  filterActive?: boolean;
}

export function SearchBar({ value, onChangeText, placeholder = 'Search…', onFilterPress, filterActive }: SearchBarProps) {
  const theme = useTheme();
  return (
    <View style={styles.row}>
      <View style={[styles.searchWrap, { backgroundColor: theme.colors.secondary, borderRadius: theme.radius.md }]}>
        <Ionicons name="search" size={18} color={theme.colors.mutedForeground} />
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={theme.colors.mutedForeground}
          style={[styles.input, { color: theme.colors.foreground }]}
          returnKeyType="search"
        />
        {value ? (
          <Pressable onPress={() => onChangeText('')} hitSlop={8}>
            <Ionicons name="close-circle" size={18} color={theme.colors.mutedForeground} />
          </Pressable>
        ) : null}
      </View>
      {onFilterPress ? (
        <Pressable
          onPress={onFilterPress}
          style={[
            styles.filterButton,
            {
              backgroundColor: filterActive ? theme.colors.primary : theme.colors.secondary,
              borderRadius: theme.radius.md,
            },
          ]}
        >
          <Ionicons name="options-outline" size={20} color={filterActive ? theme.colors.primaryForeground : theme.colors.foreground} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingVertical: 10 },
  searchWrap: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, height: 44 },
  input: { flex: 1, fontSize: 15 },
  filterButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
});
