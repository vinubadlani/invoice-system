import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';
import { PartyDetailScreen } from '../screens/parties/PartyDetailScreen';
import { PartyFormScreen } from '../screens/parties/PartyFormScreen';
import { PartyListScreen } from '../screens/parties/PartyListScreen';
import { useTheme } from '../theme/ThemeProvider';
import { defaultStackScreenOptions } from './screenOptions';
import { PartyStackParamList } from './types';

const Stack = createNativeStackNavigator<PartyStackParamList>();

export function PartyNavigator() {
  const theme = useTheme();
  return (
    <Stack.Navigator screenOptions={defaultStackScreenOptions(theme)}>
      <Stack.Screen name="PartyList" component={PartyListScreen} options={{ title: 'Parties' }} />
      <Stack.Screen name="PartyForm" component={PartyFormScreen} options={{ title: 'Add Party' }} />
      <Stack.Screen name="PartyDetail" component={PartyDetailScreen} options={{ title: 'Party' }} />
    </Stack.Navigator>
  );
}
