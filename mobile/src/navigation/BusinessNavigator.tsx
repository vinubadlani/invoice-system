import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';
import { BusinessFormScreen } from '../screens/business/BusinessFormScreen';
import { BusinessSelectorScreen } from '../screens/business/BusinessSelectorScreen';
import { useTheme } from '../theme/ThemeProvider';
import { defaultStackScreenOptions } from './screenOptions';
import { BusinessStackParamList } from './types';

const Stack = createNativeStackNavigator<BusinessStackParamList>();

export function BusinessNavigator() {
  const theme = useTheme();
  return (
    <Stack.Navigator screenOptions={defaultStackScreenOptions(theme)}>
      <Stack.Screen name="BusinessSelector" component={BusinessSelectorScreen} options={{ headerShown: false }} />
      <Stack.Screen name="BusinessForm" component={BusinessFormScreen} options={{ title: 'Add Business' }} />
    </Stack.Navigator>
  );
}
