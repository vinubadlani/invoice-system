import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';
import { MoreHomeScreen } from '../screens/more/MoreHomeScreen';
import { useTheme } from '../theme/ThemeProvider';
import { BankNavigator } from './BankNavigator';
import { ExpenseNavigator } from './ExpenseNavigator';
import { LedgerNavigator } from './LedgerNavigator';
import { PaymentNavigator } from './PaymentNavigator';
import { PurchaseNavigator } from './PurchaseNavigator';
import { ReportNavigator } from './ReportNavigator';
import { defaultStackScreenOptions } from './screenOptions';
import { SettingsNavigator } from './SettingsNavigator';
import { MoreStackParamList } from './types';

const Stack = createNativeStackNavigator<MoreStackParamList>();

export function MoreNavigator() {
  const theme = useTheme();
  return (
    <Stack.Navigator screenOptions={defaultStackScreenOptions(theme)}>
      <Stack.Screen name="MoreHome" component={MoreHomeScreen} options={{ title: 'More' }} />
      <Stack.Screen name="PurchaseStack" component={PurchaseNavigator} options={{ headerShown: false }} />
      <Stack.Screen name="PaymentsStack" component={PaymentNavigator} options={{ headerShown: false }} />
      <Stack.Screen name="BankStack" component={BankNavigator} options={{ headerShown: false }} />
      <Stack.Screen name="ExpensesStack" component={ExpenseNavigator} options={{ headerShown: false }} />
      <Stack.Screen name="LedgerStack" component={LedgerNavigator} options={{ headerShown: false }} />
      <Stack.Screen name="ReportsStack" component={ReportNavigator} options={{ headerShown: false }} />
      <Stack.Screen name="SettingsStack" component={SettingsNavigator} options={{ headerShown: false }} />
    </Stack.Navigator>
  );
}
