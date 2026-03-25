import { supabase } from '@/lib/supabase'
import type {
  BulkUploadFile, BulkUploadResult, BulkUploadServiceRecord,
} from '@/types/finance'

// ─── Validation ────────────────────────────────────────────────

export function validateBulkUploadFile(data: any): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  if (!data || typeof data !== 'object') {
    return { valid: false, errors: ['File does not contain valid JSON'] }
  }

  // Vendor
  if (!data.vendor || typeof data.vendor !== 'object') {
    errors.push('Missing "vendor" object')
  } else {
    if (!data.vendor.name || typeof data.vendor.name !== 'string') errors.push('vendor.name is required')
    if (!Array.isArray(data.vendor.service_types)) errors.push('vendor.service_types must be an array')
  }

  // Passengers
  if (!Array.isArray(data.passengers) || data.passengers.length === 0) {
    errors.push('Missing or empty "passengers" array')
  } else {
    data.passengers.forEach((p: any, i: number) => {
      if (!p.ref) errors.push(`passengers[${i}]: missing "ref"`)
      if (!p.first_name) errors.push(`passengers[${i}]: missing "first_name"`)
      if (!p.last_name) errors.push(`passengers[${i}]: missing "last_name"`)
    })
  }

  // Service records
  if (!Array.isArray(data.service_records) || data.service_records.length === 0) {
    errors.push('Missing or empty "service_records" array')
  } else {
    data.service_records.forEach((sr: any, i: number) => {
      if (!sr.passenger_ref) errors.push(`service_records[${i}] (row ${sr.row || i}): missing "passenger_ref"`)
      if (!sr.service_description) errors.push(`service_records[${i}] (row ${sr.row || i}): missing "service_description"`)
      if (typeof sr.purchase_price_pkr !== 'number') errors.push(`service_records[${i}] (row ${sr.row || i}): purchase_price_pkr must be a number`)
      if (typeof sr.selling_price_pkr !== 'number') errors.push(`service_records[${i}] (row ${sr.row || i}): selling_price_pkr must be a number`)
    })

    // Verify all passenger_refs exist in passengers
    if (Array.isArray(data.passengers)) {
      const validRefs = new Set(data.passengers.map((p: any) => p.ref))
      data.service_records.forEach((sr: any, i: number) => {
        if (sr.passenger_ref && !validRefs.has(sr.passenger_ref)) {
          errors.push(`service_records[${i}] (row ${sr.row || i}): passenger_ref "${sr.passenger_ref}" not found in passengers array`)
        }
      })
    }
  }

  // Summary (optional but validate if present)
  if (data.summary && typeof data.summary !== 'object') {
    errors.push('"summary" must be an object if provided')
  }

  return { valid: errors.length === 0, errors }
}

// ─── Duplicate Detection ───────────────────────────────────────

export interface PreflightResult {
  vendor: { id?: string; name: string; isExisting: boolean }
  passengers: { ref: string; name: string; existingId?: string; isExisting: boolean }[]
  duplicateWarnings: string[]
}

export async function preflightCheck(data: BulkUploadFile): Promise<PreflightResult> {
  const warnings: string[] = []

  // Check vendor
  const { data: existingVendor } = await supabase
    .from('vendors')
    .select('id, name')
    .ilike('name', data.vendor.name)
    .eq('is_deleted', false)
    .limit(1)
    .single()

  // Check passengers
  const passengerChecks = await Promise.all(
    data.passengers.map(async (p) => {
      const { data: existing } = await supabase
        .from('passengers')
        .select('id, first_name, last_name')
        .ilike('first_name', p.first_name.trim())
        .ilike('last_name', p.last_name.trim())
        .limit(1)
        .single()

      return {
        ref: p.ref,
        name: `${p.first_name} ${p.last_name}`,
        existingId: existing?.id,
        isExisting: !!existing,
      }
    })
  )

  // Check for possible duplicate imports — look for invoices with same passenger + amount + vendor in notes
  for (const pax of passengerChecks) {
    if (!pax.existingId) continue

    const paxServices = data.service_records.filter(s => s.passenger_ref === pax.ref)
    const totalAmount = paxServices.reduce((s, sr) => s + sr.selling_price_pkr, 0)

    const { data: existingInvoices } = await supabase
      .from('invoices')
      .select('id, invoice_number, amount, notes')
      .eq('passenger_id', pax.existingId)
      .gte('amount', totalAmount - 1)
      .lte('amount', totalAmount + 1)

    if (existingInvoices && existingInvoices.length > 0) {
      const matchingNotes = existingInvoices.filter(inv =>
        inv.notes && inv.notes.includes(data.vendor.name)
      )
      if (matchingNotes.length > 0) {
        warnings.push(
          `Possible duplicate: ${pax.name} already has invoice ${matchingNotes[0].invoice_number} ` +
          `for ${formatPKR(totalAmount)} linked to ${data.vendor.name}`
        )
      }
    }
  }

  return {
    vendor: {
      id: existingVendor?.id,
      name: data.vendor.name,
      isExisting: !!existingVendor,
    },
    passengers: passengerChecks,
    duplicateWarnings: warnings,
  }
}

// ─── Import Processing ─────────────────────────────────────────

export type ImportStep = 'vendor' | 'passengers' | 'invoices' | 'invoice_items' | 'transactions' | 'activities' | 'done'

export interface ImportProgress {
  currentStep: ImportStep
  completedSteps: ImportStep[]
  message: string
}

export async function executeBulkImport(
  data: BulkUploadFile,
  preflight: PreflightResult,
  onProgress: (progress: ImportProgress) => void
): Promise<BulkUploadResult> {
  const import_batch_id = crypto.randomUUID()
  const warnings: string[] = []
  const errors: string[] = []

  let vendorId = ''
  let vendorIsNew = false
  const passengerMap = new Map<string, { id: string; name: string; isNew: boolean }>()
  const invoiceMap = new Map<string, { id: string; invoice_number: string; passenger_name: string; amount: number }>()
  let invoiceItemsCount = 0
  let transactionsCount = 0
  let totalImportedPKR = 0

  try {
    // ── Step 3a: Vendor ──────────────────────────────────────
    onProgress({ currentStep: 'vendor', completedSteps: [], message: 'Processing vendor...' })

    if (preflight.vendor.isExisting && preflight.vendor.id) {
      vendorId = preflight.vendor.id
      vendorIsNew = false
    } else {
      const { data: newVendor, error: vendorErr } = await supabase
        .from('vendors')
        .insert({
          name: data.vendor.name,
          type: data.vendor.service_types[0] || 'Other',
          service_types: data.vendor.service_types,
          country: data.vendor.country || null,
          is_active: data.vendor.status === 'active',
        })
        .select('id')
        .single()

      if (vendorErr) throw new Error(`Failed to create vendor: ${vendorErr.message}`)
      vendorId = newVendor.id
      vendorIsNew = true
    }

    // ── Step 3b: Passengers ──────────────────────────────────
    onProgress({ currentStep: 'passengers', completedSteps: ['vendor'], message: 'Processing passengers...' })

    for (const pax of data.passengers) {
      const existing = preflight.passengers.find(p => p.ref === pax.ref)

      if (existing?.isExisting && existing.existingId) {
        passengerMap.set(pax.ref, { id: existing.existingId, name: existing.name, isNew: false })
      } else {
        const { data: newPax, error: paxErr } = await supabase
          .from('passengers')
          .insert({
            first_name: pax.first_name.trim(),
            last_name: pax.last_name.trim(),
            phone: '',
            gender: (pax.gender === 'male' || pax.gender === 'female') ? pax.gender : null,
            country: pax.country || null,
            status: 'active' as const,
            notes: pax.pax_count && pax.pax_count > 1 ? `Pax count: ${pax.pax_count}` : null,
          })
          .select('id')
          .single()

        if (paxErr) throw new Error(`Failed to create passenger ${pax.first_name} ${pax.last_name}: ${paxErr.message}`)
        passengerMap.set(pax.ref, { id: newPax.id, name: `${pax.first_name} ${pax.last_name}`, isNew: true })
      }
    }

    // ── Step 3c: Invoices (one per passenger) ────────────────
    onProgress({ currentStep: 'invoices', completedSteps: ['vendor', 'passengers'], message: 'Creating invoices...' })

    // Group service records by passenger
    const servicesByPassenger = new Map<string, BulkUploadServiceRecord[]>()
    for (const sr of data.service_records) {
      const existing = servicesByPassenger.get(sr.passenger_ref) || []
      existing.push(sr)
      servicesByPassenger.set(sr.passenger_ref, existing)
    }

    for (const [paxRef, services] of servicesByPassenger.entries()) {
      const paxInfo = passengerMap.get(paxRef)
      if (!paxInfo) {
        warnings.push(`Skipping services for unknown passenger ref: ${paxRef}`)
        continue
      }

      const totalAmount = services.reduce((s, sr) => s + sr.selling_price_pkr, 0)
      const totalCost = services.reduce((s, sr) => s + sr.purchase_price_pkr, 0)
      const totalProfit = totalAmount - totalCost

      const { data: invoice, error: invErr } = await supabase
        .from('invoices')
        .insert({
          amount: totalAmount,
          paid_amount: 0,
          total_cost: totalCost,
          total_profit: totalProfit,
          currency: 'PKR',
          status: 'pending' as const,
          passenger_id: paxInfo.id,
          source: 'manual' as const,
          notes: `Bulk imported from ${data.vendor.name} sheet [batch: ${import_batch_id}]`,
        })
        .select('id, invoice_number')
        .single()

      if (invErr) throw new Error(`Failed to create invoice for ${paxInfo.name}: ${invErr.message}`)

      invoiceMap.set(paxRef, {
        id: invoice.id,
        invoice_number: invoice.invoice_number,
        passenger_name: paxInfo.name,
        amount: totalAmount,
      })

      totalImportedPKR += totalAmount
    }

    // ── Step 3d: Invoice Items ───────────────────────────────
    onProgress({
      currentStep: 'invoice_items',
      completedSteps: ['vendor', 'passengers', 'invoices'],
      message: 'Creating invoice items...',
    })

    for (const sr of data.service_records) {
      const invoice = invoiceMap.get(sr.passenger_ref)
      if (!invoice) continue

      const vendorPaymentStatus =
        sr.vendor_payment_amount_pkr >= sr.purchase_price_pkr && sr.purchase_price_pkr > 0
          ? 'paid'
          : sr.vendor_payment_amount_pkr > 0
          ? 'partially_paid'
          : 'unpaid'

      const itemNotes = [
        `SAR: ${sr.purchase_price_sar}→${sr.selling_price_sar}`,
        sr.conversion_rate_to_vendor ? `Rate: ${sr.conversion_rate_to_vendor}→${sr.conversion_rate_to_passenger}` : null,
        sr.exchange_rate_profit_pkr ? `ExRate Profit: ${sr.exchange_rate_profit_pkr} PKR` : null,
        sr.notes || null,
      ].filter(Boolean).join(' | ')

      const { error: itemErr } = await supabase
        .from('invoice_items')
        .insert({
          invoice_id: invoice.id,
          description: sr.service_description,
          service_type: sr.service_type,
          vendor_id: vendorId,
          quantity: 1,
          unit_price: sr.selling_price_pkr,
          tax_percentage: 0,
          total: sr.selling_price_pkr,
          purchase_price: sr.purchase_price_pkr,
          selling_price: sr.selling_price_pkr,
          profit: sr.selling_price_pkr - sr.purchase_price_pkr,
          vendor_payment_status: vendorPaymentStatus as any,
          vendor_amount_paid: sr.vendor_payment_amount_pkr,
          notes: itemNotes || null,
        })

      if (itemErr) {
        warnings.push(`Row ${sr.row}: Failed to create item "${sr.service_description}": ${itemErr.message}`)
      } else {
        invoiceItemsCount++
      }
    }

    // ── Step 3e: Vendor Payment Transactions ─────────────────
    onProgress({
      currentStep: 'transactions',
      completedSteps: ['vendor', 'passengers', 'invoices', 'invoice_items'],
      message: 'Creating transactions...',
    })

    for (const sr of data.service_records) {
      if (sr.vendor_payment_amount_pkr <= 0) continue

      const paxInfo = passengerMap.get(sr.passenger_ref)
      const invoice = invoiceMap.get(sr.passenger_ref)
      if (!paxInfo || !invoice) continue

      const paxData = data.passengers.find(p => p.ref === sr.passenger_ref)
      const paxCountNote = paxData?.pax_count && paxData.pax_count > 1 ? ` (${paxData.pax_count} pax)` : ''

      const { error: txnErr } = await supabase
        .from('transactions')
        .insert({
          type: 'payment_to_vendor' as const,
          direction: 'out' as const,
          amount: sr.vendor_payment_amount_pkr,
          currency: 'PKR',
          vendor_id: vendorId,
          passenger_id: paxInfo.id,
          invoice_id: invoice.id,
          transaction_date: sr.vendor_payment_date || new Date().toISOString().split('T')[0],
          source: 'manual' as const,
          description: `Payment to ${data.vendor.name} for ${sr.service_description} - ${paxInfo.name}${paxCountNote}`,
          notes: `Bulk import [batch: ${import_batch_id}]`,
        })

      if (txnErr) {
        warnings.push(`Row ${sr.row}: Failed to create transaction for "${sr.service_description}": ${txnErr.message}`)
      } else {
        transactionsCount++
      }
    }

    // ── Step 3f: Activity Logs ───────────────────────────────
    onProgress({
      currentStep: 'activities',
      completedSteps: ['vendor', 'passengers', 'invoices', 'invoice_items', 'transactions'],
      message: 'Logging activities...',
    })

    const activityRows: any[] = []

    // Vendor activity
    activityRows.push({
      entity_type: 'vendor',
      entity_id: vendorId,
      action: vendorIsNew ? 'created' : 'updated',
      description: `${vendorIsNew ? 'Created' : 'Linked'} via bulk import from ${data.summary?.source_sheet || 'JSON'} [batch: ${import_batch_id}]`,
    })

    // Passenger activities
    for (const [, pax] of passengerMap.entries()) {
      activityRows.push({
        entity_type: 'passenger',
        entity_id: pax.id,
        action: pax.isNew ? 'created' : 'updated',
        description: `${pax.isNew ? 'Created' : 'Linked'} via bulk import from ${data.vendor.name} [batch: ${import_batch_id}]`,
      })
    }

    // Invoice activities
    for (const [, inv] of invoiceMap.entries()) {
      activityRows.push({
        entity_type: 'invoice',
        entity_id: inv.id,
        action: 'invoice_created',
        description: `Invoice ${inv.invoice_number} created via bulk import — ${inv.passenger_name} — ${formatPKR(inv.amount)} [batch: ${import_batch_id}]`,
      })
    }

    // Insert activities in batch (ignore errors — non-critical)
    if (activityRows.length > 0) {
      await supabase.from('activities').insert(activityRows)
    }

    onProgress({
      currentStep: 'done',
      completedSteps: ['vendor', 'passengers', 'invoices', 'invoice_items', 'transactions', 'activities'],
      message: 'Import complete!',
    })

    return {
      success: true,
      vendor: { id: vendorId, name: data.vendor.name, isNew: vendorIsNew },
      passengers: Array.from(passengerMap.entries()).map(([ref, p]) => ({ ...p, ref })),
      invoices: Array.from(invoiceMap.values()),
      invoice_items_count: invoiceItemsCount,
      transactions_count: transactionsCount,
      total_imported_pkr: totalImportedPKR,
      warnings,
      errors,
      import_batch_id,
    }
  } catch (err: any) {
    return {
      success: false,
      vendor: { id: vendorId, name: data.vendor.name, isNew: vendorIsNew },
      passengers: Array.from(passengerMap.entries()).map(([ref, p]) => ({ ...p, ref })),
      invoices: Array.from(invoiceMap.values()),
      invoice_items_count: invoiceItemsCount,
      transactions_count: transactionsCount,
      total_imported_pkr: totalImportedPKR,
      warnings,
      errors: [err.message || 'Unknown error during import', ...errors],
      import_batch_id,
    }
  }
}

function formatPKR(amount: number): string {
  return `Rs ${amount.toLocaleString('en-PK')}`
}
