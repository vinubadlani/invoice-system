import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';
import { InventoryHomeScreen } from '../screens/items/InventoryHomeScreen';
import { ItemFormScreen } from '../screens/items/ItemFormScreen';
import { ItemListScreen } from '../screens/items/ItemListScreen';
import { useTheme } from '../theme/ThemeProvider';
import { defaultStackScreenOptions } from './screenOptions';
import { ItemStackParamList } from './types';

const Stack = createNativeStackNavigator<ItemStackParamList>();

export function ItemNavigator() {
  const theme = useTheme();
  return (
    <Stack.Navigator screenOptions={defaultStackScreenOptions(theme)}>
      <Stack.Screen name="InventoryHome" component={InventoryHomeScreen} options={{ headerShown: false }} />
      <Stack.Screen name="ItemList" component={ItemListScreen} options={{ title: 'Items' }} />
      <Stack.Screen name="ItemForm" component={ItemFormScreen} options={{ title: 'Add Item' }} />
    </Stack.Navigator>
  );
}
