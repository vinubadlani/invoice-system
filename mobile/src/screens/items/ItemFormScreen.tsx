import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { Screen } from '../../components/Screen';
import { SelectField } from '../../components/SelectField';
import { api } from '../../lib/api';
import { ItemStackParamList } from '../../navigation/types';
import { useBusinessStore } from '../../store/businessStore';
import { toast } from '../../store/toastStore';
import { confirm } from '../../utils/confirm';

type Props = NativeStackScreenProps<ItemStackParamList, 'ItemForm'>;

const UNITS = ['PCS', 'KG', 'GM', 'LTR', 'ML', 'MTR', 'BOX', 'DOZEN', 'PACK', 'SET', 'BAG', 'UNIT'];
const GST_SLABS = [0, 0.25, 3, 5, 12, 18, 28];

export function ItemFormScreen({ route, navigation }: Props) {
  const itemId = route.params?.itemId;
  const isEdit = !!itemId;
  const selectedBusiness = useBusinessStore((s) => s.selectedBusiness);

  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [hsnCode, setHsnCode] = useState('');
  const [gstPercent, setGstPercent] = useState('0');
  const [unit, setUnit] = useState('PCS');
  const [salesPrice, setSalesPrice] = useState('');
  const [purchasePrice, setPurchasePrice] = useState('');
  const [openingStock, setOpeningStock] = useState('0');
  const [description, setDescription] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    navigation.setOptions({ title: isEdit ? 'Edit Item' : 'Add Item' });
  }, [isEdit, navigation]);

  useEffect(() => {
    if (!itemId || !selectedBusiness) return;
    (async () => {
      try {
        const all = await api.item.getAll(selectedBusiness.id);
        const i = all.find((x) => x.id === itemId);
        if (i) {
          setName(i.name);
          setCode(i.code);
          setHsnCode(i.hsn_code ?? '');
          setGstPercent(String(i.gst_percent));
          setUnit(i.unit);
          setSalesPrice(String(i.sales_price));
          setPurchasePrice(String(i.purchase_price));
          setOpeningStock(String(i.opening_stock));
          setDescription(i.description ?? '');
        }
      } catch (e: any) {
        toast.error(e.message ?? 'Could not load item');
      } finally {
        setLoading(false);
      }
    })();
  }, [itemId, selectedBusiness]);

  const validate = () => {
    const next: Record<string, string> = {};
    if (!name.trim()) next.name = 'Name is required';
    if (!code.trim()) next.code = 'Item code is required';
    if (!unit) next.unit = 'Unit is required';
    if (Number.isNaN(parseFloat(salesPrice)) || parseFloat(salesPrice) < 0) next.salesPrice = 'Enter a valid price';
    if (Number.isNaN(parseFloat(purchasePrice)) || parseFloat(purchasePrice) < 0) next.purchasePrice = 'Enter a valid price';
    if (Number.isNaN(parseInt(openingStock, 10)) || parseInt(openingStock, 10) < 0) next.openingStock = 'Enter a valid quantity';
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
        code: code.trim(),
        hsn_code: hsnCode.trim() || undefined,
        gst_percent: parseFloat(gstPercent) || 0,
        unit,
        sales_price: parseFloat(salesPrice) || 0,
        purchase_price: parseFloat(purchasePrice) || 0,
        opening_stock: parseInt(openingStock, 10) || 0,
        description: description.trim() || undefined,
      };
      if (isEdit && itemId) {
        await api.item.update(itemId, payload);
        toast.success('Item updated');
      } else {
        await api.item.create(payload);
        toast.success('Item added');
      }
      navigation.goBack();
    } catch (e: any) {
      toast.error(e.message ?? 'Could not save item');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!itemId) return;
    const ok = await confirm({ title: 'Delete item?', message: `This permanently deletes "${name}".`, confirmLabel: 'Delete', destructive: true });
    if (!ok) return;
    try {
      await api.item.delete(itemId);
      toast.success('Item deleted');
      navigation.goBack();
    } catch (e: any) {
      toast.error(e.message ?? 'Could not delete item');
    }
  };

  if (loading) return <Screen><></></Screen>;

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Input label="Item Name" required value={name} onChangeText={setName} error={errors.name} placeholder="e.g. Cotton Shirt" />
        <Input label="Item Code" required value={code} onChangeText={setCode} error={errors.code} placeholder="SKU / code" />
        <Input label="HSN Code" value={hsnCode} onChangeText={setHsnCode} placeholder="Optional" keyboardType="number-pad" />
        <SelectField label="GST %" options={GST_SLABS.map((g) => ({ label: `${g}%`, value: String(g) }))} value={gstPercent} onChange={setGstPercent} />
        <SelectField label="Unit" required searchable options={UNITS.map((u) => ({ label: u, value: u }))} value={unit} onChange={setUnit} error={errors.unit} />
        <Input label="Sales Price" required value={salesPrice} onChangeText={setSalesPrice} error={errors.salesPrice} keyboardType="decimal-pad" placeholder="0.00" />
        <Input label="Purchase Price" required value={purchasePrice} onChangeText={setPurchasePrice} error={errors.purchasePrice} keyboardType="decimal-pad" placeholder="0.00" />
        <Input label="Opening Stock" value={openingStock} onChangeText={setOpeningStock} error={errors.openingStock} keyboardType="number-pad" placeholder="0" />
        <Input label="Description" value={description} onChangeText={setDescription} placeholder="Optional" multiline numberOfLines={3} />

        <Button label={isEdit ? 'Save Changes' : 'Add Item'} onPress={handleSave} loading={saving} fullWidth style={styles.submit} />
        {isEdit ? <Button label="Delete Item" variant="destructive" onPress={handleDelete} fullWidth style={styles.delete} /> : null}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, paddingBottom: 40 },
  submit: { marginTop: 8 },
  delete: { marginTop: 12 },
});
