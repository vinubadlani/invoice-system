import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { InvoiceLineItem, Item } from '../lib/types';
import { useTheme } from '../theme/ThemeProvider';
import { computeLineItemTax } from '../utils/gst';
import { formatCurrency } from '../utils/format';
import { BottomSheet } from './BottomSheet';
import { Button } from './Button';
import { Card } from './Card';
import { SelectField } from './SelectField';
import { Text } from './Text';

interface LineItemsEditorProps {
  lineItems: InvoiceLineItem[];
  onChange: (items: InvoiceLineItem[]) => void;
  catalog: Item[];
  gstEnabled: boolean;
  onAddCatalogItem?: () => void;
}

export function LineItemsEditor({ lineItems, onChange, catalog, gstEnabled, onAddCatalogItem }: LineItemsEditorProps) {
  const theme = useTheme();
  const [pickerOpen, setPickerOpen] = useState(false);

  const addItem = (catalogItem: Item) => {
    const newLine: InvoiceLineItem = {
      item_id: catalogItem.id,
      item_name: catalogItem.name,
      hsn_code: catalogItem.hsn_code,
      unit: catalogItem.unit,
      quantity: 1,
      rate: catalogItem.sales_price,
      gst_percent: catalogItem.gst_percent,
      gst_amount: 0,
      total_amount: 0,
    };
    const tax = computeLineItemTax({ rate: newLine.rate, quantity: newLine.quantity, gstPercent: newLine.gst_percent }, gstEnabled);
    onChange([...lineItems, { ...newLine, gst_amount: tax.gstAmount, total_amount: tax.totalAmount }]);
    setPickerOpen(false);
  };

  const addBlankItem = () => {
    onChange([
      ...lineItems,
      { item_name: '', quantity: 1, rate: 0, gst_percent: 0, gst_amount: 0, total_amount: 0, unit: 'PCS' },
    ]);
  };

  const updateLine = (index: number, patch: Partial<InvoiceLineItem>) => {
    const next = [...lineItems];
    const merged = { ...next[index], ...patch };
    const tax = computeLineItemTax({ rate: merged.rate, quantity: merged.quantity, gstPercent: merged.gst_percent }, gstEnabled);
    next[index] = { ...merged, gst_amount: tax.gstAmount, total_amount: tax.totalAmount };
    onChange(next);
  };

  const removeLine = (index: number) => {
    onChange(lineItems.filter((_, i) => i !== index));
  };

  return (
    <View>
      <View style={styles.headerRow}>
        <Text variant="subtitle" weight="semibold">Items ({lineItems.length})</Text>
      </View>

      {lineItems.length === 0 ? (
        <Card style={styles.emptyCard}>
          <Text variant="body" tone="muted" style={styles.emptyText}>No items added yet</Text>
        </Card>
      ) : (
        lineItems.map((line, index) => (
          <Card key={index} style={styles.lineCard}>
            <View style={styles.lineTop}>
              <TextInput
                value={line.item_name}
                onChangeText={(v) => updateLine(index, { item_name: v })}
                placeholder="Item name"
                placeholderTextColor={theme.colors.mutedForeground}
                style={[styles.lineNameInput, { color: theme.colors.foreground }]}
              />
              <Pressable onPress={() => removeLine(index)} hitSlop={8}>
                <Ionicons name="trash-outline" size={18} color={theme.colors.destructive} />
              </Pressable>
            </View>

            <View style={styles.lineFieldsRow}>
              <LineField label="Qty" value={String(line.quantity)} onChangeText={(v) => updateLine(index, { quantity: parseFloat(v) || 0 })} />
              <LineField label="Rate" value={String(line.rate)} onChangeText={(v) => updateLine(index, { rate: parseFloat(v) || 0 })} />
              <LineField label="GST%" value={String(line.gst_percent)} onChangeText={(v) => updateLine(index, { gst_percent: parseFloat(v) || 0 })} editable={gstEnabled} />
            </View>

            <View style={styles.lineTotalRow}>
              <Text variant="caption" tone="muted">
                {gstEnabled ? `Tax: ${formatCurrency(line.gst_amount)}` : 'No GST'}
              </Text>
              <Text variant="body" weight="semibold">{formatCurrency(line.total_amount)}</Text>
            </View>
          </Card>
        ))
      )}

      <View style={styles.addRow}>
        <Button label="Pick Item" variant="outline" size="sm" onPress={() => setPickerOpen(true)} icon={<Ionicons name="list-outline" size={16} color={theme.colors.primary} />} />
        <Button label="Custom Line" variant="ghost" size="sm" onPress={addBlankItem} icon={<Ionicons name="add" size={16} color={theme.colors.primary} />} />
      </View>

      <BottomSheet visible={pickerOpen} onClose={() => setPickerOpen(false)} maxHeightPercent={70}>
        <View style={styles.pickerHeader}>
          <Text variant="subtitle" weight="semibold">Select item</Text>
        </View>
        <SelectField
          searchable
          placeholder="Search items…"
          options={catalog.map((c) => ({ label: c.name, value: c.id, description: `${formatCurrency(c.sales_price)} · GST ${c.gst_percent}%` }))}
          value=""
          onChange={(id) => {
            const c = catalog.find((x) => x.id === id);
            if (c) addItem(c);
          }}
        />
        {onAddCatalogItem ? (
          <Button label="Add new item to catalog" variant="ghost" onPress={onAddCatalogItem} style={styles.newItemBtn} />
        ) : null}
      </BottomSheet>
    </View>
  );
}

function LineField({ label, value, onChangeText, editable = true }: { label: string; value: string; onChangeText: (v: string) => void; editable?: boolean }) {
  const theme = useTheme();
  return (
    <View style={styles.field}>
      <Text variant="caption" tone="muted">{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        keyboardType="decimal-pad"
        editable={editable}
        style={[styles.fieldInput, { color: theme.colors.foreground, borderColor: theme.colors.border, opacity: editable ? 1 : 0.5 }]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  headerRow: { marginBottom: 8 },
  emptyCard: { alignItems: 'center', paddingVertical: 24 },
  emptyText: {},
  lineCard: { marginBottom: 10 },
  lineTop: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  lineNameInput: { flex: 1, fontSize: 15, fontWeight: '600', paddingVertical: 4 },
  lineFieldsRow: { flexDirection: 'row', gap: 10 },
  field: { flex: 1 },
  fieldInput: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, marginTop: 4, fontSize: 14 },
  lineTotalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 },
  addRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  pickerHeader: { paddingHorizontal: 20, paddingBottom: 4 },
  newItemBtn: { marginHorizontal: 20 },
});
