import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { Screen } from '../../components/Screen';
import { SelectField } from '../../components/SelectField';
import { api } from '../../lib/api';
import { BusinessStackParamList } from '../../navigation/types';
import { useBusinessStore } from '../../store/businessStore';
import { toast } from '../../store/toastStore';
import { INDIAN_STATES } from '../../utils/indianStates';

type Props = NativeStackScreenProps<BusinessStackParamList, 'BusinessForm'>;

export function BusinessFormScreen({ navigation }: Props) {
  const { loadBusinesses, selectBusiness } = useBusinessStore();
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [pincode, setPincode] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [gstin, setGstin] = useState('');
  const [pan, setPan] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const validate = () => {
    const next: Record<string, string> = {};
    if (!name.trim()) next.name = 'Business name is required';
    if (!address.trim()) next.address = 'Address is required';
    if (!city.trim()) next.city = 'City is required';
    if (!state) next.state = 'State is required';
    if (!/^\d{6}$/.test(pincode.trim())) next.pincode = 'Enter a valid 6-digit pincode';
    if (!/^[6-9]\d{9}$/.test(phone.trim())) next.phone = 'Enter a valid 10-digit phone number';
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) next.email = 'Enter a valid email';
    if (gstin.trim() && !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(gstin.trim().toUpperCase())) {
      next.gstin = 'Enter a valid 15-character GSTIN';
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      const id = await api.business.create({
        name: name.trim(),
        address: address.trim(),
        city: city.trim(),
        state,
        pincode: pincode.trim(),
        phone: phone.trim(),
        email: email.trim(),
        gstin: gstin.trim() || undefined,
        pan: pan.trim() || undefined,
      });
      await loadBusinesses();
      const [created] = await api.business.getById(id);
      if (created) await selectBusiness(created);
      toast.success('Business created');
      navigation.goBack();
    } catch (e: any) {
      toast.error(e.message ?? 'Could not create business');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Input label="Business Name" required value={name} onChangeText={setName} error={errors.name} placeholder="e.g. Sharma Traders" />
        <Input label="Address" required value={address} onChangeText={setAddress} error={errors.address} placeholder="Shop / street address" multiline numberOfLines={2} />
        <Input label="City" required value={city} onChangeText={setCity} error={errors.city} placeholder="City" />
        <SelectField label="State" required searchable options={INDIAN_STATES.map((s) => ({ label: s, value: s }))} value={state} onChange={setState} error={errors.state} placeholder="Select state" />
        <Input label="Pincode" required value={pincode} onChangeText={setPincode} error={errors.pincode} keyboardType="number-pad" maxLength={6} placeholder="6-digit pincode" />
        <Input label="Phone" required value={phone} onChangeText={setPhone} error={errors.phone} keyboardType="phone-pad" maxLength={10} placeholder="10-digit mobile" />
        <Input label="Email" required value={email} onChangeText={setEmail} error={errors.email} keyboardType="email-address" autoCapitalize="none" placeholder="business@example.com" />
        <Input label="GSTIN" value={gstin} onChangeText={(v) => setGstin(v.toUpperCase())} error={errors.gstin} autoCapitalize="characters" maxLength={15} placeholder="Optional — 15 characters" />
        <Input label="PAN" value={pan} onChangeText={(v) => setPan(v.toUpperCase())} autoCapitalize="characters" maxLength={10} placeholder="Optional" />

        <Button label="Create Business" onPress={handleSave} loading={saving} fullWidth style={styles.submit} />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, paddingBottom: 40 },
  submit: { marginTop: 8 },
});
