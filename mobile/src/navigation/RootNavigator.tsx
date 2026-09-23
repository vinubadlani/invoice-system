import { NavigationContainer } from '@react-navigation/native';
import React, { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useAuthStore } from '../store/authStore';
import { useBusinessStore } from '../store/businessStore';
import { useTheme } from '../theme/ThemeProvider';
import { AuthNavigator } from './AuthNavigator';
import { BusinessNavigator } from './BusinessNavigator';
import { MainTabs } from './MainTabs';

export function RootNavigator() {
  const theme = useTheme();
  const { session, user, initializing, init } = useAuthStore();
  const { selectedBusiness, loading: businessLoading, loadBusinesses, restoreSelection, clear: clearBusiness } = useBusinessStore();

  useEffect(() => {
    const unsubscribe = init();
    return unsubscribe;
  }, [init]);

  useEffect(() => {
    if (user) {
      loadBusinesses().then(restoreSelection);
    } else {
      clearBusiness();
    }
  }, [user?.id]);

  const navTheme = {
    dark: theme.isDark,
    colors: {
      primary: theme.colors.primary,
      background: theme.colors.background,
      card: theme.colors.card,
      text: theme.colors.foreground,
      border: theme.colors.border,
      notification: theme.colors.destructive,
    },
    fonts: {
      regular: { fontFamily: 'System', fontWeight: '400' as const },
      medium: { fontFamily: 'System', fontWeight: '500' as const },
      bold: { fontFamily: 'System', fontWeight: '700' as const },
      heavy: { fontFamily: 'System', fontWeight: '800' as const },
    },
  };

  if (initializing) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.background }}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer theme={navTheme}>
      {!session ? (
        <AuthNavigator />
      ) : businessLoading && !selectedBusiness ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.background }}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      ) : !selectedBusiness ? (
        <BusinessNavigator />
      ) : (
        <MainTabs />
      )}
    </NavigationContainer>
  );
}
