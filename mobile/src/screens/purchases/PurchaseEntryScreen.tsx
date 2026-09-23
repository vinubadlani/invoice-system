import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Switch, View } from 'react-native';
import { Button } from '../../components/Button';
import { DateField } from '../../components/DateField';
import { Input } from '../../components/Input';
import { InvoiceTotalsSummary } from '../../components/InvoiceTotalsSummary';
import { LineItemsEditor } from '../../components/LineItemsEditor';
import { Screen } from '../../components/Screen';
import { SelectField } from '../../components/SelectField';
import { Text } from '../../components/Text';
import { api } from '../../lib/api';
import { InvoiceLineItem, Item, Party } from '../../lib/types';
import { PurchaseStackParamList } from '../../navigation/types';
import { useBusinessStore } from '../../store/businessStore';
import { toast } from '../../store/toastStore';
import { todayISO } from '../../utils/format';
import { computeInvoiceTotals, suggestTaxMode, TaxMode } from '../../utils/gst';
import { buildInvoiceItems, extractGstMeta, extractLineItems, extractOtherCharges } from '../../utils/invoiceItems';
import { findDuplicateInvoiceNumber, generateInvoiceNumber } from '../../utils/invoiceNumber';
import { useTheme } from '../../theme/ThemeProvider';

type Props = NativeStackScreenProps<PurchaseStackParamList, 'PurchaseEntry'>;

export function PurchaseEntryScreen({ route, navigation }: Props) {
  const theme = useTheme();
  const invoiceId = route.params?.invoiceId;
  const isEdit = !!invoiceId;
  const selectedBusiness = useBusinessStore((s) => s.selectedBusiness);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [parties, setParties] = useState<Party[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [existingInvoices, setExistingInvoices] = useState<{ id: string; invoice_no: string }[]>([]);

  const [partyId, setPartyId] = useState('');
  const [invoiceNo, setInvoiceNo] = useState('');
  const [date, setDate] = useState(todayISO());
  const [isGst, setIsGst] = useState(true);
  const [taxMode, setTaxMode] = useState<TaxMode>('intra');
  const [lineItems, setLineItems] = useState<InvoiceLineItem[]>([]);
  const [discountAmount, setDiscountAmount] = useState('0');
  const [otherCharges, setOtherCharges] = useState('0');
  const [paymentReceived, setPaymentReceived] = useState('0');
  const [invoiceNoError, setInvoiceNoError] = useState<string | null>(null);

  useEffect(() => {
    navigation.setOptions({ title: isEdit ? 'Edit Purchase' : 'New Purchase' });
  }, [isEdit, navigation]);

  useEffect(() => {
    if (!selectedBusiness) return;
    (async () => {
      try {
        const [partyList, itemList, invoiceList] = await Promise.all([
          api.party.getAll(selectedBusiness.id),
          api.item.getAll(selectedBusiness.id),
          api.invoice.getAll(selectedBusiness.id, 'purchase'),
        ]);
        setParties(partyList);
        setItems(itemList);
        setExistingInvoices(invoiceList.map((i) => ({ id: i.id, invoice_no: i.invoice_no })));

        if (invoiceId) {
          const [inv] = await api.invoice.getById(invoiceId);
          if (inv) {
            setPartyId(inv.party_id ?? partyList.find((p) => p.name === inv.party_name)?.id ?? '');
            setInvoiceNo(inv.invoice_no);
            setDate(inv.date);
            const meta = extractGstMeta(inv.items);
            setIsGst(meta.isGst);
            setTaxMode(meta.gstType === 'cgst_igst' ? 'inter' : 'intra');
            setLineItems(extractLineItems(inv.items));
            setDiscountAmount(String(inv.discount_amount ?? 0));
            setOtherCharges(String(extractOtherCharges(inv.items).amount));
            setPaymentReceived(String(inv.payment_received ?? 0));
          }
        } else {
          setInvoiceNo(generateInvoiceNumber('purchase'));
        }
      } catch (e: any) {
        toast.error(e.message ?? 'Could not load purchase data');
      } finally {
        setLoading(false);
      }
    })();
  }, [selectedBusiness?.id, invoiceId]);

  const selectedParty = parties.find((p) => p.id === partyId);

  useEffect(() => {
    if (selectedParty && selectedBusiness && !isEdit) {
      setTaxMode(suggestTaxMode(selectedBusiness.state, selectedParty.state));
    }
  }, [selectedParty?.id, selectedBusiness?.id]);

  const totals = useMemo(
    () =>
      computeInvoiceTotals({
        lineItems,
        gstEnabled: isGst,
        taxMode,
        discountAmount: parseFloat(discountAmount) || 0,
        otherCharges: parseFloat(otherCharges) || 0,
        paymentReceived: parseFloat(paymentReceived) || 0,
      }),
    [lineItems, isGst, taxMode, discountAmount, otherCharges, paymentReceived],
  );

  const handleSave = async () => {
    if (!selectedBusiness) return;
    setInvoiceNoError(null);

    if (!selectedParty) {
      toast.error('Select a supplier');
      return;
    }
    if (lineItems.length === 0) {
      toast.error('Add at least one item');
      return;
    }
    if (!invoiceNo.trim()) {
      toast.error('Bill number is required');
      return;
    }
    const dup = findDuplicateInvoiceNumber(invoiceNo, existingInvoices, invoiceId);
    if (dup) {
      setInvoiceNoError(`Bill number "${invoiceNo}" already exists`);
      return;
    }

    setSaving(true);
    try {
      const itemsPayload = buildInvoiceItems({
        lineItems,
        isGst,
        gstType: taxMode === 'inter' ? 'cgst_igst' : 'cgst_sgst',
        otherCharges: totals.otherCharges,
      });

      const payload = {
        business_id: selectedBusiness.id,
        invoice_no: invoiceNo.trim(),
        date,
        party_name: selectedParty.name,
        party_id: selectedParty.id,
        gstin: selectedParty.gstin,
        state: selectedParty.state,
        address: selectedParty.address,
        items: itemsPayload,
        subtotal: totals.subtotal,
        discount_amount: totals.discountAmount,
        discount_percent: 0,
        total_tax: totals.totalTax,
        round_off: totals.roundOff,
        net_total: totals.netTotal,
        payment_received: totals.paymentReceived,
        balance_due: totals.balanceDue,
        type: 'purchase' as const,
        status: totals.balanceDue <= 0 ? ('paid' as const) : totals.paymentReceived > 0 ? ('partial' as const) : ('sent' as const),
      };

      if (isEdit && invoiceId) {
        await api.invoice.update(invoiceId, payload);
        toast.success('Purchase updated');
      } else {
        await api.invoice.create(payload);
        toast.success('Purchase saved');
      }
      navigation.goBack();
    } catch (e: any) {
      toast.error(e.message ?? 'Could not save purchase');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Screen><></></Screen>;

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <SelectField
          label="Supplier"
          required
          searchable
          placeholder="Select supplier"
          options={parties.map((p) => ({ label: p.name, value: p.id, description: p.mobile }))}
          value={partyId}
          onChange={setPartyId}
        />

        <View style={styles.row2}>
          <View style={styles.flex1}>
            <Input label="Bill No." required value={invoiceNo} onChangeText={setInvoiceNo} error={invoiceNoError ?? undefined} />
          </View>
          <View style={styles.flex1}>
            <DateField label="Date" required value={date} onChange={setDate} />
          </View>
        </View>

        <View style={[styles.gstToggleCard, { borderColor: theme.colors.border, backgroundColor: theme.colors.card }]}>
          <View style={styles.gstToggleRow}>
            <Text variant="body" weight="medium">GST Applicable</Text>
            <Switch value={isGst} onValueChange={setIsGst} trackColor={{ true: theme.colors.primary }} />
          </View>
          {isGst ? (
            <View style={styles.taxModeRow}>
              <Button label="CGST + SGST (Intra-state)" size="sm" variant={taxMode === 'intra' ? 'primary' : 'outline'} onPress={() => setTaxMode('intra')} style={styles.chip} />
              <Button label="IGST (Inter-state)" size="sm" variant={taxMode === 'inter' ? 'primary' : 'outline'} onPress={() => setTaxMode('inter')} style={styles.chip} />
            </View>
          ) : null}
        </View>

        <LineItemsEditor lineItems={lineItems} onChange={setLineItems} catalog={items} gstEnabled={isGst} />

        <View style={styles.row2}>
          <View style={styles.flex1}>
            <Input label="Discount (₹)" value={discountAmount} onChangeText={setDiscountAmount} keyboardType="decimal-pad" />
          </View>
          <View style={styles.flex1}>
            <Input label="Other Charges (₹)" value={otherCharges} onChangeText={setOtherCharges} keyboardType="decimal-pad" />
          </View>
        </View>
        <Input label="Payment Made (₹)" value={paymentReceived} onChangeText={setPaymentReceived} keyboardType="decimal-pad" />

        <InvoiceTotalsSummary totals={totals} gstEnabled={isGst} taxMode={taxMode} />

        <Button label={isEdit ? 'Save Changes' : 'Save Purchase'} onPress={handleSave} loading={saving} fullWidth style={styles.submit} />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, paddingBottom: 60 },
  row2: { flexDirection: 'row', gap: 12 },
  flex1: { flex: 1 },
  gstToggleCard: { borderWidth: 1, borderRadius: 12, padding: 14, marginBottom: 16 },
  gstToggleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  taxModeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  chip: { flexGrow: 1 },
  submit: { marginTop: 8 },
});
