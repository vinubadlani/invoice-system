import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { Screen } from '../../components/Screen';
import { SelectField } from '../../components/SelectField';
import { api } from '../../lib/api';
import { BankAccountType } from '../../lib/types';
import { BankStackParamList } from '../../navigation/types';
import { useBusinessStore } from '../../store/businessStore';
import { toast } from '../../store/toastStore';

type Props = NativeStackScreenProps<BankStackParamList, 'BankAccountForm'>;

// Matches the DB CHECK constraint exactly — 'Fixed Deposit'/'Credit Card' are
// NOT valid values even though an older web UI once offered them (schema bug,
// see mobile port reference §8). Never widen this list without a migration.
const ACCOUNT_TYPES: { label: string; value: BankAccountType }[] = [
  { label: 'Savings', value: 'Savings' },
  { label: 'Current', value: 'Current' },
  { label: 'Cash Credit (CC)', value: 'CC' },
  { label: 'Overdraft (OD)', value: 'OD' },
];

export function BankAccountFormScreen({ route, navigation }: Props) {
  const accountId = route.params?.accountId;
  const isEdit = !!accountId;
  const selectedBusiness = useBusinessStore((s) => s.selectedBusiness);

  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [ifscCode, setIfscCode] = useState('');
  const [accountType, setAccountType] = useState<BankAccountType>('Savings');
  const [branchName, setBranchName] = useState('');
  const [holderName, setHolderName] = useState('');
  const [openingBalance, setOpeningBalance] = useState('0');
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    navigation.setOptions({ title: isEdit ? 'Edit Bank Account' : 'Add Bank Account' });
  }, [isEdit, navigation]);

  useEffect(() => {
    if (!accountId || !selectedBusiness) return;
    (async () => {
      const all = await api.bankAccount.getAll(selectedBusiness.id);
      const a = all.find((x) => x.id === accountId);
      if (a) {
        setBankName(a.bank_name);
        setAccountNumber(a.account_number);
        setIfscCode(a.ifsc_code);
        setAccountType(a.account_type);
        setBranchName(a.branch_name);
        setHolderName(a.account_holder_name);
        setOpeningBalance(String(a.opening_balance));
      }
      setLoading(false);
    })();
  }, [accountId, selectedBusiness]);

  const validate = () => {
    const next: Record<string, string> = {};
    if (!bankName.trim()) next.bankName = 'Bank name is required';
    if (!accountNumber.trim()) next.accountNumber = 'Account number is required';
    if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifscCode.trim().toUpperCase())) next.ifscCode = 'Enter a valid 11-character IFSC code';
    if (!branchName.trim()) next.branchName = 'Branch name is required';
    if (!holderName.trim()) next.holderName = 'Account holder name is required';
    if (Number.isNaN(parseFloat(openingBalance))) next.openingBalance = 'Enter a valid amount';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSave = async () => {
    if (!selectedBusiness) return;
    if (!validate()) return;
    setSaving(true);
    try {
      const balance = parseFloat(openingBalance) || 0;
      const payload = {
        business_id: selectedBusiness.id,
        bank_name: bankName.trim(),
        account_number: accountNumber.trim(),
        ifsc_code: ifscCode.trim().toUpperCase(),
        account_type: accountType,
        branch_name: branchName.trim(),
        account_holder_name: holderName.trim(),
        opening_balance: balance,
        current_balance: balance,
        is_active: true,
      };
      if (isEdit && accountId) {
        await api.bankAccount.update(accountId, payload);
        toast.success('Bank account updated');
      } else {
        await api.bankAccount.create(payload);
        toast.success('Bank account added');
      }
      navigation.goBack();
    } catch (e: any) {
      toast.error(e.message ?? 'Could not save bank account');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Screen><></></Screen>;

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Input label="Bank Name" required value={bankName} onChangeText={setBankName} error={errors.bankName} placeholder="e.g. HDFC Bank" />
        <Input label="Account Holder Name" required value={holderName} onChangeText={setHolderName} error={errors.holderName} />
        <Input label="Account Number" required value={accountNumber} onChangeText={setAccountNumber} error={errors.accountNumber} keyboardType="number-pad" />
        <Input label="IFSC Code" required value={ifscCode} onChangeText={(v) => setIfscCode(v.toUpperCase())} error={errors.ifscCode} autoCapitalize="characters" maxLength={11} />
        <SelectField label="Account Type" required options={ACCOUNT_TYPES} value={accountType} onChange={(v) => setAccountType(v as BankAccountType)} />
        <Input label="Branch Name" required value={branchName} onChangeText={setBranchName} error={errors.branchName} />
        <Input label="Opening Balance (₹)" value={openingBalance} onChangeText={setOpeningBalance} error={errors.openingBalance} keyboardType="decimal-pad" editable={!isEdit} hint={isEdit ? 'Adjust via transactions, not directly' : undefined} />

        <Button label={isEdit ? 'Save Changes' : 'Add Account'} onPress={handleSave} loading={saving} fullWidth style={styles.submit} />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, paddingBottom: 40 },
  submit: { marginTop: 8 },
});
