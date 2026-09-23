import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useCallback, useEffect, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, View } from 'react-native';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { EmptyState } from '../../components/EmptyState';
import { ErrorState } from '../../components/ErrorState';
import { Screen } from '../../components/Screen';
import { Text } from '../../components/Text';
import { BusinessStackParamList } from '../../navigation/types';
import { useAuthStore } from '../../store/authStore';
import { useBusinessStore } from '../../store/businessStore';
import { useTheme } from '../../theme/ThemeProvider';
import { Business } from '../../lib/types';

type Props = NativeStackScreenProps<BusinessStackParamList, 'BusinessSelector'>;

export function BusinessSelectorScreen({ navigation }: Props) {
  const theme = useTheme();
  const { businesses, selectedBusiness, loading, error, loadBusinesses, selectBusiness } = useBusinessStore();
  const signOut = useAuthStore((s) => s.signOut);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadBusinesses();
  }, [loadBusinesses]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadBusinesses();
    setRefreshing(false);
  }, [loadBusinesses]);

  const handleSelect = async (business: Business) => {
    await selectBusiness(business);
  };

  if (error) {
    return (
      <Screen>
        <ErrorState message={error} onRetry={loadBusinesses} />
      </Screen>
    );
  }

  return (
    <Screen>
      <View style={styles.header}>
        <Text variant="title">Your Businesses</Text>
        <Text variant="body" tone="muted" style={styles.subtitle}>Choose which business to work with</Text>
      </View>

      <FlatList
        data={businesses}
        keyExtractor={(b) => b.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />}
        ListEmptyComponent={
          !loading ? (
            <EmptyState
              icon="business-outline"
              title="No businesses yet"
              description="Create your first business to start invoicing."
              actionLabel="Add Business"
              onAction={() => navigation.navigate('BusinessForm', undefined)}
            />
          ) : null
        }
        renderItem={({ item }) => {
          const active = selectedBusiness?.id === item.id;
          return (
            <Pressable onPress={() => handleSelect(item)}>
              <Card style={[styles.card, active && { borderColor: theme.colors.primary, borderWidth: 1.5 }]}>
                <View style={styles.cardRow}>
                  <View style={[styles.avatar, { backgroundColor: theme.colors.accent }]}>
                    <Text variant="subtitle" tone="primary">{item.name.charAt(0).toUpperCase()}</Text>
                  </View>
                  <View style={styles.cardInfo}>
                    <Text variant="subtitle" weight="semibold">{item.name}</Text>
                    <Text variant="caption" tone="muted">{item.city}, {item.state}</Text>
                    {item.gstin ? <Text variant="caption" tone="muted">GSTIN: {item.gstin}</Text> : null}
                  </View>
                  {active ? <Ionicons name="checkmark-circle" size={22} color={theme.colors.primary} /> : null}
                </View>
              </Card>
            </Pressable>
          );
        }}
      />

      <View style={styles.footer}>
        <Button label="Add Business" variant="outline" onPress={() => navigation.navigate('BusinessForm', undefined)} fullWidth />
        <Button label="Sign Out" variant="ghost" onPress={() => signOut()} fullWidth style={styles.signOut} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12 },
  subtitle: { marginTop: 2 },
  list: { paddingHorizontal: 20, paddingBottom: 12, gap: 10 },
  card: { marginBottom: 0 },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  cardInfo: { flex: 1 },
  footer: { padding: 20, gap: 8 },
  signOut: { marginTop: 0 },
});
