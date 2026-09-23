import AsyncStorage from '@react-native-async-storage/async-storage';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { Button } from '../../components/Button';
import { GradientCard } from '../../components/GradientCard';
import { Screen } from '../../components/Screen';
import { Text } from '../../components/Text';
import { AuthStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<AuthStackParamList, 'Onboarding'>;

export const ONBOARDING_SEEN_KEY = 'onboarding_seen';

export function OnboardingScreen({ navigation }: Props) {
  const handleGetStarted = async () => {
    await AsyncStorage.setItem(ONBOARDING_SEEN_KEY, 'true');
    navigation.replace('Login');
  };

  return (
    <Screen>
      <View style={styles.content}>
        <GradientCard style={styles.illustration}>
          <Image source={require('../../../assets/brand/logo-white.png')} style={styles.logo} resizeMode="contain" />
        </GradientCard>

        <Text variant="title" weight="bold" style={styles.heading}>
          Send your invoice and{'\n'}get paid easily!
        </Text>
        <Text variant="body" tone="muted" style={styles.body}>
          Don't worry about payment problems and invoices to clients — track GST-ready
          sales, purchases and payments, right from your phone.
        </Text>

        <Button label="Get Started" onPress={handleGetStarted} fullWidth style={styles.button} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { flex: 1, justifyContent: 'center', padding: 24 },
  illustration: { height: 200, alignItems: 'center', justifyContent: 'center', marginBottom: 32 },
  logo: { width: '80%', height: '60%' },
  heading: { textAlign: 'center', marginBottom: 12 },
  body: { textAlign: 'center', marginBottom: 32, lineHeight: 20 },
  button: {},
});
