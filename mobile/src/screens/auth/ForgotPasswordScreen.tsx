import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { Screen } from '../../components/Screen';
import { Text } from '../../components/Text';
import { AuthStackParamList } from '../../navigation/types';
import { useAuthStore } from '../../store/authStore';
import { useTheme } from '../../theme/ThemeProvider';

type Props = NativeStackScreenProps<AuthStackParamList, 'ForgotPassword'>;

export function ForgotPasswordScreen({ navigation }: Props) {
  const theme = useTheme();
  const resetPasswordForEmail = useAuthStore((s) => s.resetPasswordForEmail);
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setError(null);
    if (!email.trim()) {
      setError('Enter your email address.');
      return;
    }
    setLoading(true);
    try {
      await resetPasswordForEmail(email);
      setSent(true);
    } catch (e: any) {
      setError(e.message ?? 'Could not send reset email. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text variant="title" style={styles.heading}>Reset your password</Text>
        <Text variant="body" tone="muted" style={styles.subheading}>
          We'll email you a link to reset your password.
        </Text>

        {error ? (
          <View style={[styles.errorBox, { backgroundColor: theme.status.critical + '15', borderColor: theme.status.critical }]}>
            <Text tone="destructive" variant="caption">{error}</Text>
          </View>
        ) : null}

        {sent ? (
          <View style={[styles.successBox, { backgroundColor: theme.status.good + '15', borderColor: theme.status.good }]}>
            <Text variant="body">Check your inbox — a password reset link is on its way.</Text>
          </View>
        ) : (
          <>
            <Input label="Email" required autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail} placeholder="you@business.com" />
            <Button label="Send Reset Link" onPress={handleSubmit} loading={loading} fullWidth style={styles.submit} />
          </>
        )}

        <Button label="Back to Sign In" variant="ghost" onPress={() => navigation.navigate('Login')} style={styles.link} />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: 24, flexGrow: 1, justifyContent: 'center' },
  heading: { textAlign: 'center' },
  subheading: { textAlign: 'center', marginTop: 4, marginBottom: 24 },
  errorBox: { padding: 12, borderRadius: 8, borderWidth: 1, marginBottom: 16 },
  successBox: { padding: 14, borderRadius: 8, borderWidth: 1, marginBottom: 16 },
  submit: { marginTop: 8 },
  link: { alignSelf: 'center', marginTop: 16 },
});
