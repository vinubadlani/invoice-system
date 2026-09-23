import { isPast, parseISO } from 'date-fns';
import { Invoice } from '../lib/types';

export interface OutstandingRow {
  partyName: string;
  amount: number;
  invoiceCount: number;
  overdueCount: number;
}

export function computeOutstandingByParty(invoices: Invoice[], type: 'sales' | 'purchase'): OutstandingRow[] {
  const map = new Map<string, OutstandingRow>();
  for (const inv of invoices) {
    if (inv.type !== type || (inv.balance_due ?? 0) <= 0) continue;
    const row = map.get(inv.party_name) ?? { partyName: inv.party_name, amount: 0, invoiceCount: 0, overdueCount: 0 };
    row.amount += inv.balance_due;
    row.invoiceCount += 1;
    if (inv.due_date) {
      try {
        if (isPast(parseISO(inv.due_date))) row.overdueCount += 1;
      } catch {
        // ignore unparsable due dates
      }
    }
    map.set(inv.party_name, row);
  }
  return [...map.values()].sort((a, b) => b.amount - a.amount);
}

export function totalOverdue(invoices: Invoice[]): number {
  return invoices
    .filter((inv) => (inv.balance_due ?? 0) > 0 && inv.due_date && (() => {
      try { return isPast(parseISO(inv.due_date!)); } catch { return false; }
    })())
    .reduce((sum, inv) => sum + inv.balance_due, 0);
}
