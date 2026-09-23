import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { Button } from '../../components/Button';
import { DateField } from '../../components/DateField';
import { Input } from '../../components/Input';
import { Screen } from '../../components/Screen';
import { SelectField } from '../../components/SelectField';
import { api } from '../../lib/api';
import { BankAccount, BankTxnType } from '../../lib/types';
import { BankStackParamList } from '../../navigation/types';
import { useBusinessStore } from '../../store/businessStore';
import { toast } from '../../store/toastStore';
import { todayISO } from '../../utils/format';

type Props = NativeStackScreenProps<BankStackParamList, 'BankTransactionForm'>;

const TXN_TYPES: { label: string; value: BankTxnType }[] = [
  { label: 'Deposit', value: 'Deposit' },
  { label: 'Withdrawal', value: 'Withdrawal' },
  { label: 'Expense', value: 'Expense' },
];

export function BankTransactionFormScreen({ route, navigation }: Props) {
  const { accountId } = route.params;
  const selectedBusiness = useBusinessStore((s) => s.selectedBusiness);

  const [account, setAccount] = useState<BankAccount | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [type, setType] = useState<BankTxnType>('Deposit');
  const [amount, setAmount] = useState('');
  const [purpose, setPurpose] = useState('');
  const [date, setDate] = useState(todayISO());
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!selectedBusiness) return;
    (async () => {
      const accounts = await api.bankAccount.getAll(selectedBusiness.id);
      setAccount(accounts.find((a) => a.id === accountId) ?? null);
      setLoading(false);
    })();
  }, [accountId, selectedBusiness]);

  const validate = () => {
    const next: Record<string, string> = {};
    if (!amount || Number.isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) next.amount = 'Enter a valid amount';
    if (!purpose.trim()) next.purpose = 'Enter a purpose / note';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSave = async () => {
    if (!selectedBusiness || !account) return;
    if (!validate()) return;
    setSaving(true);
    try {
      const amt = parseFloat(amount);
      await api.bankTransaction.create({
        business_id: selectedBusiness.id,
        date,
        bank_name: account.bank_name,
        account_no: account.account_number,
        type,
        amount: amt,
        purpose: purpose.trim(),
      });
      const newBalance = type === 'Deposit' ? account.current_balance + amt : account.current_balance - amt;
      await api.bankAccount.update(account.id, { current_balance: newBalance });
      toast.success('Transaction recorded');
      navigation.goBack();
    } catch (e: any) {
      toast.error(e.message ?? 'Could not save transaction');
    } finally {
      setSaving(false);
    }
  };

  if (loading || !account) return <Screen><></></Screen>;

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <SelectField label="Type" required options={TXN_TYPES} value={type} onChange={(v) => setType(v as BankTxnType)} />
        <Input label="Amount (₹)" required value={amount} onChangeText={setAmount} error={errors.amount} keyboardType="decimal-pad" placeholder="0.00" />
        <DateField label="Date" required value={date} onChange={setDate} />
        <Input label="Purpose / Note" required value={purpose} onChangeText={setPurpose} error={errors.purpose} placeholder="e.g. Cash deposit" />

        <Button label="Save Transaction" onPress={handleSave} loading={saving} fullWidth style={styles.submit} />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, paddingBottom: 40 },
  submit: { marginTop: 8 },
});
