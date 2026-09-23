import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { Button } from '../../components/Button';
import { DateField } from '../../components/DateField';
import { Input } from '../../components/Input';
import { Screen } from '../../components/Screen';
import { SelectField } from '../../components/SelectField';
import { api } from '../../lib/api';
import { ExpenseStackParamList } from '../../navigation/types';
import { useBusinessStore } from '../../store/businessStore';
import { toast } from '../../store/toastStore';
import { confirm } from '../../utils/confirm';
import { todayISO } from '../../utils/format';

type Props = NativeStackScreenProps<ExpenseStackParamList, 'ExpenseForm'>;

const COMMON_CATEGORIES = [
  'Rent', 'Utilities', 'Salaries', 'Office Supplies', 'Travel', 'Marketing', 'Maintenance',
  'Transport', 'Telephone & Internet', 'Insurance', 'Professional Fees', 'Miscellaneous',
];

export function ExpenseFormScreen({ route, navigation }: Props) {
  const expenseId = route.params?.expenseId;
  const isEdit = !!expenseId;
  const selectedBusiness = useBusinessStore((s) => s.selectedBusiness);

  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(todayISO());
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    navigation.setOptions({ title: isEdit ? 'Edit Expense' : 'Add Expense' });
  }, [isEdit, navigation]);

  useEffect(() => {
    if (!expenseId || !selectedBusiness) return;
    (async () => {
      const all = await api.expense.getAll(selectedBusiness.id);
      const e = all.find((x) => x.id === expenseId);
      if (e) {
        setCategory(e.category);
        setDescription(e.description);
        setAmount(String(e.amount));
        setDate(e.date);
      }
      setLoading(false);
    })();
  }, [expenseId, selectedBusiness]);

  const validate = () => {
    const next: Record<string, string> = {};
    if (!category.trim()) next.category = 'Select or enter a category';
    if (!description.trim()) next.description = 'Description is required';
    if (!amount || Number.isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) next.amount = 'Enter a valid amount';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSave = async () => {
    if (!selectedBusiness) return;
    if (!validate()) return;
    setSaving(true);
    try {
      const payload = {
        business_id: selectedBusiness.id,
        category: category.trim(),
        description: description.trim(),
        amount: parseFloat(amount),
        date,
      };
      if (isEdit && expenseId) {
        await api.expense.update(expenseId, payload);
        toast.success('Expense updated');
      } else {
        await api.expense.create(payload);
        toast.success('Expense added');
      }
      navigation.goBack();
    } catch (e: any) {
      toast.error(e.message ?? 'Could not save expense');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!expenseId) return;
    const ok = await confirm({ title: 'Delete expense?', message: 'This cannot be undone.', confirmLabel: 'Delete', destructive: true });
    if (!ok) return;
    try {
      await api.expense.delete(expenseId);
      toast.success('Expense deleted');
      navigation.goBack();
    } catch (e: any) {
      toast.error(e.message ?? 'Could not delete expense');
    }
  };

  if (loading) return <Screen><></></Screen>;

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <SelectField
          label="Category"
          required
          searchable
          placeholder="Select category"
          options={COMMON_CATEGORIES.map((c) => ({ label: c, value: c }))}
          value={category}
          onChange={setCategory}
          error={errors.category}
        />
        <Input label="Or enter a custom category" value={COMMON_CATEGORIES.includes(category) ? '' : category} onChangeText={setCategory} placeholder="Custom category" />
        <Input label="Description" required value={description} onChangeText={setDescription} error={errors.description} placeholder="What was this for?" multiline numberOfLines={2} />
        <Input label="Amount (₹)" required value={amount} onChangeText={setAmount} error={errors.amount} keyboardType="decimal-pad" placeholder="0.00" />
        <DateField label="Date" required value={date} onChange={setDate} />

        <Button label={isEdit ? 'Save Changes' : 'Add Expense'} onPress={handleSave} loading={saving} fullWidth style={styles.submit} />
        {isEdit ? <Button label="Delete Expense" variant="destructive" onPress={handleDelete} fullWidth style={styles.delete} /> : null}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, paddingBottom: 40 },
  submit: { marginTop: 8 },
  delete: { marginTop: 12 },
});
