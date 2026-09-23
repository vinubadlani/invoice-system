import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { Screen } from '../../components/Screen';
import { SelectField } from '../../components/SelectField';
import { api } from '../../lib/api';
import { PartyType } from '../../lib/types';
import { PartyStackParamList } from '../../navigation/types';
import { useBusinessStore } from '../../store/businessStore';
import { toast } from '../../store/toastStore';
import { INDIAN_STATES } from '../../utils/indianStates';

type Props = NativeStackScreenProps<PartyStackParamList, 'PartyForm'>;

const PARTY_TYPES: { label: string; value: PartyType }[] = [
  { label: 'Customer (Debtor)', value: 'Debtor' },
  { label: 'Supplier (Creditor)', value: 'Creditor' },
  { label: 'Expense Party', value: 'Expense' },
];

export function PartyFormScreen({ route, navigation }: Props) {
  const partyId = route.params?.partyId;
  const isEdit = !!partyId;
  const selectedBusiness = useBusinessStore((s) => s.selectedBusiness);

  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [email, setEmail] = useState('');
  const [gstin, setGstin] = useState('');
  const [pan, setPan] = useState('');
  const [type, setType] = useState<PartyType>('Debtor');
  const [openingBalance, setOpeningBalance] = useState('0');
  const [balanceType, setBalanceType] = useState<'To Collect' | 'To Pay'>('To Collect');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [pincode, setPincode] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    navigation.setOptions({ title: isEdit ? 'Edit Party' : 'Add Party' });
  }, [isEdit, navigation]);

  useEffect(() => {
    if (!partyId || !selectedBusiness) return;
    (async () => {
      try {
        const all = await api.party.getAll(selectedBusiness.id);
        const p = all.find((x) => x.id === partyId);
        if (p) {
          setName(p.name);
          setMobile(p.mobile);
          setEmail(p.email ?? '');
          setGstin(p.gstin ?? '');
          setPan(p.pan ?? '');
          setType(p.type);
          setOpeningBalance(String(p.opening_balance));
          setBalanceType(p.balance_type);
          setAddress(p.address);
          setCity(p.city);
          setState(p.state);
          setPincode(p.pincode);
        }
      } catch (e: any) {
        toast.error(e.message ?? 'Could not load party');
      } finally {
        setLoading(false);
      }
    })();
  }, [partyId, selectedBusiness]);

  const validate = () => {
    const next: Record<string, string> = {};
    if (!name.trim()) next.name = 'Name is required';
    if (!/^[6-9]\d{9}$/.test(mobile.trim())) next.mobile = 'Enter a valid 10-digit mobile number';
    if (!address.trim()) next.address = 'Address is required';
    if (!city.trim()) next.city = 'City is required';
    if (!state) next.state = 'State is required';
    if (!/^\d{6}$/.test(pincode.trim())) next.pincode = 'Enter a valid 6-digit pincode';
    if (email.trim() && !/^\S+@\S+\.\S+$/.test(email.trim())) next.email = 'Enter a valid email';
    if (gstin.trim() && !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(gstin.trim().toUpperCase())) {
      next.gstin = 'Enter a valid 15-character GSTIN';
    }
    if (Number.isNaN(parseFloat(openingBalance))) next.openingBalance = 'Enter a valid amount';
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
        name: name.trim(),
        mobile: mobile.trim(),
        email: email.trim() || undefined,
        gstin: gstin.trim() || undefined,
        pan: pan.trim() || undefined,
        type,
        opening_balance: parseFloat(openingBalance) || 0,
        balance_type: balanceType,
        address: address.trim(),
        city: city.trim(),
        state,
        pincode: pincode.trim(),
      };
      if (isEdit && partyId) {
        await api.party.update(partyId, payload);
        toast.success('Party updated');
      } else {
        await api.party.create(payload);
        toast.success('Party added');
      }
      navigation.goBack();
    } catch (e: any) {
      toast.error(e.message ?? 'Could not save party');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Screen><></></Screen>;

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <SelectField label="Type" required options={PARTY_TYPES} value={type} onChange={(v) => setType(v as PartyType)} />
        <Input label="Name" required value={name} onChangeText={setName} error={errors.name} placeholder="Party name" />
        <Input label="Mobile" required value={mobile} onChangeText={setMobile} error={errors.mobile} keyboardType="phone-pad" maxLength={10} placeholder="10-digit mobile" />
        <Input label="Email" value={email} onChangeText={setEmail} error={errors.email} keyboardType="email-address" autoCapitalize="none" placeholder="Optional" />
        <Input label="GSTIN" value={gstin} onChangeText={(v) => setGstin(v.toUpperCase())} error={errors.gstin} autoCapitalize="characters" maxLength={15} placeholder="Optional" />
        <Input label="PAN" value={pan} onChangeText={(v) => setPan(v.toUpperCase())} autoCapitalize="characters" maxLength={10} placeholder="Optional" />
        <Input label="Address" required value={address} onChangeText={setAddress} error={errors.address} multiline numberOfLines={2} placeholder="Street address" />
        <Input label="City" required value={city} onChangeText={setCity} error={errors.city} placeholder="City" />
        <SelectField label="State" required searchable options={INDIAN_STATES.map((s) => ({ label: s, value: s }))} value={state} onChange={setState} error={errors.state} placeholder="Select state" />
        <Input label="Pincode" required value={pincode} onChangeText={setPincode} error={errors.pincode} keyboardType="number-pad" maxLength={6} placeholder="6-digit pincode" />
        <Input label="Opening Balance" value={openingBalance} onChangeText={setOpeningBalance} error={errors.openingBalance} keyboardType="decimal-pad" placeholder="0" />
        <SelectField
          label="Balance Type"
          required
          options={[{ label: 'To Collect (Receivable)', value: 'To Collect' }, { label: 'To Pay (Payable)', value: 'To Pay' }]}
          value={balanceType}
          onChange={(v) => setBalanceType(v as 'To Collect' | 'To Pay')}
        />

        <Button label={isEdit ? 'Save Changes' : 'Add Party'} onPress={handleSave} loading={saving} fullWidth style={styles.submit} />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, paddingBottom: 40 },
  submit: { marginTop: 8 },
});
