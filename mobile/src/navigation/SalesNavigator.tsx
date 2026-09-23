import { Ionicons } from '@expo/vector-icons';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';
import { Pressable } from 'react-native';
import { SalesAnalyticsScreen } from '../screens/sales/SalesAnalyticsScreen';
import { SalesDetailScreen } from '../screens/sales/SalesDetailScreen';
import { SalesEntryScreen } from '../screens/sales/SalesEntryScreen';
import { SalesListScreen } from '../screens/sales/SalesListScreen';
import { useTheme } from '../theme/ThemeProvider';
import { defaultStackScreenOptions } from './screenOptions';
import { SalesStackParamList } from './types';

const Stack = createNativeStackNavigator<SalesStackParamList>();

export function SalesNavigator() {
  const theme = useTheme();
  return (
    <Stack.Navigator screenOptions={defaultStackScreenOptions(theme)}>
      <Stack.Screen
        name="SalesList"
        component={SalesListScreen}
        options={({ navigation }) => ({
          title: 'Sales',
          headerRight: () => (
            <Pressable onPress={() => navigation.navigate('SalesAnalytics')} hitSlop={8}>
              <Ionicons name="bar-chart-outline" size={22} color={theme.colors.primary} />
            </Pressable>
          ),
        })}
      />
      <Stack.Screen name="SalesEntry" component={SalesEntryScreen} options={{ title: 'New Sale' }} />
      <Stack.Screen name="SalesDetail" component={SalesDetailScreen} options={{ title: 'Sale' }} />
      <Stack.Screen name="SalesAnalytics" component={SalesAnalyticsScreen} options={{ title: 'Sales Analytics' }} />
    </Stack.Navigator>
  );
}
