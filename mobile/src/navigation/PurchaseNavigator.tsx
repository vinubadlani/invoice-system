import { Ionicons } from '@expo/vector-icons';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';
import { Pressable } from 'react-native';
import { PurchaseAnalyticsScreen } from '../screens/purchases/PurchaseAnalyticsScreen';
import { PurchaseDetailScreen } from '../screens/purchases/PurchaseDetailScreen';
import { PurchaseEntryScreen } from '../screens/purchases/PurchaseEntryScreen';
import { PurchaseListScreen } from '../screens/purchases/PurchaseListScreen';
import { useTheme } from '../theme/ThemeProvider';
import { defaultStackScreenOptions } from './screenOptions';
import { PurchaseStackParamList } from './types';

const Stack = createNativeStackNavigator<PurchaseStackParamList>();

export function PurchaseNavigator() {
  const theme = useTheme();
  return (
    <Stack.Navigator screenOptions={defaultStackScreenOptions(theme)}>
      <Stack.Screen
        name="PurchaseList"
        component={PurchaseListScreen}
        options={({ navigation }) => ({
          title: 'Purchases',
          headerRight: () => (
            <Pressable onPress={() => navigation.navigate('PurchaseAnalytics')} hitSlop={8}>
              <Ionicons name="bar-chart-outline" size={22} color={theme.colors.primary} />
            </Pressable>
          ),
        })}
      />
      <Stack.Screen name="PurchaseEntry" component={PurchaseEntryScreen} options={{ title: 'New Purchase' }} />
      <Stack.Screen name="PurchaseDetail" component={PurchaseDetailScreen} options={{ title: 'Purchase' }} />
      <Stack.Screen name="PurchaseAnalytics" component={PurchaseAnalyticsScreen} options={{ title: 'Purchase Analytics' }} />
    </Stack.Navigator>
  );
}
