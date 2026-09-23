import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';
import { LedgerHomeScreen } from '../screens/ledger/LedgerHomeScreen';
import { PartyLedgerScreen } from '../screens/ledger/PartyLedgerScreen';
import { useTheme } from '../theme/ThemeProvider';
import { defaultStackScreenOptions } from './screenOptions';
import { LedgerStackParamList } from './types';

const Stack = createNativeStackNavigator<LedgerStackParamList>();

export function LedgerNavigator() {
  const theme = useTheme();
  return (
    <Stack.Navigator screenOptions={defaultStackScreenOptions(theme)}>
      <Stack.Screen name="LedgerHome" component={LedgerHomeScreen} options={{ title: 'Ledger' }} />
      <Stack.Screen name="PartyLedger" component={PartyLedgerScreen} options={{ title: 'Party Ledger' }} />
    </Stack.Navigator>
  );
}
