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

type Props = NativeStackScreenProps<AuthStackParamList, 'Signup'>;

export function SignupScreen({ navigation }: Props) {
  const theme = useTheme();
  const signUp = useAuthStore((s) => s.signUp);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setError(null);
    if (!fullName.trim() || !email.trim() || !password) {
      setError('Please fill in all fields.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    setLoading(true);
    try {
      const { needsEmailConfirmation } = await signUp(email.trim(), password, fullName.trim());
      if (needsEmailConfirmation) {
        navigation.replace('VerifyEmail', { email: email.trim() });
      }
    } catch (e: any) {
      setError(e.message ?? 'Could not create account. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text variant="title" style={styles.heading}>Create your account</Text>
        <Text variant="body" tone="muted" style={styles.subheading}>Start managing your business on the go</Text>

        {error ? (
          <View style={[styles.errorBox, { backgroundColor: theme.status.critical + '15', borderColor: theme.status.critical }]}>
            <Text tone="destructive" variant="caption">{error}</Text>
          </View>
        ) : null}

        <Input label="Full Name" required autoComplete="name" value={fullName} onChangeText={setFullName} placeholder="Your name" />
        <Input label="Email" required autoCapitalize="none" keyboardType="email-address" autoComplete="email" value={email} onChangeText={setEmail} placeholder="you@business.com" />
        <Input label="Password" required secureTextEntry value={password} onChangeText={setPassword} placeholder="At least 6 characters" />
        <Input label="Confirm Password" required secureTextEntry value={confirmPassword} onChangeText={setConfirmPassword} placeholder="Re-enter password" />

        <Button label="Sign Up" onPress={handleSubmit} loading={loading} fullWidth style={styles.submit} />

        <View style={styles.footer}>
          <Text variant="body" tone="muted">Already have an account? </Text>
          <Button label="Sign In" variant="ghost" onPress={() => navigation.navigate('Login')} />
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: 24, flexGrow: 1, justifyContent: 'center' },
  heading: { textAlign: 'center' },
  subheading: { textAlign: 'center', marginTop: 4, marginBottom: 24 },
  errorBox: { padding: 12, borderRadius: 8, borderWidth: 1, marginBottom: 16 },
  submit: { marginTop: 8 },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 24 },
});
