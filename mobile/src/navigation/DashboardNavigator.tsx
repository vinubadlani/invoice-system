import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';
import { DashboardHomeScreen } from '../screens/dashboard/DashboardHomeScreen';
import { useTheme } from '../theme/ThemeProvider';
import { defaultStackScreenOptions } from './screenOptions';
import { DashboardStackParamList } from './types';

const Stack = createNativeStackNavigator<DashboardStackParamList>();

export function DashboardNavigator() {
  const theme = useTheme();
  return (
    <Stack.Navigator screenOptions={defaultStackScreenOptions(theme)}>
      <Stack.Screen name="DashboardHome" component={DashboardHomeScreen} options={{ title: 'Dashboard' }} />
    </Stack.Navigator>
  );
}
