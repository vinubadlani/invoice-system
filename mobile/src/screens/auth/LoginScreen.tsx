import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useState } from 'react';
import { Image, ScrollView, StyleSheet, View } from 'react-native';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { Screen } from '../../components/Screen';
import { Text } from '../../components/Text';
import { AuthStackParamList } from '../../navigation/types';
import { useAuthStore } from '../../store/authStore';
import { useTheme } from '../../theme/ThemeProvider';

type Props = NativeStackScreenProps<AuthStackParamList, 'Login'>;

export function LoginScreen({ navigation }: Props) {
  const theme = useTheme();
  const signIn = useAuthStore((s) => s.signIn);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setError(null);
    if (!email.trim() || !password) {
      setError('Enter your email and password.');
      return;
    }
    setLoading(true);
    try {
      await signIn(email.trim(), password);
    } catch (e: any) {
      setError(e.message ?? 'Could not sign in. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Image source={require('../../../assets/brand/logo.png')} style={styles.logo} resizeMode="contain" />
        <Text variant="body" tone="muted" style={styles.subheading}>Sign in to your account</Text>

        {error ? (
          <View style={[styles.errorBox, { backgroundColor: theme.status.critical + '15', borderColor: theme.status.critical }]}>
            <Text tone="destructive" variant="caption">{error}</Text>
          </View>
        ) : null}

        <Input
          label="Email"
          required
          autoCapitalize="none"
          keyboardType="email-address"
          autoComplete="email"
          value={email}
          onChangeText={setEmail}
          placeholder="you@business.com"
        />
        <Input
          label="Password"
          required
          secureTextEntry
          autoComplete="password"
          value={password}
          onChangeText={setPassword}
          placeholder="••••••••"
        />

        <Button label="Sign In" onPress={handleSubmit} loading={loading} fullWidth style={styles.submit} />

        <Button
          label="Forgot password?"
          variant="ghost"
          onPress={() => navigation.navigate('ForgotPassword')}
          style={styles.link}
        />

        <View style={styles.footer}>
          <Text variant="body" tone="muted">Don't have an account? </Text>
          <Button label="Sign Up" variant="ghost" onPress={() => navigation.navigate('Signup')} />
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: 24, flexGrow: 1, justifyContent: 'center' },
  logo: { width: '100%', height: 90, alignSelf: 'center', marginBottom: 8 },
  subheading: { textAlign: 'center', marginTop: 4, marginBottom: 24 },
  errorBox: { padding: 12, borderRadius: 8, borderWidth: 1, marginBottom: 16 },
  submit: { marginTop: 8 },
  link: { alignSelf: 'center', marginTop: 8 },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 24 },
});
