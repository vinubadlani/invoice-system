import { endOfMonth, format, isWithinInterval, parseISO, startOfMonth, subMonths } from 'date-fns';
import { Expense, Invoice } from '../lib/types';
import { extractLineItems } from './invoiceItems';

export type DateRangePreset = 'today' | 'week' | 'month' | 'prevMonth' | 'fy' | 'custom';

export function resolveDateRange(preset: DateRangePreset, custom?: { start: string; end: string }): { start: Date; end: Date } {
  const now = new Date();
  switch (preset) {
    case 'today':
      return { start: new Date(now.setHours(0, 0, 0, 0)), end: new Date() };
    case 'week': {
      const start = new Date();
      start.setDate(start.getDate() - 7);
      return { start, end: new Date() };
    }
    case 'month':
      return { start: startOfMonth(now), end: endOfMonth(now) };
    case 'prevMonth': {
      const prev = subMonths(now, 1);
      return { start: startOfMonth(prev), end: endOfMonth(prev) };
    }
    case 'fy': {
      const year = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
      return { start: new Date(year, 3, 1), end: new Date(year + 1, 2, 31) };
    }
    case 'custom':
      return { start: parseISO(custom!.start), end: parseISO(custom!.end) };
  }
}

export function filterInvoicesByRange(invoices: Invoice[], range: { start: Date; end: Date }): Invoice[] {
  return invoices.filter((inv) => {
    try {
      return isWithinInterval(parseISO(inv.date), { start: range.start, end: range.end });
    } catch {
      return false;
    }
  });
}

export interface SalesSummary {
  totalSales: number;
  invoiceCount: number;
  averageInvoiceValue: number;
  paidCount: number;
  partialCount: number;
  unpaidCount: number;
  outstanding: number;
}

export function computeSalesSummary(invoices: Invoice[]): SalesSummary {
  const totalSales = invoices.reduce((s, i) => s + i.net_total, 0);
  const paidCount = invoices.filter((i) => i.status === 'paid').length;
  const partialCount = invoices.filter((i) => i.status === 'partial').length;
  const unpaidCount = invoices.filter((i) => i.status === 'sent' || i.status === 'overdue' || i.status === 'draft').length;
  const outstanding = invoices.reduce((s, i) => s + (i.balance_due > 0 ? i.balance_due : 0), 0);

  return {
    totalSales,
    invoiceCount: invoices.length,
    averageInvoiceValue: invoices.length ? totalSales / invoices.length : 0,
    paidCount,
    partialCount,
    unpaidCount,
    outstanding,
  };
}

export interface MonthlyPoint {
  label: string;
  value: number;
}

/** Trailing N months of net_total, oldest to newest — real data only. */
export function monthlyTrend(invoices: Invoice[], months = 6): MonthlyPoint[] {
  const now = new Date();
  const buckets: MonthlyPoint[] = [];
  for (let i = months - 1; i >= 0; i -= 1) {
    const monthDate = subMonths(now, i);
    const key = format(monthDate, 'yyyy-MM');
    const label = format(monthDate, 'MMM');
    const value = invoices
      .filter((inv) => {
        try {
          return format(parseISO(inv.date), 'yyyy-MM') === key;
        } catch {
          return false;
        }
      })
      .reduce((s, inv) => s + inv.net_total, 0);
    buckets.push({ label, value });
  }
  return buckets;
}

/** Trailing 7 days of net_total, oldest to newest — used for the dashboard sparkline. */
export function dailyTrend(invoices: Invoice[], days = 7): MonthlyPoint[] {
  const points: MonthlyPoint[] = [];
  for (let i = days - 1; i >= 0; i -= 1) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = format(d, 'yyyy-MM-dd');
    const value = invoices.filter((inv) => inv.date === key).reduce((s, inv) => s + inv.net_total, 0);
    points.push({ label: format(d, 'EEE'), value });
  }
  return points;
}

/** This week (last 7 days) vs the 7 days before that. */
export function weekOverWeek(invoices: Invoice[]): { current: number; previous: number; deltaPercent: number } {
  const now = new Date();
  const weekAgo = new Date();
  weekAgo.setDate(now.getDate() - 7);
  const twoWeeksAgo = new Date();
  twoWeeksAgo.setDate(now.getDate() - 14);

  const current = filterInvoicesByRange(invoices, { start: weekAgo, end: now }).reduce((s, i) => s + i.net_total, 0);
  const previous = filterInvoicesByRange(invoices, { start: twoWeeksAgo, end: weekAgo }).reduce((s, i) => s + i.net_total, 0);
  const deltaPercent = previous > 0 ? ((current - previous) / previous) * 100 : current > 0 ? 100 : 0;

  return { current, previous, deltaPercent };
}

export function monthOverMonth(invoices: Invoice[]): { current: number; previous: number; deltaPercent: number } {
  const now = new Date();
  const currentRange = { start: startOfMonth(now), end: endOfMonth(now) };
  const prevMonth = subMonths(now, 1);
  const prevRange = { start: startOfMonth(prevMonth), end: endOfMonth(prevMonth) };

  const current = filterInvoicesByRange(invoices, currentRange).reduce((s, i) => s + i.net_total, 0);
  const previous = filterInvoicesByRange(invoices, prevRange).reduce((s, i) => s + i.net_total, 0);
  const deltaPercent = previous > 0 ? ((current - previous) / previous) * 100 : current > 0 ? 100 : 0;

  return { current, previous, deltaPercent };
}

export interface RankedEntry {
  name: string;
  value: number;
  count: number;
}

export function topCustomers(invoices: Invoice[], limit = 5): RankedEntry[] {
  const map = new Map<string, RankedEntry>();
  for (const inv of invoices) {
    const entry = map.get(inv.party_name) ?? { name: inv.party_name, value: 0, count: 0 };
    entry.value += inv.net_total;
    entry.count += 1;
    map.set(inv.party_name, entry);
  }
  return [...map.values()].sort((a, b) => b.value - a.value).slice(0, limit);
}

export function topProducts(invoices: Invoice[], limit = 5): RankedEntry[] {
  const map = new Map<string, RankedEntry>();
  for (const inv of invoices) {
    for (const li of extractLineItems(inv.items)) {
      const entry = map.get(li.item_name) ?? { name: li.item_name, value: 0, count: 0 };
      entry.value += li.total_amount;
      entry.count += li.quantity;
      map.set(li.item_name, entry);
    }
  }
  return [...map.values()].sort((a, b) => b.value - a.value).slice(0, limit);
}

export function paymentCollection(invoices: Invoice[]): { collected: number; pending: number } {
  const collected = invoices.reduce((s, i) => s + i.payment_received, 0);
  const pending = invoices.reduce((s, i) => s + (i.balance_due > 0 ? i.balance_due : 0), 0);
  return { collected, pending };
}

export function filterExpensesByRange(expenses: Expense[], range: { start: Date; end: Date }): Expense[] {
  return expenses.filter((e) => {
    try {
      return isWithinInterval(parseISO(e.date), { start: range.start, end: range.end });
    } catch {
      return false;
    }
  });
}

export function expenseMonthlyTrend(expenses: Expense[], months = 6): MonthlyPoint[] {
  const now = new Date();
  const buckets: MonthlyPoint[] = [];
  for (let i = months - 1; i >= 0; i -= 1) {
    const monthDate = subMonths(now, i);
    const key = format(monthDate, 'yyyy-MM');
    const label = format(monthDate, 'MMM');
    const value = expenses
      .filter((e) => {
        try {
          return format(parseISO(e.date), 'yyyy-MM') === key;
        } catch {
          return false;
        }
      })
      .reduce((s, e) => s + e.amount, 0);
    buckets.push({ label, value });
  }
  return buckets;
}

export function expenseMonthOverMonth(expenses: Expense[]): { current: number; previous: number; deltaPercent: number } {
  const now = new Date();
  const currentRange = { start: startOfMonth(now), end: endOfMonth(now) };
  const prevMonth = subMonths(now, 1);
  const prevRange = { start: startOfMonth(prevMonth), end: endOfMonth(prevMonth) };

  const current = filterExpensesByRange(expenses, currentRange).reduce((s, e) => s + e.amount, 0);
  const previous = filterExpensesByRange(expenses, prevRange).reduce((s, e) => s + e.amount, 0);
  const deltaPercent = previous > 0 ? ((current - previous) / previous) * 100 : current > 0 ? 100 : 0;

  return { current, previous, deltaPercent };
}

export function topExpenseCategories(expenses: Expense[], limit = 8): RankedEntry[] {
  const map = new Map<string, RankedEntry>();
  for (const e of expenses) {
    const entry = map.get(e.category) ?? { name: e.category, value: 0, count: 0 };
    entry.value += e.amount;
    entry.count += 1;
    map.set(e.category, entry);
  }
  return [...map.values()].sort((a, b) => b.value - a.value).slice(0, limit);
}
