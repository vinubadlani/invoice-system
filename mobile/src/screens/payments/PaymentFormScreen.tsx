import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { Button } from '../../components/Button';
import { DateField } from '../../components/DateField';
import { Input } from '../../components/Input';
import { Screen } from '../../components/Screen';
import { SelectField } from '../../components/SelectField';
import { api } from '../../lib/api';
import { Party, PaymentDirection } from '../../lib/types';
import { PaymentStackParamList } from '../../navigation/types';
import { useBusinessStore } from '../../store/businessStore';
import { toast } from '../../store/toastStore';
import { confirm } from '../../utils/confirm';
import { todayISO } from '../../utils/format';

type Props = NativeStackScreenProps<PaymentStackParamList, 'PaymentForm'>;

const PAYMENT_MODES = ['Cash', 'Bank Transfer', 'UPI', 'Cheque', 'Card', 'Other'];

export function PaymentFormScreen({ route, navigation }: Props) {
  const paymentId = route.params?.paymentId;
  const isEdit = !!paymentId;
  const selectedBusiness = useBusinessStore((s) => s.selectedBusiness);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [parties, setParties] = useState<Party[]>([]);
  const [partyName, setPartyName] = useState('');
  const [type, setType] = useState<PaymentDirection>('Received');
  const [amount, setAmount] = useState('');
  const [mode, setMode] = useState('Cash');
  const [date, setDate] = useState(todayISO());
  const [invoiceNo, setInvoiceNo] = useState('');
  const [remarks, setRemarks] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    navigation.setOptions({ title: isEdit ? 'Edit Payment' : 'Add Payment' });
  }, [isEdit, navigation]);

  useEffect(() => {
    if (!selectedBusiness) return;
    (async () => {
      try {
        const partyList = await api.party.getAll(selectedBusiness.id);
        setParties(partyList);

        if (paymentId) {
          const allPayments = await api.payment.getAll(selectedBusiness.id);
          const p = allPayments.find((x) => x.id === paymentId);
          if (p) {
            setPartyName(p.party_name);
            setType(p.type);
            setAmount(String(p.amount));
            setMode(p.mode);
            setDate(p.date);
            setInvoiceNo(p.invoice_no ?? '');
            setRemarks(p.remarks ?? '');
          }
        }
      } catch (e: any) {
        toast.error(e.message ?? 'Could not load payment');
      } finally {
        setLoading(false);
      }
    })();
  }, [selectedBusiness?.id, paymentId]);

  const validate = () => {
    const next: Record<string, string> = {};
    if (!partyName.trim()) next.partyName = 'Select or enter a party';
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
        date,
        party_name: partyName.trim(),
        type,
        amount: parseFloat(amount),
        invoice_no: invoiceNo.trim() || undefined,
        mode,
        remarks: remarks.trim() || undefined,
      };
      if (isEdit && paymentId) {
        await api.payment.update(paymentId, payload);
        toast.success('Payment updated');
      } else {
        await api.payment.create(payload);
        toast.success('Payment recorded');
      }
      navigation.goBack();
    } catch (e: any) {
      toast.error(e.message ?? 'Could not save payment');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!paymentId) return;
    const ok = await confirm({ title: 'Delete payment?', message: 'This cannot be undone.', confirmLabel: 'Delete', destructive: true });
    if (!ok) return;
    try {
      await api.payment.delete(paymentId);
      toast.success('Payment deleted');
      navigation.goBack();
    } catch (e: any) {
      toast.error(e.message ?? 'Could not delete payment');
    }
  };

  if (loading) return <Screen><></></Screen>;

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <SelectField
          label="Type"
          required
          options={[{ label: 'Payment Received', value: 'Received' }, { label: 'Payment Paid', value: 'Paid' }]}
          value={type}
          onChange={(v) => setType(v as PaymentDirection)}
        />
        <SelectField
          label="Party"
          required
          searchable
          placeholder="Select party"
          options={parties.map((p) => ({ label: p.name, value: p.name }))}
          value={partyName}
          onChange={setPartyName}
          error={errors.partyName}
        />
        <Input label="Amount (₹)" required value={amount} onChangeText={setAmount} error={errors.amount} keyboardType="decimal-pad" placeholder="0.00" />
        <SelectField label="Payment Mode" required options={PAYMENT_MODES.map((m) => ({ label: m, value: m }))} value={mode} onChange={setMode} />
        <DateField label="Date" required value={date} onChange={setDate} />
        <Input label="Invoice No." value={invoiceNo} onChangeText={setInvoiceNo} placeholder="Optional — link to an invoice" />
        <Input label="Remarks" value={remarks} onChangeText={setRemarks} placeholder="Optional" multiline numberOfLines={2} />

        <Button label={isEdit ? 'Save Changes' : 'Save Payment'} onPress={handleSave} loading={saving} fullWidth style={styles.submit} />
        {isEdit ? <Button label="Delete Payment" variant="destructive" onPress={handleDelete} fullWidth style={styles.delete} /> : null}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, paddingBottom: 40 },
  submit: { marginTop: 8 },
  delete: { marginTop: 12 },
});
