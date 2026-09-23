/**
 * Party ledger — ported from app/ledger/page.tsx's computation. There is no
 * stored running-balance column; it's derived fresh each time from the
 * party's opening balance plus every invoice/payment tied to that party,
 * walked in date order. Positive balance = party owes the business (Dr),
 * negative = business owes the party (Cr).
 */
import { Invoice, LedgerEntry, Party, Payment } from '../lib/types';

export function computePartyLedger(party: Party, invoices: Invoice[], payments: Payment[]): LedgerEntry[] {
  const entries: LedgerEntry[] = [];
  let runningBalance = party.balance_type === 'To Collect' ? party.opening_balance : -party.opening_balance;

  entries.push({
    id: 'opening',
    date: party.created_at ?? '',
    voucher_type: 'Opening Balance',
    voucher_no: '—',
    particulars: 'Opening Balance',
    debit: party.balance_type === 'To Collect' ? party.opening_balance : 0,
    credit: party.balance_type === 'To Pay' ? party.opening_balance : 0,
    balance: runningBalance,
  });

  const partyInvoices = invoices.filter((inv) => inv.party_id === party.id || inv.party_name === party.name);
  const partyPayments = payments.filter((p) => p.party_name === party.name);

  type Txn =
    | { kind: 'invoice'; date: string; data: Invoice }
    | { kind: 'payment'; date: string; data: Payment };

  const txns: Txn[] = [
    ...partyInvoices.map((inv) => ({ kind: 'invoice' as const, date: inv.date, data: inv })),
    ...partyPayments.map((p) => ({ kind: 'payment' as const, date: p.date, data: p })),
  ].sort((a, b) => a.date.localeCompare(b.date));

  for (const txn of txns) {
    if (txn.kind === 'invoice') {
      const inv = txn.data;
      const isDebit = inv.type === 'sales';
      const amount = inv.net_total || 0;
      runningBalance += isDebit ? amount : -amount;
      entries.push({
        id: inv.id,
        date: inv.date,
        voucher_type: inv.type === 'sales' ? 'Sales Invoice' : 'Purchase Bill',
        voucher_no: inv.invoice_no,
        particulars: inv.type === 'sales' ? `Sales Invoice ${inv.invoice_no}` : `Purchase Bill ${inv.invoice_no}`,
        debit: isDebit ? amount : 0,
        credit: isDebit ? 0 : amount,
        balance: runningBalance,
      });
    } else {
      const pay = txn.data;
      const isCredit = pay.type === 'Received';
      const amount = pay.amount || 0;
      runningBalance += isCredit ? -amount : amount;
      entries.push({
        id: pay.id,
        date: pay.date,
        voucher_type: 'Payment',
        voucher_no: pay.invoice_no ?? '—',
        particulars: `Payment ${pay.type}${pay.remarks ? ` — ${pay.remarks}` : ''}`,
        debit: !isCredit ? amount : 0,
        credit: isCredit ? amount : 0,
        balance: runningBalance,
      });
    }
  }

  return entries;
}

export function currentBalance(entries: LedgerEntry[]): { amount: number; label: 'Dr' | 'Cr' } {
  const last = entries[entries.length - 1];
  const balance = last?.balance ?? 0;
  return { amount: Math.abs(balance), label: balance >= 0 ? 'Dr' : 'Cr' };
}

/** Sum of positive balance_due across a party's sales invoices (receivable) or
 * purchase invoices (payable) — matches app/payments/page.tsx's totals. */
export function outstandingTotals(invoices: Invoice[]) {
  const totalReceivable = invoices
    .filter((inv) => inv.type === 'sales' && (inv.balance_due || 0) > 0)
    .reduce((sum, inv) => sum + (inv.balance_due || 0), 0);
  const totalPayable = invoices
    .filter((inv) => inv.type === 'purchase' && (inv.balance_due || 0) > 0)
    .reduce((sum, inv) => sum + (inv.balance_due || 0), 0);
  return { totalReceivable, totalPayable };
}
