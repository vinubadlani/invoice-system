import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';
import { ExpenseReportScreen } from '../screens/reports/ExpenseReportScreen';
import { GstReportScreen } from '../screens/reports/GstReportScreen';
import { OutstandingReportScreen } from '../screens/reports/OutstandingReportScreen';
import { PurchaseReportScreen } from '../screens/reports/PurchaseReportScreen';
import { ReportsHomeScreen } from '../screens/reports/ReportsHomeScreen';
import { SalesReportScreen } from '../screens/reports/SalesReportScreen';
import { useTheme } from '../theme/ThemeProvider';
import { defaultStackScreenOptions } from './screenOptions';
import { ReportStackParamList } from './types';

const Stack = createNativeStackNavigator<ReportStackParamList>();

export function ReportNavigator() {
  const theme = useTheme();
  return (
    <Stack.Navigator screenOptions={defaultStackScreenOptions(theme)}>
      <Stack.Screen name="ReportsHome" component={ReportsHomeScreen} options={{ title: 'Reports' }} />
      <Stack.Screen name="SalesReport" component={SalesReportScreen} options={{ title: 'Sales Report' }} />
      <Stack.Screen name="PurchaseReport" component={PurchaseReportScreen} options={{ title: 'Purchase Report' }} />
      <Stack.Screen name="ExpenseReport" component={ExpenseReportScreen} options={{ title: 'Expense Report' }} />
      <Stack.Screen name="GstReport" component={GstReportScreen} options={{ title: 'GST Report' }} />
      <Stack.Screen name="OutstandingReport" component={OutstandingReportScreen} options={{ title: 'Outstanding Report' }} />
    </Stack.Navigator>
  );
}
