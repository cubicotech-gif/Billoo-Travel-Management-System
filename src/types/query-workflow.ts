// Query Workflow Types
// Types for the 10-stage query workflow system

export type QueryStatus =
  | 'New Query - Not Responded'
  | 'Responded - Awaiting Reply'
  | 'Working on Proposal'
  | 'Proposal Sent'
  | 'Revisions Requested'
  | 'Finalized & Booking'
  | 'Services Booked'
  | 'In Delivery'
  | 'Completed'
  | 'Cancelled'

export type BookingStatus = 'pending' | 'payment_sent' | 'confirmed' | 'cancelled'
export type DeliveryStatus = 'not_started' | 'in_progress' | 'delivered' | 'issue'

export interface Query {
  id: string
  created_at: string
  updated_at: string
  query_number: string

  // Client information
  client_name: string
  client_email: string | null
  client_phone: string

  // Query details
  query_source?: string | null
  service_type?: string | null
  destination: string
  travel_date?: string | null
  return_date?: string | null
  is_tentative_dates?: boolean
  adults: number
  children: number
  infants: number

  // Additional details
  tentative_plan?: string | null
  internal_reminders?: string | null
  is_responded?: boolean
  response_given?: string | null
  status: QueryStatus
  priority_level?: string
  follow_up_date?: string | null
  notes?: string | null

  // Financials
  cost_price: number
  selling_price: number
  profit: number
  profit_margin: number

  // Stage tracking fields
  proposal_sent_date?: string
  finalized_date?: string
  completed_date?: string
  customer_feedback?: string
  stage_notes?: Record<string, any>
}

export interface QueryService {
  id: string
  query_id: string
  service_type: string
  service_description: string
  vendor_id?: string
  cost_price?: number
  selling_price?: number
  quantity?: number
  service_date?: string
  notes?: string
  created_at: string
  updated_at: string

  // Booking fields
  booking_status: BookingStatus
  booked_date?: string
  booking_confirmation?: string
  voucher_url?: string
  delivery_status: DeliveryStatus

  // Relations
  vendors?: {
    id: string
    name: string
    type: string
  }
}

export interface StageInfo {
  key: QueryStatus
  label: string
  icon: string
  step: number
  color: string
}

export const WORKFLOW_STAGES: StageInfo[] = [
  { key: 'New Query - Not Responded', label: 'New Query', icon: '🔴', step: 1, color: 'red' },
  { key: 'Responded - Awaiting Reply', label: 'Responded', icon: '🟡', step: 2, color: 'yellow' },
  { key: 'Working on Proposal', label: 'Building', icon: '🔵', step: 3, color: 'blue' },
  { key: 'Proposal Sent', label: 'Proposal', icon: '📧', step: 4, color: 'green' },
  { key: 'Revisions Requested', label: 'Revisions', icon: '🟣', step: 5, color: 'purple' },
  { key: 'Finalized & Booking', label: 'Booking', icon: '✅', step: 6, color: 'teal' },
  { key: 'Services Booked', label: 'Booked', icon: '📦', step: 7, color: 'cyan' },
  { key: 'In Delivery', label: 'Delivery', icon: '🚚', step: 8, color: 'indigo' },
  { key: 'Completed', label: 'Complete', icon: '✅', step: 9, color: 'green' },
  { key: 'Cancelled', label: 'Cancelled', icon: '❌', step: 0, color: 'gray' },
]

export interface CustomerResponseData {
  type: 'accepted' | 'revisions' | 'rejected'
  feedback: string
  timestamp: string
}

export interface BookingProgress {
  confirmed: number
  total: number
  percentage: number
}

export interface ServiceBookingUpdate {
  booking_status: BookingStatus
  booked_date?: string
  booking_confirmation?: string
  voucher_url?: string
}

export interface ServiceDeliveryUpdate {
  delivery_status: DeliveryStatus
  notes?: string
}
