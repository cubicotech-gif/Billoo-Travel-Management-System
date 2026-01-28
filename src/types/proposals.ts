// Proposal Types and Constants

export const QUERY_STATUSES = [
  'New Query - Not Responded',
  'Responded - Awaiting Reply',
  'Working on Proposal',
  'Proposal Sent',
  'Revisions Requested',
  'Finalized & Booking',
  'Services Booked',
  'In Delivery',
  'Completed',
  'Cancelled'
] as const;

export type QueryStatus = typeof QUERY_STATUSES[number];

export const PROPOSAL_STATUSES = [
  'sent',
  'accepted',
  'rejected',
  'revised',
  'expired'
] as const;

export type ProposalStatus = typeof PROPOSAL_STATUSES[number];

export const CUSTOMER_RESPONSE_TYPES = [
  'accepted',
  'wants_changes',
  'rejected',
  'needs_time'
] as const;

export type CustomerResponseType = typeof CUSTOMER_RESPONSE_TYPES[number];

export interface ProposalService {
  id: string;
  service_type: string;
  service_description: string;
  vendor_name?: string;
  city?: string;
  purchase_amount_pkr: number;
  selling_amount_pkr: number;
  profit_pkr: number;
}

export interface ProposalCalculation {
  totalServices: number;
  totalCost: number;
  totalSelling: number;
  totalProfit: number;
  profitPercentage: number;
  perPersonCost: number;
  services: ProposalService[];
}

export interface ProposalTemplate {
  subject?: string;
  greeting: string;
  body: string;
  servicesSection: string;
  pricingSection: string;
  footer: string;
  closing: string;
}

export interface SendProposalData {
  queryId: string;
  versionNumber: number;
  proposalText: string;
  servicesSnapshot: ProposalService[];
  totalAmount: number;
  costAmount: number;
  profitAmount: number;
  profitPercentage: number;
  sentVia: string[];
  validityDays: number;
}

export interface CustomerResponseData {
  proposalId: string;
  responseType: CustomerResponseType;
  feedback: string;
  responseDate: string;
}

export interface ProposalVersion {
  id: string;
  version_number: number;
  sent_date: string;
  status: ProposalStatus;
  total_amount: number;
  sent_via: string[];
  valid_until: string | null;
  customer_feedback?: string;
}

export interface ProposalComparison {
  version: number;
  changes: {
    added: ProposalService[];
    removed: ProposalService[];
    priceChange: {
      old: number;
      new: number;
      difference: number;
    };
  };
}

// Template variable replacements
export const TEMPLATE_VARIABLES = {
  CUSTOMER_NAME: '{customer_name}',
  DESTINATION: '{destination}',
  TRAVEL_DATES: '{travel_dates}',
  PASSENGER_COUNT: '{passenger_count}',
  TOTAL_PRICE: '{total_price}',
  PER_PERSON_PRICE: '{per_person_price}',
  SERVICES_LIST: '{services_list}',
  VALIDITY_DATE: '{validity_date}',
} as const;

// Default proposal template
export const DEFAULT_PROPOSAL_TEMPLATE: ProposalTemplate = {
  greeting: 'Assalam o Alaikum {customer_name},',
  body: `Thank you for choosing Billoo Travels. Please find your {destination} package proposal below:

Package Details:
- Destination: {destination}
- Travel Dates: {travel_dates}
- Passengers: {passenger_count}`,
  servicesSection: `Services Included:
{services_list}`,
  pricingSection: `Total Package Price:
Rs {total_price} for {passenger_count}
(Rs {per_person_price} per person)`,
  footer: `This proposal is valid until {validity_date}.

Please let us know if you'd like any changes or have any questions.`,
  closing: `JazakAllah Khair
Billoo Travels Team`
};

// Payment methods for advance payment
export const PAYMENT_METHODS = [
  'Cash',
  'Bank Transfer',
  'Easy Paisa',
  'Jazz Cash',
  'Credit Card',
  'Debit Card',
  'Cheque'
] as const;

export type PaymentMethod = typeof PAYMENT_METHODS[number];

// Communication channels
export const COMMUNICATION_CHANNELS = [
  { id: 'whatsapp', label: 'WhatsApp', icon: '📱' },
  { id: 'email', label: 'Email', icon: '📧' },
  { id: 'sms', label: 'SMS', icon: '💬' }
] as const;

// Status badges configuration
export const STATUS_CONFIG: Record<QueryStatus, { color: string; icon: string }> = {
  'New Query - Not Responded': { color: 'bg-red-100 text-red-800', icon: '🆕' },
  'Responded - Awaiting Reply': { color: 'bg-blue-100 text-blue-800', icon: '💬' },
  'Working on Proposal': { color: 'bg-yellow-100 text-yellow-800', icon: '📝' },
  'Proposal Sent': { color: 'bg-purple-100 text-purple-800', icon: '📤' },
  'Revisions Requested': { color: 'bg-orange-100 text-orange-800', icon: '🔄' },
  'Finalized & Booking': { color: 'bg-indigo-100 text-indigo-800', icon: '✅' },
  'Services Booked': { color: 'bg-teal-100 text-teal-800', icon: '🎫' },
  'In Delivery': { color: 'bg-cyan-100 text-cyan-800', icon: '🚀' },
  'Completed': { color: 'bg-green-100 text-green-800', icon: '✔️' },
  'Cancelled': { color: 'bg-gray-100 text-gray-800', icon: '❌' }
};
