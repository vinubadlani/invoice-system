import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { Screen } from '../../components/Screen';
import { SelectField } from '../../components/SelectField';
import { SettingsStackParamList } from '../../navigation/types';
import { useBusinessStore } from '../../store/businessStore';
import { toast } from '../../store/toastStore';
import { INDIAN_STATES } from '../../utils/indianStates';

type Props = NativeStackScreenProps<SettingsStackParamList, 'BusinessProfile'>;

export function BusinessProfileScreen({}: Props) {
  const { selectedBusiness, updateBusiness } = useBusinessStore();
  const b = selectedBusiness!;

  const [name, setName] = useState(b.name);
  const [address, setAddress] = useState(b.address);
  const [city, setCity] = useState(b.city);
  const [state, setState] = useState(b.state);
  const [pincode, setPincode] = useState(b.pincode);
  const [phone, setPhone] = useState(b.phone);
  const [email, setEmail] = useState(b.email);
  const [gstin, setGstin] = useState(b.gstin ?? '');
  const [pan, setPan] = useState(b.pan ?? '');
  const [termsConditions, setTermsConditions] = useState(b.terms_conditions ?? '');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const validate = () => {
    const next: Record<string, string> = {};
    if (!name.trim()) next.name = 'Business name is required';
    if (!/^\d{6}$/.test(pincode.trim())) next.pincode = 'Enter a valid 6-digit pincode';
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) next.email = 'Enter a valid email';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      await updateBusiness(b.id, {
        name: name.trim(),
        address: address.trim(),
        city: city.trim(),
        state,
        pincode: pincode.trim(),
        phone: phone.trim(),
        email: email.trim(),
        gstin: gstin.trim() || undefined,
        pan: pan.trim() || undefined,
        terms_conditions: termsConditions.trim() || undefined,
      });
      toast.success('Business profile updated');
    } catch (e: any) {
      toast.error(e.message ?? 'Could not update business');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Input label="Business Name" required value={name} onChangeText={setName} error={errors.name} />
        <Input label="Address" required value={address} onChangeText={setAddress} multiline numberOfLines={2} />
        <Input label="City" required value={city} onChangeText={setCity} />
        <SelectField label="State" required searchable options={INDIAN_STATES.map((s) => ({ label: s, value: s }))} value={state} onChange={setState} />
        <Input label="Pincode" required value={pincode} onChangeText={setPincode} error={errors.pincode} keyboardType="number-pad" maxLength={6} />
        <Input label="Phone" required value={phone} onChangeText={setPhone} keyboardType="phone-pad" maxLength={10} />
        <Input label="Email" required value={email} onChangeText={setEmail} error={errors.email} keyboardType="email-address" autoCapitalize="none" />
        <Input label="GSTIN" value={gstin} onChangeText={(v) => setGstin(v.toUpperCase())} autoCapitalize="characters" maxLength={15} />
        <Input label="PAN" value={pan} onChangeText={(v) => setPan(v.toUpperCase())} autoCapitalize="characters" maxLength={10} />
        <Input label="Terms & Conditions" value={termsConditions} onChangeText={setTermsConditions} multiline numberOfLines={4} placeholder="Printed on invoices" />

        <Button label="Save Changes" onPress={handleSave} loading={saving} fullWidth style={styles.submit} />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, paddingBottom: 40 },
  submit: { marginTop: 8 },
});
