import { Ionicons } from '@expo/vector-icons';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';
import { Pressable } from 'react-native';
import { ExpenseAnalyticsScreen } from '../screens/expenses/ExpenseAnalyticsScreen';
import { ExpenseFormScreen } from '../screens/expenses/ExpenseFormScreen';
import { ExpenseListScreen } from '../screens/expenses/ExpenseListScreen';
import { useTheme } from '../theme/ThemeProvider';
import { defaultStackScreenOptions } from './screenOptions';
import { ExpenseStackParamList } from './types';

const Stack = createNativeStackNavigator<ExpenseStackParamList>();

export function ExpenseNavigator() {
  const theme = useTheme();
  return (
    <Stack.Navigator screenOptions={defaultStackScreenOptions(theme)}>
      <Stack.Screen
        name="ExpenseList"
        component={ExpenseListScreen}
        options={({ navigation }) => ({
          title: 'Expenses',
          headerRight: () => (
            <Pressable onPress={() => navigation.navigate('ExpenseAnalytics')} hitSlop={8}>
              <Ionicons name="bar-chart-outline" size={22} color={theme.colors.primary} />
            </Pressable>
          ),
        })}
      />
      <Stack.Screen name="ExpenseForm" component={ExpenseFormScreen} options={{ title: 'Add Expense' }} />
      <Stack.Screen name="ExpenseAnalytics" component={ExpenseAnalyticsScreen} options={{ title: 'Expense Analytics' }} />
    </Stack.Navigator>
  );
}
