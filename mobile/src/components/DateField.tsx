import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { format, parseISO } from 'date-fns';
import React, { useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { Text } from './Text';

interface DateFieldProps {
  label?: string;
  required?: boolean;
  value: string;
  onChange: (isoDate: string) => void;
  error?: string;
  minimumDate?: Date;
  maximumDate?: Date;
}

/** value/onChange use yyyy-MM-dd strings to match Postgres `date` columns directly. */
export function DateField({ label, required, value, onChange, error, minimumDate, maximumDate }: DateFieldProps) {
  const theme = useTheme();
  const [open, setOpen] = useState(false);
  const dateValue = value ? parseISO(value) : new Date();

  return (
    <View style={styles.wrap}>
      {label ? (
        <Text variant="label" tone="muted" style={styles.label}>
          {label}
          {required ? <Text tone="destructive"> *</Text> : null}
        </Text>
      ) : null}
      <Pressable
        onPress={() => setOpen(true)}
        style={[
          styles.field,
          { borderColor: error ? theme.colors.destructive : theme.colors.border, backgroundColor: theme.colors.card, borderRadius: theme.radius.md },
        ]}
      >
        <Text variant="body">{value ? format(dateValue, 'dd MMM yyyy') : 'Select date'}</Text>
        <Ionicons name="calendar-outline" size={18} color={theme.colors.mutedForeground} />
      </Pressable>
      {error ? (
        <Text variant="caption" tone="destructive" style={styles.helper}>
          {error}
        </Text>
      ) : null}

      {open ? (
        <DateTimePicker
          value={dateValue}
          mode="date"
          display={Platform.OS === 'ios' ? 'inline' : 'default'}
          minimumDate={minimumDate}
          maximumDate={maximumDate}
          onChange={(event, selected) => {
            setOpen(Platform.OS === 'ios');
            if (event.type === 'dismissed') {
              setOpen(false);
              return;
            }
            if (selected) {
              onChange(format(selected, 'yyyy-MM-dd'));
              if (Platform.OS === 'android') setOpen(false);
            }
          }}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 14 },
  label: { marginBottom: 6 },
  field: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    minHeight: 46, paddingHorizontal: 12, borderWidth: 1,
  },
  helper: { marginTop: 4 },
});
