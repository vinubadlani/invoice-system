import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Button } from '../../components/Button';
import { Screen } from '../../components/Screen';
import { Text } from '../../components/Text';
import { AuthStackParamList } from '../../navigation/types';
import { useTheme } from '../../theme/ThemeProvider';

type Props = NativeStackScreenProps<AuthStackParamList, 'VerifyEmail'>;

export function VerifyEmailScreen({ route, navigation }: Props) {
  const theme = useTheme();
  const email = route.params?.email;

  return (
    <Screen>
      <View style={styles.content}>
        <View style={[styles.iconWrap, { backgroundColor: theme.colors.accent }]}>
          <Ionicons name="mail-outline" size={32} color={theme.colors.primary} />
        </View>
        <Text variant="title" style={styles.heading}>Confirm your email</Text>
        <Text variant="body" tone="muted" style={styles.body}>
          We sent a confirmation link{email ? ` to ${email}` : ''}. Open it to activate your account, then sign in.
        </Text>
        <Button label="Back to Sign In" onPress={() => navigation.replace('Login')} style={styles.button} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  iconWrap: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  heading: { textAlign: 'center' },
  body: { textAlign: 'center', marginTop: 8, marginBottom: 24 },
  button: {},
});
