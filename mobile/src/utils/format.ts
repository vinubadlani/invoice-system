import { format, parseISO } from 'date-fns';

const inr = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 2,
  minimumFractionDigits: 2,
});

const inrNoDecimals = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});

export function formatCurrency(amount: number | null | undefined, decimals = true): string {
  const n = amount ?? 0;
  return decimals ? inr.format(n) : inrNoDecimals.format(n);
}

/** Compact form for stat tiles: 1.2L, 3.4Cr — Indian numbering, matches the web app's reports. */
export function formatCurrencyCompact(amount: number | null | undefined): string {
  const n = amount ?? 0;
  const abs = Math.abs(n);
  const sign = n < 0 ? '-' : '';
  if (abs >= 1_00_00_000) return `${sign}₹${(abs / 1_00_00_000).toFixed(2)}Cr`;
  if (abs >= 1_00_000) return `${sign}₹${(abs / 1_00_000).toFixed(2)}L`;
  if (abs >= 1_000) return `${sign}₹${(abs / 1_000).toFixed(1)}K`;
  return `${sign}₹${abs.toFixed(0)}`;
}

export function formatDate(dateStr: string | null | undefined, pattern = 'dd MMM yyyy'): string {
  if (!dateStr) return '—';
  try {
    return format(parseISO(dateStr), pattern);
  } catch {
    return dateStr;
  }
}

export function formatDateShort(dateStr: string | null | undefined): string {
  return formatDate(dateStr, 'dd MMM');
}

export function todayISO(): string {
  return format(new Date(), 'yyyy-MM-dd');
}

export function formatPercent(n: number | null | undefined): string {
  return `${(n ?? 0).toFixed(1)}%`;
}
