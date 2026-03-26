// Financial module type definitions

export type TransactionType =
  | 'payment_received'
  | 'payment_to_vendor'
  | 'refund_to_client'
  | 'refund_from_vendor'
  | 'expense'
  | 'adjustment'

export type TransactionDirection = 'in' | 'out'

export type PaymentMethod = 'cash' | 'bank_transfer' | 'cheque' | 'online' | 'other'

export type InvoiceStatus = 'draft' | 'sent' | 'pending' | 'partial' | 'paid' | 'overdue' | 'cancelled'

export type VendorPaymentStatus = 'unpaid' | 'partially_paid' | 'paid'

export type CurrencyCode = 'PKR' | 'SAR' | 'USD' | 'AED' | 'EUR' | 'GBP'

export type PaymentMode = 'collective' | 'specific'

export const ALL_CURRENCIES: CurrencyCode[] = ['PKR', 'SAR', 'USD', 'AED', 'EUR', 'GBP']

// ─── Transaction ───────────────────────────────────────────────

export interface Transaction {
  id: string
  transaction_number: string
  transaction_date: string
  type: TransactionType
  direction: TransactionDirection
  amount: number
  currency: string
  payment_method: PaymentMethod | null
  reference_number: string | null
  passenger_id: string | null
  vendor_id: string | null
  invoice_id: string | null
  source: 'manual' | 'auto'
  source_reference_id: string | null
  source_reference_type: string | null
  description: string | null
  receipt_url: string | null
  notes: string | null
  // ROE (Rate of Exchange) fields
  original_amount: number | null
  original_currency: CurrencyCode | null
  exchange_rate: number | null
  // Payment mode (collective vs specific for vendor payments)
  payment_mode: PaymentMode | null
  created_at: string
  updated_at: string
  // Joined relations (Supabase FK joins return single objects)
  passengers?: { first_name: string; last_name: string } | null
  vendors?: { name: string } | null
  invoices?: { invoice_number: string } | null
}

export interface TransactionInsert {
  type: TransactionType
  direction: TransactionDirection
  amount: number
  currency?: string
  payment_method?: PaymentMethod | null
  reference_number?: string | null
  passenger_id?: string | null
  vendor_id?: string | null
  invoice_id?: string | null
  transaction_date?: string
  description?: string | null
  receipt_url?: string | null
  notes?: string | null
  // ROE fields
  original_amount?: number | null
  original_currency?: CurrencyCode | null
  exchange_rate?: number | null
  // Payment mode
  payment_mode?: PaymentMode | null
  // Source reference
  source_reference_id?: string | null
  source_reference_type?: string | null
}

export interface TransactionFilters {
  search?: string
  type?: TransactionType | ''
  direction?: TransactionDirection | ''
  dateFrom?: string
  dateTo?: string
  passengerId?: string
  vendorId?: string
}

// ─── Invoice ───────────────────────────────────────────────────

export interface Invoice {
  id: string
  invoice_number: string
  query_id: string | null
  passenger_id: string | null
  amount: number
  paid_amount: number
  total_cost: number
  total_profit: number
  currency: string
  status: InvoiceStatus
  due_date: string | null
  source: 'manual' | 'auto'
  source_reference_id: string | null
  source_reference_type: string | null
  notes: string | null
  // ROE fields
  original_currency: string | null
  exchange_rate: number | null
  original_amount: number | null
  created_at: string
  updated_at: string
  // Joined relations
  queries?: { query_number: string; client_name: string } | null
  passengers?: { first_name: string; last_name: string } | null
  items?: InvoiceItem[]
}

export interface InvoiceInsert {
  amount: number
  paid_amount?: number
  total_cost?: number
  total_profit?: number
  currency?: string
  status?: InvoiceStatus
  due_date?: string | null
  passenger_id?: string | null
  query_id?: string | null
  notes?: string | null
  // ROE fields
  original_currency?: string | null
  exchange_rate?: number | null
  original_amount?: number | null
}

export interface InvoiceItem {
  id: string
  invoice_id: string
  service_id: string | null
  description: string
  quantity: number
  unit_price: number
  tax_percentage: number
  total: number
  service_type: string | null
  vendor_id: string | null
  purchase_price: number
  selling_price: number
  profit: number
  vendor_payment_status: VendorPaymentStatus
  vendor_amount_paid: number
  notes: string | null
  // ROE fields
  original_currency: string | null
  exchange_rate: number | null
  purchase_price_original: number | null
  selling_price_original: number | null
  created_at: string
  // Joined
  vendors?: { name: string } | null
}

export interface InvoiceItemInput {
  description: string
  quantity: number
  unit_price: number
  tax_percentage: number
  service_type: string | null
  vendor_id: string | null
  purchase_price: number
  selling_price: number
  notes?: string | null
  // ROE fields — purchase_price/selling_price/unit_price are ALWAYS PKR
  original_currency?: string | null
  exchange_rate?: number | null
  purchase_price_original?: number | null
  selling_price_original?: number | null
}

// ─── Financial Summary ─────────────────────────────────────────

export interface FinancialSummary {
  totalRevenue: number
  totalReceived: number
  totalPending: number
  totalProfit: number
  totalVendorPayable: number
  totalVendorPaid: number
  totalVendorPending: number
  overdueInvoices: number
}

export interface MonthlyRevenue {
  month: string
  revenue: number
  received: number
  profit: number
}

// ─── Reports ───────────────────────────────────────────────────

export interface ProfitLossReport {
  totalRevenue: number
  totalCost: number
  grossProfit: number
  expenses: number
  netProfit: number
  profitMargin: number
}

export interface ReceivablesReport {
  totalBilled: number
  totalReceived: number
  totalOutstanding: number
  overdueAmount: number
  agingBuckets: AgingBucket[]
}

export interface PayablesReport {
  totalPayable: number
  totalPaid: number
  totalOutstanding: number
  vendorBreakdown: VendorPayableBreakdown[]
}

export interface AgingBucket {
  label: string
  amount: number
  count: number
}

export interface VendorPayableBreakdown {
  vendorId: string
  vendorName: string
  totalBusiness: number
  totalPaid: number
  outstanding: number
}

export interface TransactionSummary {
  totalIn: number
  totalOut: number
  netBalance: number
  byType: { type: TransactionType; label: string; amount: number; count: number }[]
  byMethod: { method: string; label: string; amount: number; count: number }[]
}

// ─── Shared ────────────────────────────────────────────────────

export interface PassengerOption {
  id: string
  first_name: string
  last_name: string
}

export interface VendorOption {
  id: string
  name: string
  service_types?: string[]
}

export interface InvoiceOption {
  id: string
  invoice_number: string
  amount: number
  paid_amount: number
}

export interface Activity {
  id: string
  entity_type: string
  entity_id: string
  action: string
  description: string | null
  metadata: any
  created_by: string | null
  created_at: string
}

// ─── Constants ─────────────────────────────────────────────────

export const TRANSACTION_TYPE_CONFIG: Record<TransactionType, { label: string; direction: TransactionDirection; color: string }> = {
  payment_received: { label: 'Payment Received', direction: 'in', color: 'bg-green-100 text-green-800' },
  payment_to_vendor: { label: 'Payment to Vendor', direction: 'out', color: 'bg-red-100 text-red-800' },
  refund_to_client: { label: 'Refund to Client', direction: 'out', color: 'bg-orange-100 text-orange-800' },
  refund_from_vendor: { label: 'Refund from Vendor', direction: 'in', color: 'bg-blue-100 text-blue-800' },
  expense: { label: 'Business Expense', direction: 'out', color: 'bg-gray-100 text-gray-800' },
  adjustment: { label: 'Manual Adjustment', direction: 'in', color: 'bg-purple-100 text-purple-800' },
}

export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  cash: 'Cash',
  bank_transfer: 'Bank Transfer',
  cheque: 'Cheque',
  online: 'Online Payment',
  other: 'Other',
}

export const INVOICE_STATUS_COLORS: Record<InvoiceStatus, string> = {
  draft: 'bg-gray-100 text-gray-800',
  sent: 'bg-blue-100 text-blue-800',
  pending: 'bg-yellow-100 text-yellow-800',
  partial: 'bg-orange-100 text-orange-800',
  paid: 'bg-green-100 text-green-800',
  overdue: 'bg-red-100 text-red-800',
  cancelled: 'bg-gray-100 text-gray-500',
}

export const ALL_INVOICE_STATUSES: InvoiceStatus[] = ['draft', 'sent', 'pending', 'partial', 'paid', 'overdue', 'cancelled']

export const SERVICE_TYPES = [
  'Flight', 'Hotel', 'Visa', 'Transport', 'Insurance',
  'Tour Package', 'Umrah', 'Hajj', 'Other',
] as const

// ─── Bulk Upload ───────────────────────────────────────────────

export interface BulkUploadVendor {
  name: string
  service_types: string[]
  country?: string
  status: string
}

export interface BulkUploadPassenger {
  ref: string
  first_name: string
  last_name: string
  pax_count?: number
  gender?: string
  country?: string
  status: string
}

export interface BulkUploadServiceRecord {
  row: number
  passenger_ref: string
  vendor: string
  service_type: string
  service_description: string
  purchase_price_sar: number
  selling_price_sar: number
  profit_sar: number
  conversion_rate_to_vendor: number | null
  conversion_rate_to_passenger: number | null
  purchase_price_pkr: number
  selling_price_pkr: number
  exchange_rate_profit_pkr: number
  vendor_payment_amount_pkr: number
  vendor_payment_date: string
  notes?: string
}

export interface BulkUploadSummary {
  total_vendor_payments_pkr: number
  total_purchase_cost_sar: number
  total_selling_price_sar: number
  total_service_profit_sar: number
  total_exchange_rate_profit_pkr: number
  unique_passengers: number
  total_service_rows: number
  source_sheet: string
}

export interface BulkUploadFile {
  vendor: BulkUploadVendor
  passengers: BulkUploadPassenger[]
  service_records: BulkUploadServiceRecord[]
  summary: BulkUploadSummary
}

export interface BulkUploadResult {
  success: boolean
  vendor: { id: string; name: string; isNew: boolean }
  passengers: { id: string; name: string; isNew: boolean; ref: string }[]
  invoices: { id: string; invoice_number: string; passenger_name: string; amount: number }[]
  invoice_items_count: number
  transactions_count: number
  total_imported_pkr: number
  warnings: string[]
  errors: string[]
  import_batch_id: string
}
