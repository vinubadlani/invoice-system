import { Ionicons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { QuickCreateSheet } from '../components/QuickCreateSheet';
import { useTheme } from '../theme/ThemeProvider';
import { DashboardNavigator } from './DashboardNavigator';
import { ItemNavigator } from './ItemNavigator';
import { MoreNavigator } from './MoreNavigator';
import { PartyNavigator } from './PartyNavigator';
import { SalesNavigator } from './SalesNavigator';
import { MainTabParamList } from './types';

const Tab = createBottomTabNavigator<MainTabParamList>();

const ICONS: Record<keyof MainTabParamList, { focused: keyof typeof Ionicons.glyphMap; outline: keyof typeof Ionicons.glyphMap }> = {
  DashboardTab: { focused: 'home', outline: 'home-outline' },
  SalesTab: { focused: 'receipt', outline: 'receipt-outline' },
  ItemTab: { focused: 'cube', outline: 'cube-outline' },
  PartyTab: { focused: 'people', outline: 'people-outline' },
  MoreTab: { focused: 'menu', outline: 'menu-outline' },
};

export function MainTabs() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const [createOpen, setCreateOpen] = useState(false);

  return (
    <View style={styles.flex}>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarActiveTintColor: theme.colors.primary,
          tabBarInactiveTintColor: theme.colors.mutedForeground,
          tabBarStyle: {
            backgroundColor: theme.colors.card,
            borderTopColor: theme.colors.border,
            height: 58 + insets.bottom,
            paddingBottom: Math.max(insets.bottom, 8),
            paddingTop: 6,
          },
          tabBarLabelStyle: { fontSize: 11, fontWeight: '500' },
          tabBarIcon: ({ color, size, focused }) => {
            const icon = ICONS[route.name as keyof MainTabParamList];
            return <Ionicons name={focused ? icon.focused : icon.outline} color={color} size={size} />;
          },
        })}
      >
        <Tab.Screen name="DashboardTab" component={DashboardNavigator} options={{ title: 'Home' }} />
        <Tab.Screen name="SalesTab" component={SalesNavigator} options={{ title: 'Sales' }} />
        <Tab.Screen name="ItemTab" component={ItemNavigator} options={{ title: 'Items' }} />
        <Tab.Screen name="PartyTab" component={PartyNavigator} options={{ title: 'Parties' }} />
        <Tab.Screen name="MoreTab" component={MoreNavigator} options={{ title: 'More' }} />
      </Tab.Navigator>

      {/* Floats fully above the tab bar (not overlapping it) so it never steals
          touches from the tab row underneath — a near-miss tap must never
          silently activate a tab the user didn't mean to open. */}
      <Pressable
        onPress={() => setCreateOpen(true)}
        style={[styles.fabWrap, { bottom: 58 + insets.bottom + 14 }]}
        accessibilityRole="button"
        accessibilityLabel="Create new"
        hitSlop={4}
      >
        <LinearGradient colors={theme.gradient.primary} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.fab}>
          <Ionicons name="add" size={28} color="#fff" />
        </LinearGradient>
      </Pressable>

      <QuickCreateSheet
        visible={createOpen}
        onClose={() => setCreateOpen(false)}
        actions={[
          { icon: 'receipt-outline', label: 'Sale', onPress: () => navigation.navigate('SalesTab', { screen: 'SalesEntry' }) },
          { icon: 'cart-outline', label: 'Purchase', onPress: () => navigation.navigate('MoreTab', { screen: 'PurchaseStack', params: { screen: 'PurchaseEntry' } }) },
          { icon: 'cash-outline', label: 'Payment', onPress: () => navigation.navigate('MoreTab', { screen: 'PaymentsStack', params: { screen: 'PaymentForm' } }) },
          { icon: 'wallet-outline', label: 'Expense', onPress: () => navigation.navigate('MoreTab', { screen: 'ExpensesStack', params: { screen: 'ExpenseForm' } }) },
          { icon: 'person-add-outline', label: 'Party', onPress: () => navigation.navigate('PartyTab', { screen: 'PartyForm' }) },
          { icon: 'cube-outline', label: 'Item', onPress: () => navigation.navigate('ItemTab', { screen: 'ItemForm' }) },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  fabWrap: { position: 'absolute', right: 20 },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0d366b',
    shadowOpacity: 0.35,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
});
