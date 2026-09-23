import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';
import { BusinessProfileScreen } from '../screens/settings/BusinessProfileScreen';
import { InvoiceTemplateSettingsScreen } from '../screens/settings/InvoiceTemplateSettingsScreen';
import { SettingsHomeScreen } from '../screens/settings/SettingsHomeScreen';
import { useTheme } from '../theme/ThemeProvider';
import { defaultStackScreenOptions } from './screenOptions';
import { SettingsStackParamList } from './types';

const Stack = createNativeStackNavigator<SettingsStackParamList>();

export function SettingsNavigator() {
  const theme = useTheme();
  return (
    <Stack.Navigator screenOptions={defaultStackScreenOptions(theme)}>
      <Stack.Screen name="SettingsHome" component={SettingsHomeScreen} options={{ title: 'Settings' }} />
      <Stack.Screen name="BusinessProfile" component={BusinessProfileScreen} options={{ title: 'Business Profile' }} />
      <Stack.Screen name="InvoiceTemplateSettings" component={InvoiceTemplateSettingsScreen} options={{ title: 'Invoice Template' }} />
    </Stack.Navigator>
  );
}
