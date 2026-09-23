import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { BottomSheet } from './BottomSheet';
import { Text } from './Text';

interface QuickCreateAction {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
}

interface QuickCreateSheetProps {
  visible: boolean;
  onClose: () => void;
  actions: QuickCreateAction[];
}

/** Bottom sheet opened by the tab bar's floating + button — every action here
 * routes to a real entry screen (same destinations as the dashboard's quick actions). */
export function QuickCreateSheet({ visible, onClose, actions }: QuickCreateSheetProps) {
  const theme = useTheme();

  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <View style={styles.header}>
        <Text variant="subtitle" weight="bold">Create New</Text>
        <Text variant="caption" tone="muted" style={styles.headerSub}>What would you like to add?</Text>
      </View>
      <View style={styles.grid}>
        {actions.map((action) => (
          <Pressable
            key={action.label}
            onPress={() => {
              onClose();
              action.onPress();
            }}
            style={({ pressed }) => [
              styles.item,
              { backgroundColor: theme.colors.card, borderColor: theme.colors.border, opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <LinearGradient
              colors={theme.gradient.primary}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.iconWrap}
            >
              <Ionicons name={action.icon} size={22} color="#fff" />
            </LinearGradient>
            <Text variant="caption" weight="semibold" numberOfLines={1}>{action.label}</Text>
          </Pressable>
        ))}
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 20, paddingBottom: 16 },
  headerSub: { marginTop: 2 },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 28,
    rowGap: 14,
  },
  item: {
    width: '31%',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  iconWrap: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
});
