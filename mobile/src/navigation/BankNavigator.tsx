import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';
import { BankAccountFormScreen } from '../screens/bank/BankAccountFormScreen';
import { BankAccountListScreen } from '../screens/bank/BankAccountListScreen';
import { BankTransactionFormScreen } from '../screens/bank/BankTransactionFormScreen';
import { BankTransactionListScreen } from '../screens/bank/BankTransactionListScreen';
import { useTheme } from '../theme/ThemeProvider';
import { defaultStackScreenOptions } from './screenOptions';
import { BankStackParamList } from './types';

const Stack = createNativeStackNavigator<BankStackParamList>();

export function BankNavigator() {
  const theme = useTheme();
  return (
    <Stack.Navigator screenOptions={defaultStackScreenOptions(theme)}>
      <Stack.Screen name="BankAccountList" component={BankAccountListScreen} options={{ title: 'Bank Accounts' }} />
      <Stack.Screen name="BankAccountForm" component={BankAccountFormScreen} options={{ title: 'Add Bank Account' }} />
      <Stack.Screen name="BankTransactionList" component={BankTransactionListScreen} options={{ title: 'Transactions' }} />
      <Stack.Screen name="BankTransactionForm" component={BankTransactionFormScreen} options={{ title: 'Add Transaction' }} />
    </Stack.Navigator>
  );
}
