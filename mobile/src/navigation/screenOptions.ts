import { NativeStackNavigationOptions } from '@react-navigation/native-stack';
import { Theme } from '../theme/ThemeProvider';

export function defaultStackScreenOptions(theme: Theme): NativeStackNavigationOptions {
  return {
    headerStyle: { backgroundColor: theme.colors.card },
    headerTintColor: theme.colors.foreground,
    headerTitleStyle: { fontWeight: '600', color: theme.colors.foreground },
    headerShadowVisible: false,
    contentStyle: { backgroundColor: theme.colors.background },
  };
}
