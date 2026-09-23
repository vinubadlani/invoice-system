import { Item } from '../lib/types';

/**
 * The schema only stores `opening_stock` — there is no stock-movement ledger
 * tracking sales/purchases against it, so "current stock" here is exactly
 * that opening figure (same limitation the web app has). Do not invent a
 * running-stock calculation without a real movements table to back it.
 */
export const LOW_STOCK_THRESHOLD = 10;

export function stockStatus(item: Item): 'out' | 'low' | 'ok' {
  if (item.opening_stock <= 0) return 'out';
  if (item.opening_stock <= LOW_STOCK_THRESHOLD) return 'low';
  return 'ok';
}

export interface InventorySummary {
  totalItems: number;
  lowStockCount: number;
  outOfStockCount: number;
  /** Stock valued at purchase (cost) price — standard cost-basis valuation. */
  stockValue: number;
}

export function summarizeInventory(items: Item[]): InventorySummary {
  let lowStockCount = 0;
  let outOfStockCount = 0;
  let stockValue = 0;

  for (const item of items) {
    const status = stockStatus(item);
    if (status === 'out') outOfStockCount += 1;
    else if (status === 'low') lowStockCount += 1;
    stockValue += Math.max(item.opening_stock, 0) * item.purchase_price;
  }

  return { totalItems: items.length, lowStockCount, outOfStockCount, stockValue };
}
