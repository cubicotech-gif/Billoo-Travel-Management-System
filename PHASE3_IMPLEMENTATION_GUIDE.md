# PHASE 3: Vendor Transactions & Profile Integration
## Implementation Guide

**Status:** Utilities & Components Created ✅
**Remaining:** Query Service Form Integration & Transaction Creation Logic

---

## ✅ COMPLETED Components

### 1. Currency Utilities (`src/lib/formatCurrency.ts`)
Created comprehensive currency formatting utilities:

**Functions Available:**
- `formatCurrency(amount, currency, showSymbol)` - Format single currency amounts
- `formatDualCurrency(originalAmount, originalCurrency, pkrAmount)` - Display dual currency (e.g., "3,000 SAR (Rs 223,500)")
- `formatExchangeRate(rate, fromCurrency, toCurrency)` - Format exchange rates
- `convertToPKR(amount, exchangeRate)` - Convert to PKR
- `validateExchangeRate(rate)` - Validate exchange rate input
- `formatProfit(profitAmount)` - Format profit with color indication
- `calculateProfitMargin(profit, revenue)` - Calculate profit margin %
- And more utility functions...

**Supported Currencies:**
- PKR (Pakistani Rupee)
- SAR (Saudi Riyal)
- USD (US Dollar)
- AED (UAE Dirham)
- EUR (Euro)
- GBP (British Pound)

### 2. Transaction Details Modal (`src/components/TransactionDetailsModal.tsx`)
Complete modal component for viewing transaction details:

**Features:**
- Query information with link
- Service details (description, city, booking reference, passenger)
- Financial details with dual currency display
- Exchange rate breakdown
- Payment status and details
- Additional notes
- Link to full ledger
- Mobile responsive

**Usage:**
```typescript
<TransactionDetailsModal
  transaction={selectedTransaction}
  onClose={() => setShowModal(false)}
  onViewQuery={(queryId) => navigate(`/queries/${queryId}`)}
  onViewLedger={(vendorId) => openVendorLedger(vendorId)}
/>
```

---

## 📋 TODO: Remaining Implementation

### STEP 1: Find & Update Query Service Form

**Location:** Need to locate where query services are added/edited

**Files to Check:**
- `src/pages/Queries.tsx`
- `src/pages/EnhancedQueries.tsx`
- Look for service management components

**Required Changes:**

1. **Add Currency Selection Field:**
```typescript
<div>
  <label>Transaction Currency *</label>
  <select
    value={formData.currency}
    onChange={(e) => handleCurrencyChange(e.target.value)}
    className="input"
    required
  >
    <option value="">Select Currency</option>
    {SUPPORTED_CURRENCIES.map(c => (
      <option key={c.code} value={c.code}>{c.name} ({c.code})</option>
    ))}
  </select>
</div>
```

2. **Add Exchange Rate Field (conditional):**
```typescript
{formData.currency && formData.currency !== 'PKR' && (
  <div>
    <label>Exchange Rate to PKR *</label>
    <input
      type="number"
      step="0.0001"
      min="0.0001"
      value={formData.exchange_rate}
      onChange={(e) => setFormData({...formData, exchange_rate: parseFloat(e.target.value)})}
      placeholder="e.g., 74.50 for SAR"
      required
    />
    <p className="text-xs text-gray-500 mt-1">
      {formatExchangeRate(formData.exchange_rate || 1, formData.currency)}
    </p>
  </div>
)}
```

3. **Update Amount Fields to Show Dual Currency:**
```typescript
<div>
  <label>Purchase Amount ({formData.currency}) *</label>
  <input
    type="number"
    step="0.01"
    value={formData.purchase_amount}
    onChange={(e) => handleAmountChange('purchase', parseFloat(e.target.value))}
    required
  />
  {formData.currency !== 'PKR' && (
    <p className="text-sm text-gray-600 mt-1">
      = {formatCurrency(convertToPKR(formData.purchase_amount, formData.exchange_rate), 'PKR')}
    </p>
  )}
</div>

<div>
  <label>Selling Amount ({formData.currency}) *</label>
  <input
    type="number"
    step="0.01"
    value={formData.selling_amount}
    onChange={(e) => handleAmountChange('selling', parseFloat(e.target.value))}
    required
  />
  {formData.currency !== 'PKR' && (
    <p className="text-sm text-gray-600 mt-1">
      = {formatCurrency(convertToPKR(formData.selling_amount, formData.exchange_rate), 'PKR')}
    </p>
  )}
</div>

{/* Show calculated profit */}
<div className={`p-3 rounded-lg ${
  (formData.selling_amount - formData.purchase_amount) >= 0
    ? 'bg-green-50 border border-green-200'
    : 'bg-red-50 border border-red-200'
}`}>
  <div className="flex justify-between">
    <span className="text-sm font-medium">Profit/Loss:</span>
    <span className="font-bold">
      {formatDualCurrency(
        formData.selling_amount - formData.purchase_amount,
        formData.currency,
        convertToPKR(formData.selling_amount - formData.purchase_amount, formData.exchange_rate)
      )}
    </span>
  </div>
</div>
```

4. **Add Validation:**
```typescript
const validateServiceForm = (): boolean => {
  if (!formData.currency) {
    setError('Please select transaction currency')
    return false
  }

  if (formData.currency !== 'PKR') {
    if (!formData.exchange_rate || formData.exchange_rate <= 0) {
      setError('Exchange rate is required for non-PKR currencies')
      return false
    }

    const rateError = validateExchangeRate(formData.exchange_rate)
    if (rateError) {
      setError(rateError)
      return false
    }
  }

  if (formData.selling_amount < formData.purchase_amount) {
    if (!confirm(`Warning: This will result in a loss of ${formatCurrency(Math.abs(formData.selling_amount - formData.purchase_amount), formData.currency)}. Continue?`)) {
      return false
    }
  }

  return true
}
```

### STEP 2: Create Vendor Transaction on Service Save

**Location:** In the service save/submit handler

**Implementation:**
```typescript
const handleServiceSubmit = async (serviceData: ServiceFormData) => {
  try {
    // 1. Save the service to query_services table
    const { data: service, error: serviceError } = await supabase
      .from('query_services')
      .insert({
        query_id: serviceData.query_id,
        type: serviceData.type,
        description: serviceData.description,
        vendor: serviceData.vendor_name, // Keep for legacy
        vendor_id: serviceData.vendor_id, // NEW: Add vendor_id reference
        cost_price: convertToPKR(serviceData.purchase_amount, serviceData.exchange_rate || 1),
        selling_price: convertToPKR(serviceData.selling_amount, serviceData.exchange_rate || 1),
        pnr: serviceData.pnr,
        booking_reference: serviceData.booking_reference,
        service_date: serviceData.service_date,
        notes: serviceData.notes,
      })
      .select()
      .single()

    if (serviceError) throw serviceError

    // 2. If vendor is selected, create vendor transaction
    if (serviceData.vendor_id && service) {
      // Get primary passenger for this query
      const { data: primaryPassenger } = await supabase
        .from('query_passengers')
        .select('passenger_id')
        .eq('query_id', serviceData.query_id)
        .eq('is_primary', true)
        .single()

      // Create vendor transaction
      const { error: transactionError } = await supabase
        .from('vendor_transactions')
        .insert({
          vendor_id: serviceData.vendor_id,
          query_id: serviceData.query_id,
          service_id: service.id,
          passenger_id: primaryPassenger?.passenger_id || null,
          transaction_date: serviceData.service_date || new Date().toISOString(),
          service_description: serviceData.description,
          service_type: serviceData.type,
          city: serviceData.city || null,
          currency: serviceData.currency || 'PKR',
          exchange_rate_to_pkr: serviceData.exchange_rate || 1.0,
          purchase_amount_original: serviceData.purchase_amount,
          purchase_amount_pkr: convertToPKR(serviceData.purchase_amount, serviceData.exchange_rate || 1),
          selling_amount_original: serviceData.selling_amount,
          selling_amount_pkr: convertToPKR(serviceData.selling_amount, serviceData.exchange_rate || 1),
          // profit_pkr is auto-calculated by database
          payment_status: 'PENDING',
          amount_paid: 0,
          booking_reference: serviceData.booking_reference,
          notes: serviceData.notes,
        })

      if (transactionError) {
        console.error('Error creating transaction:', transactionError)
        // Decide: Should we rollback service? Or just log the error?
        // For now, just log - transaction can be created manually later
      }
    }

    // 3. Show success message
    alert('Service added and vendor transaction created successfully')

    // 4. Reload/refresh the services list
    loadServices()

  } catch (error) {
    console.error('Error saving service:', error)
    alert('Failed to save service')
  }
}
```

### STEP 3: Update VendorProfile to Show Transactions

**Location:** `src/components/VendorProfile.tsx`

**Add after Financial Summary section (around line 197):**

```typescript
// Add to imports
import { Eye, ExternalLink, Package } from 'lucide-react'
import { format } from 'date-fns'
import { formatDualCurrency, formatProfit } from '@/lib/formatCurrency'
import TransactionDetailsModal from './TransactionDetailsModal'

// Add state
const [transactions, setTransactions] = useState<any[]>([])
const [selectedTransaction, setSelectedTransaction] = useState<any | null>(null)
const [showTransactionModal, setShowTransactionModal] = useState(false)
const [transactionsLoading, setTransactionsLoading] = useState(false)

// Add load function
const loadRecentTransactions = async () => {
  setTransactionsLoading(true)
  try {
    const { data, error } = await supabase
      .from('vendor_transactions')
      .select(`
        *,
        queries:query_id(query_number, client_name, destination),
        passengers:passenger_id(first_name, last_name)
      `)
      .eq('vendor_id', vendor.id)
      .order('transaction_date', { ascending: false })
      .limit(10)

    if (error) throw error
    setTransactions(data || [])
  } catch (error) {
    console.error('Error loading transactions:', error)
  } finally {
    setTransactionsLoading(false)
  }
}

// Call in useEffect
useEffect(() => {
  loadTransactionCount()
  loadRecentTransactions()
}, [vendor.id])

// Add JSX section after Financial Summary
{/* Recent Transactions */}
<div className="mb-6">
  <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
    <Package className="w-5 h-5 mr-2 text-purple-600" />
    Recent Transactions
    <span className="ml-2 text-sm font-normal text-gray-500">
      (Last 10)
    </span>
  </h4>

  {transactionsLoading ? (
    <div className="flex items-center justify-center py-8">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
    </div>
  ) : transactions.length === 0 ? (
    <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
      <Package className="w-12 h-12 text-gray-400 mx-auto mb-2" />
      <p className="text-gray-600">No transactions yet</p>
      <p className="text-sm text-gray-500 mt-1">
        Transactions will appear here when services are added to queries with this vendor
      </p>
    </div>
  ) : (
    <div className="space-y-3">
      {transactions.map((transaction) => {
        const profit = formatProfit(transaction.profit_pkr)
        const statusColor = transaction.payment_status === 'PAID' ? 'bg-green-100 text-green-800' :
          transaction.payment_status === 'PARTIAL' ? 'bg-yellow-100 text-yellow-800' :
          'bg-red-100 text-red-800'

        return (
          <div
            key={transaction.id}
            className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-2xl">{getServiceIcon(transaction.service_type)}</span>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">
                      {transaction.service_description}
                    </p>
                    <p className="text-xs text-gray-500">
                      {format(new Date(transaction.transaction_date), 'MMM dd, yyyy')} •{' '}
                      Query #{transaction.queries?.query_number || 'N/A'}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mt-3">
                  <div>
                    <p className="text-xs text-gray-500">Purchase</p>
                    <p className="text-sm font-medium text-gray-900">
                      {formatDualCurrency(
                        transaction.purchase_amount_original,
                        transaction.currency,
                        transaction.purchase_amount_pkr
                      )}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Selling</p>
                    <p className="text-sm font-medium text-gray-900">
                      {formatDualCurrency(
                        transaction.selling_amount_original,
                        transaction.currency,
                        transaction.selling_amount_pkr
                      )}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Profit</p>
                    <p className={`text-sm font-bold ${profit.colorClass}`}>
                      {profit.text}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Status</p>
                    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${statusColor}`}>
                      {transaction.payment_status}
                    </span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => {
                  setSelectedTransaction(transaction)
                  setShowTransactionModal(true)
                }}
                className="ml-4 p-2 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded transition-colors"
                title="View Details"
              >
                <Eye className="w-5 h-5" />
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )}
</div>

{/* Transaction Details Modal */}
{showTransactionModal && selectedTransaction && (
  <TransactionDetailsModal
    transaction={selectedTransaction}
    onClose={() => {
      setShowTransactionModal(false)
      setSelectedTransaction(null)
    }}
    onViewQuery={(queryId) => {
      // Navigate to query page or open query modal
      console.log('View query:', queryId)
    }}
    onViewLedger={(vendorId) => {
      // Open full ledger view
      console.log('View ledger:', vendorId)
    }}
  />
)}
```

**Helper function to add:**
```typescript
const getServiceIcon = (type: string) => {
  const icons: { [key: string]: string } = {
    'Hotel': '🏨',
    'Flight': '✈️',
    'Airline': '✈️',
    'Transport': '🚗',
    'Visa': '📄',
    'Tour': '🎫',
    'Insurance': '🛡️'
  }
  return icons[type] || '📦'
}
```

### STEP 4: Update Database Types

**Location:** `src/types/database.ts`

Ensure the `query_services` table type includes:
```typescript
query_services: {
  Row: {
    // ... existing fields
    vendor_id: string | null  // ADD THIS
    // ...
  }
  Insert: {
    // ... existing fields
    vendor_id?: string | null  // ADD THIS
    // ...
  }
}
```

### STEP 5: Display Vendor Info in Query Service Cards

When displaying services in queries, update the service card to show:

```typescript
<div className="service-card">
  {/* ... existing content ... */}

  {service.vendor_id && (
    <div className="mt-3 p-3 bg-purple-50 border border-purple-200 rounded">
      <p className="text-xs text-purple-800 font-medium mb-1">Vendor Details:</p>
      <div className="space-y-1 text-xs">
        <div className="flex justify-between">
          <span className="text-gray-600">Currency:</span>
          <span className="font-medium">{service.currency} (1 {service.currency} = {service.exchange_rate_to_pkr} PKR)</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Purchase:</span>
          <span className="font-medium">
            {formatDualCurrency(service.purchase_amount_original, service.currency, service.purchase_amount_pkr)}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Selling:</span>
          <span className="font-medium">
            {formatDualCurrency(service.selling_amount_original, service.currency, service.selling_amount_pkr)}
          </span>
        </div>
        <div className="flex justify-between border-t border-purple-300 pt-1 mt-1">
          <span className="text-gray-600">Profit:</span>
          <span className={`font-bold ${formatProfit(service.profit_pkr).colorClass}`}>
            {formatProfit(service.profit_pkr).text}
          </span>
        </div>
      </div>
      <button
        onClick={() => openVendorProfile(service.vendor_id)}
        className="mt-2 w-full btn btn-secondary btn-sm"
      >
        <Building2 className="w-4 h-4 mr-1" />
        View Vendor Profile
      </button>
    </div>
  )}
</div>
```

---

## 🧪 Testing Checklist

After implementation, test the following:

### Service Creation Tests
- [ ] Can select currency from dropdown
- [ ] Exchange rate field shows for non-PKR currencies
- [ ] Exchange rate field hidden for PKR
- [ ] PKR amounts auto-calculate when rate or amounts change
- [ ] Validation prevents submission without currency
- [ ] Validation prevents submission without exchange rate (for non-PKR)
- [ ] Validation catches invalid exchange rates
- [ ] Warning shows for negative profit
- [ ] Service and transaction both created successfully
- [ ] Transaction shows correct primary passenger

### Display Tests
- [ ] VendorProfile shows recent transactions
- [ ] Transaction amounts display in dual currency
- [ ] Exchange rate shown correctly
- [ ] Profit/loss shows with correct color
- [ ] Payment status badge displays correctly
- [ ] Click "View Details" opens TransactionDetailsModal
- [ ] Modal shows all transaction information
- [ ] Modal currency formatting is correct
- [ ] Empty state shows when no transactions

### Integration Tests
- [ ] Vendor total_business updates when transaction created
- [ ] Vendor total_profit updates correctly
- [ ] Transaction count shows correctly in VendorProfile
- [ ] Query service cards show vendor info
- [ ] Can navigate from transaction to query
- [ ] Can navigate from service to vendor profile

### Edge Cases
- [ ] Handles missing passenger gracefully
- [ ] Handles services without vendor (legacy)
- [ ] Handles transactions in PKR correctly
- [ ] Handles very large amounts
- [ ] Handles very small exchange rates (< 1)
- [ ] Mobile responsive on all screens

---

## 📝 Summary

**Phase 3 Status:**

✅ **Completed:**
1. Currency utility functions (`formatCurrency.ts`)
2. Transaction details modal component
3. Implementation guide & documentation

⏳ **Remaining:**
1. Locate and update query service form
2. Add currency & exchange rate fields
3. Implement transaction creation logic
4. Update VendorProfile with transactions display
5. Update database types if needed
6. Test all functionality

**Estimated Time:** 2-3 hours for remaining work

**Dependencies:**
- Need to locate service management component
- May need to update database schema (add vendor_id to query_services)
- Requires running migration to apply database changes

**Next Steps:**
1. Run Phase 1 database migration if not done
2. Locate service form component
3. Implement Steps 1-5 above
4. Run tests from checklist
5. Commit and deploy

---

## 🔗 Related Files

- `src/lib/formatCurrency.ts` - Currency utilities ✅
- `src/components/TransactionDetailsModal.tsx` - Modal component ✅
- `src/components/VendorProfile.tsx` - To be updated
- `src/pages/EnhancedQueries.tsx` - Check for service form
- `src/types/database.ts` - Update types
- `database/migrations/001_vendor_management_system.sql` - Database structure

---

**Created:** January 28, 2026
**Author:** Claude Assistant
**Session:** claude/setup-vendor-db-tables-Z643l
