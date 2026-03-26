import { supabase } from '@/lib/supabase'
import { uploadFile } from '@/lib/storage'

// ─── Types ───────────────────────────────────────────────

export interface DocumentRecord {
  id: string
  entity_type: string
  entity_id: string
  document_type: string
  file_name: string
  file_url: string
  file_size: number | null
  mime_type: string | null
  expiry_date: string | null
  uploaded_by: string | null
  notes: string | null
  created_at: string
}

export interface DocumentChecklist {
  id: string
  query_id: string
  passenger_id: string
  document_type: string
  status: 'missing' | 'uploaded' | 'verified' | 'expired' | 'rejected'
  document_id: string | null
  required: boolean
  notes: string | null
  verified_by: string | null
  verified_at: string | null
  created_at: string
  updated_at: string
  // Joined document info
  documents?: DocumentRecord | null
}

export interface ChecklistPassengerInfo {
  passenger_id: string
  first_name: string
  last_name: string
  passport_expiry: string | null
  items: DocumentChecklist[]
}

export interface QueryReadinessSummary {
  total: number
  ready: number
  missing: number
  warnings: string[]
}

// ─── Document Type Labels ────────────────────────────────

export const CHECKLIST_DOCUMENT_TYPES = [
  { value: 'passport', label: 'Passport Copy', required: true },
  { value: 'passport_photo', label: 'Passport Photo', required: true },
  { value: 'cnic', label: 'CNIC Copy', required: true },
  { value: 'vaccination', label: 'Vaccination Certificate', required: true },
  { value: 'visa', label: 'Visa Copy', required: false },
  { value: 'ticket', label: 'Ticket', required: false },
  { value: 'hotel_voucher', label: 'Hotel Voucher', required: false },
  { value: 'transport_voucher', label: 'Transport Voucher', required: false },
  { value: 'insurance', label: 'Insurance', required: false },
  { value: 'other', label: 'Other', required: false },
] as const

export const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  passport: 'Passport Copy',
  passport_photo: 'Passport Photo',
  cnic: 'CNIC Copy',
  vaccination: 'Vaccination',
  visa: 'Visa Copy',
  ticket: 'Ticket',
  hotel_voucher: 'Hotel Voucher',
  transport_voucher: 'Transport Voucher',
  insurance: 'Insurance',
  voucher: 'Voucher',
  invoice: 'Invoice',
  receipt: 'Receipt',
  other: 'Other',
}

// ─── Default Checklist Items ─────────────────────────────

const DEFAULT_CHECKLIST_ITEMS = [
  { document_type: 'passport', required: true },
  { document_type: 'passport_photo', required: true },
  { document_type: 'cnic', required: true },
  { document_type: 'vaccination', required: true },
  { document_type: 'visa', required: false },
]

// ─── Document CRUD ───────────────────────────────────────

export async function uploadDocument(
  file: File,
  entityType: string,
  entityId: string,
  documentType: string,
  notes?: string,
  expiryDate?: string
): Promise<DocumentRecord> {
  // Upload to storage
  const result = await uploadFile(file, entityType, entityId)
  if (!result) throw new Error('Failed to upload file to storage')

  // Get current user
  const { data: { user } } = await supabase.auth.getUser()

  // Save metadata
  const { data, error } = await supabase
    .from('documents')
    .insert({
      entity_type: entityType,
      entity_id: entityId,
      document_type: documentType,
      file_name: file.name,
      file_url: result.path,
      file_size: file.size,
      mime_type: file.type,
      expiry_date: expiryDate || null,
      uploaded_by: user?.id || null,
      notes: notes || null,
    })
    .select()
    .single()

  if (error) throw error

  // Log activity
  await supabase.from('activities').insert({
    entity_type: 'document',
    entity_id: entityId,
    action: 'created',
    description: `Document uploaded: ${file.name} (${documentType})`,
    metadata: { document_type: documentType },
  }).then(() => {})

  // Auto-link to checklist if it's a passenger document
  if (entityType === 'passenger') {
    await autoLinkDocumentToChecklist(entityId, documentType, data.id)
  }

  // Auto-update passport_expiry on passenger if uploading passport with expiry
  if (entityType === 'passenger' && documentType === 'passport' && expiryDate) {
    await supabase
      .from('passengers')
      .update({ passport_expiry: expiryDate })
      .eq('id', entityId)
  }

  return data
}

export async function getDocumentsByEntity(
  entityType: string,
  entityId: string
): Promise<DocumentRecord[]> {
  const { data, error } = await supabase
    .from('documents')
    .select('*')
    .eq('entity_type', entityType)
    .eq('entity_id', entityId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data || []
}

export async function getDocumentsForQuery(queryId: string): Promise<{
  queryDocs: DocumentRecord[]
  passengerDocs: Record<string, DocumentRecord[]>
}> {
  // Get query-level documents
  const { data: queryDocs, error: qErr } = await supabase
    .from('documents')
    .select('*')
    .eq('entity_type', 'query')
    .eq('entity_id', queryId)
    .order('created_at', { ascending: false })

  if (qErr) throw qErr

  // Get passenger IDs linked to this query
  const { data: links, error: lErr } = await supabase
    .from('query_passengers')
    .select('passenger_id')
    .eq('query_id', queryId)

  if (lErr) throw lErr

  const passengerIds = (links || []).map(l => l.passenger_id)
  const passengerDocs: Record<string, DocumentRecord[]> = {}

  if (passengerIds.length > 0) {
    const { data: pDocs, error: pErr } = await supabase
      .from('documents')
      .select('*')
      .eq('entity_type', 'passenger')
      .in('entity_id', passengerIds)
      .order('created_at', { ascending: false })

    if (pErr) throw pErr

    for (const doc of pDocs || []) {
      if (!passengerDocs[doc.entity_id]) {
        passengerDocs[doc.entity_id] = []
      }
      passengerDocs[doc.entity_id].push(doc)
    }
  }

  return { queryDocs: queryDocs || [], passengerDocs }
}

export async function deleteDocument(id: string, filePath: string): Promise<void> {
  // Delete from storage
  const { error: storageError } = await supabase.storage
    .from('documents')
    .remove([filePath])
  if (storageError) console.error('Storage delete error:', storageError)

  // Unlink from any checklist items
  await supabase
    .from('document_checklists')
    .update({ status: 'missing', document_id: null })
    .eq('document_id', id)

  // Delete from database
  const { error } = await supabase.from('documents').delete().eq('id', id)
  if (error) throw error
}

// ─── Checklist Functions ─────────────────────────────────

export async function createDefaultChecklist(
  queryId: string,
  passengerId: string,
  _destination?: string
): Promise<DocumentChecklist[]> {
  // Check if checklist already exists for this query+passenger
  const { data: existing } = await supabase
    .from('document_checklists')
    .select('id')
    .eq('query_id', queryId)
    .eq('passenger_id', passengerId)
    .limit(1)

  if (existing && existing.length > 0) {
    // Already has checklist, return existing
    return getChecklistByPassenger(queryId, passengerId)
  }

  const items = DEFAULT_CHECKLIST_ITEMS.map(item => ({
    query_id: queryId,
    passenger_id: passengerId,
    document_type: item.document_type,
    required: item.required,
    status: 'missing',
  }))

  const { data, error } = await supabase
    .from('document_checklists')
    .insert(items)
    .select()

  if (error) throw error

  // Auto-check if passenger already has any of these documents uploaded
  await autoLinkExistingDocuments(queryId, passengerId)

  return data || []
}

export async function getChecklist(queryId: string): Promise<DocumentChecklist[]> {
  const { data, error } = await supabase
    .from('document_checklists')
    .select(`
      *,
      documents:document_id (id, file_name, file_url, expiry_date, created_at, mime_type)
    `)
    .eq('query_id', queryId)
    .order('created_at', { ascending: true })

  if (error) throw error
  return data || []
}

export async function getChecklistByPassenger(
  queryId: string,
  passengerId: string
): Promise<DocumentChecklist[]> {
  const { data, error } = await supabase
    .from('document_checklists')
    .select(`
      *,
      documents:document_id (id, file_name, file_url, expiry_date, created_at, mime_type)
    `)
    .eq('query_id', queryId)
    .eq('passenger_id', passengerId)
    .order('created_at', { ascending: true })

  if (error) throw error
  return data || []
}

export async function updateChecklistStatus(
  checklistId: string,
  status: string,
  documentId?: string
): Promise<DocumentChecklist> {
  const updates: any = { status }
  if (documentId !== undefined) {
    updates.document_id = documentId
  }

  if (status === 'verified') {
    const { data: { user } } = await supabase.auth.getUser()
    updates.verified_by = user?.id || null
    updates.verified_at = new Date().toISOString()
  }

  const { data, error } = await supabase
    .from('document_checklists')
    .update(updates)
    .eq('id', checklistId)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function getQueryReadinessSummary(queryId: string): Promise<QueryReadinessSummary> {
  const { data: checklist } = await supabase
    .from('document_checklists')
    .select('*, documents:document_id (expiry_date)')
    .eq('query_id', queryId)
    .eq('required', true)

  const items = checklist || []
  const total = items.length
  const ready = items.filter(i => i.status === 'uploaded' || i.status === 'verified').length
  const missing = items.filter(i => i.status === 'missing').length
  const warnings: string[] = []

  // Get query travel date for passport expiry check
  const { data: query } = await supabase
    .from('queries')
    .select('travel_date')
    .eq('id', queryId)
    .limit(1)

  const travelDate = query?.[0]?.travel_date ? new Date(query[0].travel_date) : null

  // Get passenger info for warnings
  const { data: passengers } = await supabase
    .from('query_passengers')
    .select('passenger_id, passengers:passenger_id (first_name, last_name, passport_expiry)')
    .eq('query_id', queryId)

  if (passengers) {
    for (const link of passengers) {
      const p = (link as any).passengers
      if (p?.passport_expiry && travelDate) {
        const expiry = new Date(p.passport_expiry)
        const sixMonthsBefore = new Date(travelDate)
        sixMonthsBefore.setMonth(sixMonthsBefore.getMonth() - 6)

        if (expiry < new Date()) {
          warnings.push(`${p.first_name} ${p.last_name}'s passport is EXPIRED`)
        } else if (expiry < sixMonthsBefore) {
          warnings.push(`${p.first_name} ${p.last_name}'s passport expires ${expiry.toLocaleDateString()} — less than 6 months before travel`)
        }
      }
    }
  }

  return { total, ready, missing, warnings }
}

export async function autoLinkDocumentToChecklist(
  passengerId: string,
  documentType: string,
  documentId: string
): Promise<void> {
  // Find any checklist items for this passenger + doc type that are 'missing'
  const { data: items } = await supabase
    .from('document_checklists')
    .select('id')
    .eq('passenger_id', passengerId)
    .eq('document_type', documentType)
    .eq('status', 'missing')

  if (items && items.length > 0) {
    for (const item of items) {
      await supabase
        .from('document_checklists')
        .update({ status: 'uploaded', document_id: documentId })
        .eq('id', item.id)
    }
  }
}

async function autoLinkExistingDocuments(
  queryId: string,
  passengerId: string
): Promise<void> {
  // Get all documents already uploaded for this passenger
  const { data: docs } = await supabase
    .from('documents')
    .select('id, document_type')
    .eq('entity_type', 'passenger')
    .eq('entity_id', passengerId)

  if (!docs || docs.length === 0) return

  // Get the checklist items for this passenger in this query
  const { data: items } = await supabase
    .from('document_checklists')
    .select('id, document_type, status')
    .eq('query_id', queryId)
    .eq('passenger_id', passengerId)
    .eq('status', 'missing')

  if (!items || items.length === 0) return

  for (const item of items) {
    const matchingDoc = docs.find(d => d.document_type === item.document_type)
    if (matchingDoc) {
      await supabase
        .from('document_checklists')
        .update({ status: 'uploaded', document_id: matchingDoc.id })
        .eq('id', item.id)
    }
  }
}

// ─── Passengers for Query ────────────────────────────────

export async function getQueryPassengersWithChecklist(queryId: string): Promise<ChecklistPassengerInfo[]> {
  // Get linked passengers
  const { data: links, error: lErr } = await supabase
    .from('query_passengers')
    .select(`
      passenger_id,
      passengers:passenger_id (id, first_name, last_name, passport_expiry)
    `)
    .eq('query_id', queryId)

  if (lErr) throw lErr
  if (!links || links.length === 0) return []

  // Get all checklist items for this query
  const { data: allItems, error: cErr } = await supabase
    .from('document_checklists')
    .select(`
      *,
      documents:document_id (id, file_name, file_url, expiry_date, created_at, mime_type)
    `)
    .eq('query_id', queryId)
    .order('created_at', { ascending: true })

  if (cErr) throw cErr

  const result: ChecklistPassengerInfo[] = []

  for (const link of links) {
    const p = (link as any).passengers
    if (!p) continue

    const items = (allItems || []).filter(i => i.passenger_id === p.id)

    result.push({
      passenger_id: p.id,
      first_name: p.first_name,
      last_name: p.last_name,
      passport_expiry: p.passport_expiry,
      items,
    })
  }

  return result
}

// ─── Add Checklist Item ──────────────────────────────────

export async function addChecklistItem(
  queryId: string,
  passengerId: string,
  documentType: string,
  required: boolean = false
): Promise<DocumentChecklist> {
  const { data, error } = await supabase
    .from('document_checklists')
    .insert({
      query_id: queryId,
      passenger_id: passengerId,
      document_type: documentType,
      required,
      status: 'missing',
    })
    .select()
    .single()

  if (error) throw error
  return data
}

// ─── Remove Checklist Item ───────────────────────────────

export async function removeChecklistItem(checklistId: string): Promise<void> {
  const { error } = await supabase
    .from('document_checklists')
    .delete()
    .eq('id', checklistId)

  if (error) throw error
}
