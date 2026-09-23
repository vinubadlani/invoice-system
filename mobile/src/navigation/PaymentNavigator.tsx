import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';
import { PaymentFormScreen } from '../screens/payments/PaymentFormScreen';
import { PaymentListScreen } from '../screens/payments/PaymentListScreen';
import { useTheme } from '../theme/ThemeProvider';
import { defaultStackScreenOptions } from './screenOptions';
import { PaymentStackParamList } from './types';

const Stack = createNativeStackNavigator<PaymentStackParamList>();

export function PaymentNavigator() {
  const theme = useTheme();
  return (
    <Stack.Navigator screenOptions={defaultStackScreenOptions(theme)}>
      <Stack.Screen name="PaymentList" component={PaymentListScreen} options={{ title: 'Payments' }} />
      <Stack.Screen name="PaymentForm" component={PaymentFormScreen} options={{ title: 'Add Payment' }} />
    </Stack.Navigator>
  );
}
