// ═══════════════════════════════════════════════
// QUERY MODULE — TYPE DEFINITIONS
// ═══════════════════════════════════════════════

export type QueryStage =
  | 'new_inquiry'
  | 'building_package'
  | 'quote_sent'
  | 'negotiating'
  | 'confirmed_paying'
  | 'booking_docs'
  | 'ready_to_travel'
  | 'completed'
  | 'cancelled';

export const STAGE_CONFIG: Record<QueryStage, {
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
  description: string;
  order: number;
}> = {
  new_inquiry:      { label: 'New Inquiry',        color: 'text-blue-700',    bgColor: 'bg-blue-50',    borderColor: 'border-blue-200',    description: 'Client just contacted',             order: 1 },
  building_package: { label: 'Building Package',   color: 'text-amber-700',   bgColor: 'bg-amber-50',   borderColor: 'border-amber-200',   description: 'Finding services, building quote',  order: 2 },
  quote_sent:       { label: 'Quote Sent',         color: 'text-purple-700',  bgColor: 'bg-purple-50',  borderColor: 'border-purple-200',  description: 'Waiting for client response',       order: 3 },
  negotiating:      { label: 'Negotiating',        color: 'text-orange-700',  bgColor: 'bg-orange-50',  borderColor: 'border-orange-200',  description: 'Client wants changes',              order: 4 },
  confirmed_paying: { label: 'Confirmed & Paying', color: 'text-green-700',   bgColor: 'bg-green-50',   borderColor: 'border-green-200',   description: 'Client said YES, collecting payment', order: 5 },
  booking_docs:     { label: 'Booking & Docs',     color: 'text-indigo-700',  bgColor: 'bg-indigo-50',  borderColor: 'border-indigo-200',  description: 'Booking vendors, collecting docs',  order: 6 },
  ready_to_travel:  { label: 'Ready to Travel',    color: 'text-teal-700',    bgColor: 'bg-teal-50',    borderColor: 'border-teal-200',    description: 'Everything ready, handover',        order: 7 },
  completed:        { label: 'Completed',          color: 'text-emerald-700', bgColor: 'bg-emerald-50', borderColor: 'border-emerald-200', description: 'Trip done, settle finances',         order: 8 },
  cancelled:        { label: 'Cancelled',          color: 'text-red-700',     bgColor: 'bg-red-50',     borderColor: 'border-red-200',     description: 'Query cancelled',                   order: 9 },
};

export type ServiceType = 'hotel' | 'flight' | 'visa' | 'transport' | 'tour' | 'insurance' | 'other';

export const SERVICE_TYPE_CONFIG: Record<ServiceType, { label: string; icon: string; color: string }> = {
  hotel:     { label: 'Hotel',     icon: 'Building2', color: 'text-blue-600' },
  flight:    { label: 'Flight',    icon: 'Plane',     color: 'text-sky-600' },
  visa:      { label: 'Visa',      icon: 'FileText',  color: 'text-purple-600' },
  transport: { label: 'Transport', icon: 'Car',       color: 'text-amber-600' },
  tour:      { label: 'Tour',      icon: 'Map',       color: 'text-green-600' },
  insurance: { label: 'Insurance', icon: 'Shield',    color: 'text-red-600' },
  other:     { label: 'Other',     icon: 'Package',   color: 'text-gray-600' },
};

export type ServiceCategory = 'umrah' | 'hajj' | 'visa_only' | 'flight_only' | 'hotel_only' | 'transport_only' | 'leisure' | 'other';

export const SERVICE_CATEGORIES: { value: ServiceCategory; label: string }[] = [
  { value: 'umrah', label: 'Umrah' },
  { value: 'hajj', label: 'Hajj' },
  { value: 'visa_only', label: 'Visa Only' },
  { value: 'flight_only', label: 'Flight Only' },
  { value: 'hotel_only', label: 'Hotel Only' },
  { value: 'transport_only', label: 'Transport Only' },
  { value: 'leisure', label: 'Leisure / Tourism' },
  { value: 'other', label: 'Other' },
];

export type BookingStatus = 'not_booked' | 'pending' | 'confirmed' | 'cancelled';
export type Currency = 'PKR' | 'SAR' | 'USD' | 'AED' | 'EUR' | 'GBP';

export const QUERY_SOURCES: { value: string; label: string }[] = [
  { value: 'phone_call', label: 'Phone Call' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'email', label: 'Email' },
  { value: 'walk_in', label: 'Walk-in' },
  { value: 'website', label: 'Website' },
  { value: 'social_media', label: 'Social Media' },
  { value: 'referral', label: 'Referral' },
  { value: 'returning_client', label: 'Returning Client' },
  { value: 'other', label: 'Other' },
];

// ─── MAIN INTERFACES ────────────────────────────

export interface Query {
  id: string;
  query_number: string;
  client_name: string;
  client_phone: string;
  client_whatsapp?: string;
  client_email?: string;
  service_category: ServiceCategory;
  destination: string;
  adults: number;
  children: number;
  infants: number;
  total_pax: number;
  departure_date?: string;
  return_date?: string;
  dates_tentative: boolean;
  service_details: Record<string, any>;
  budget_amount?: number;
  budget_type?: 'total' | 'per_person';
  client_plan?: string;
  internal_notes?: string;
  query_source?: string;
  stage: QueryStage;
  stage_changed_at: string;
  responded_at?: string;
  quote_sent_at?: string;
  confirmed_at?: string;
  booking_started_at?: string;
  ready_at?: string;
  completed_at?: string;
  cancelled_at?: string;
  cancellation_reason?: string;
  total_cost: number;
  total_cost_pkr: number;
  total_selling: number;
  total_selling_pkr: number;
  total_profit: number;
  total_profit_pkr: number;
  profit_margin: number;
  primary_passenger_id?: string;
  invoice_id?: string;
  assigned_to?: string;
  current_quote_version: number;
  created_at: string;
  updated_at: string;
  // Joined
  primary_passenger?: { first_name: string; last_name: string; phone: string };
}

export interface QueryService {
  id: string;
  query_id: string;
  service_type: ServiceType;
  description: string;
  vendor_id?: string;
  vendor_name?: string;
  currency: Currency;
  exchange_rate?: number;
  cost_price: number;
  selling_price: number;
  profit: number;
  cost_price_pkr: number;
  selling_price_pkr: number;
  profit_pkr: number;
  pricing_details: Record<string, any>;
  service_details: Record<string, any>;
  booking_status: BookingStatus;
  booking_reference?: string;
  booking_date?: string;
  booking_notes?: string;
  voucher_url?: string;
  voucher_uploaded_at?: string;
  delivery_status: string;
  sort_order: number;
  service_start_date?: string;
  service_end_date?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  // Joined
  vendor?: { name: string; phone: string };
}

export interface QueryPassenger {
  id: string;
  query_id: string;
  passenger_id: string;
  is_primary: boolean;
  passenger_type: 'adult' | 'child' | 'infant';
  notes?: string;
  created_at: string;
  // Joined
  passenger?: {
    id: string;
    first_name: string;
    last_name: string;
    phone: string;
    passport_number?: string;
    passport_expiry?: string;
  };
}

export interface QueryQuote {
  id: string;
  query_id: string;
  version: number;
  services_snapshot: any;
  total_cost: number;
  total_selling: number;
  total_profit: number;
  currency: string;
  sent_at: string;
  sent_via: string;
  status: 'sent' | 'accepted' | 'rejected' | 'revised';
  client_feedback?: string;
  responded_at?: string;
}

export interface DocumentChecklist {
  id: string;
  query_id: string;
  passenger_id: string;
  document_type: string;
  status: 'missing' | 'uploaded' | 'verified' | 'expired' | 'rejected';
  document_id?: string;
  required: boolean;
  notes?: string;
}

// ─── FORM INPUTS ────────────────────────────────

export interface CreateQueryInput {
  client_name: string;
  client_phone: string;
  client_whatsapp?: string;
  client_email?: string;
  service_category: ServiceCategory;
  destination: string;
  adults: number;
  children: number;
  infants: number;
  departure_date?: string;
  return_date?: string;
  dates_tentative?: boolean;
  service_details?: Record<string, any>;
  budget_amount?: number;
  budget_type?: 'total' | 'per_person';
  client_plan?: string;
  internal_notes?: string;
  query_source?: string;
}

export interface CreateServiceInput {
  query_id: string;
  service_type: ServiceType;
  description: string;
  vendor_id?: string;
  vendor_name?: string;
  currency: Currency;
  exchange_rate?: number;
  cost_price: number;
  selling_price: number;
  profit: number;
  cost_price_pkr: number;
  selling_price_pkr: number;
  profit_pkr: number;
  pricing_details: Record<string, any>;
  service_details: Record<string, any>;
  service_start_date?: string;
  service_end_date?: string;
  notes?: string;
}

// ─── PRICING HELPERS ────────────────────────────

export interface HotelPricing {
  cost_per_night: number;
  selling_per_night: number;
  rooms: number;
  nights: number;
}

export interface FlightPricing {
  adult: { cost: number; selling: number; count: number };
  child: { cost: number; selling: number; count: number };
  infant: { cost: number; selling: number; count: number };
}

export interface SimplePricing {
  unit_cost: number;
  unit_selling: number;
  quantity: number;
}
