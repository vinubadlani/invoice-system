import { InvoiceType } from '../lib/types';

export type AuthStackParamList = {
  Onboarding: undefined;
  Login: undefined;
  Signup: undefined;
  ForgotPassword: undefined;
  VerifyEmail: { email?: string } | undefined;
};

export type BusinessStackParamList = {
  BusinessSelector: undefined;
  BusinessForm: { businessId?: string } | undefined;
};

export type DashboardStackParamList = {
  DashboardHome: undefined;
};

export type SalesStackParamList = {
  SalesList: undefined;
  SalesEntry: { invoiceId?: string } | undefined;
  SalesDetail: { invoiceId: string };
  SalesAnalytics: undefined;
};

export type PurchaseStackParamList = {
  PurchaseList: undefined;
  PurchaseEntry: { invoiceId?: string } | undefined;
  PurchaseDetail: { invoiceId: string };
  PurchaseAnalytics: undefined;
};

export type PartyStackParamList = {
  PartyList: undefined;
  PartyForm: { partyId?: string } | undefined;
  PartyDetail: { partyId: string };
};

export type ItemStackParamList = {
  InventoryHome: undefined;
  ItemList: undefined;
  ItemForm: { itemId?: string } | undefined;
};

export type PaymentStackParamList = {
  PaymentList: undefined;
  PaymentForm: { paymentId?: string; invoiceType?: InvoiceType } | undefined;
};

export type BankStackParamList = {
  BankAccountList: undefined;
  BankAccountForm: { accountId?: string } | undefined;
  BankTransactionList: { accountId: string };
  BankTransactionForm: { accountId: string };
};

export type ExpenseStackParamList = {
  ExpenseList: undefined;
  ExpenseForm: { expenseId?: string } | undefined;
  ExpenseAnalytics: undefined;
};

export type LedgerStackParamList = {
  LedgerHome: undefined;
  PartyLedger: { partyId: string };
};

export type ReportStackParamList = {
  ReportsHome: undefined;
  SalesReport: undefined;
  PurchaseReport: undefined;
  ExpenseReport: undefined;
  GstReport: undefined;
  OutstandingReport: undefined;
};

export type SettingsStackParamList = {
  SettingsHome: undefined;
  BusinessProfile: undefined;
  InvoiceTemplateSettings: undefined;
};

export type MoreStackParamList = {
  MoreHome: undefined;
  PurchaseStack: undefined;
  PaymentsStack: undefined;
  BankStack: undefined;
  ExpensesStack: undefined;
  LedgerStack: undefined;
  ReportsStack: undefined;
  SettingsStack: undefined;
};

export type MainTabParamList = {
  DashboardTab: undefined;
  SalesTab: undefined;
  ItemTab: undefined;
  PartyTab: undefined;
  MoreTab: undefined;
};
