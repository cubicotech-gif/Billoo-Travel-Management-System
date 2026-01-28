// Proposal Calculation and Template Utilities

import { format, addDays } from 'date-fns';
import type {
  ProposalCalculation,
  ProposalService,
  ProposalTemplate
} from '../types/proposals';
import { DEFAULT_PROPOSAL_TEMPLATE } from '../types/proposals';

/**
 * Calculate proposal totals from services
 */
export function calculateProposalTotals(
  services: ProposalService[],
  passengerCount: number
): ProposalCalculation {
  const totalCost = services.reduce((sum, s) => sum + s.purchase_amount_pkr, 0);
  const totalSelling = services.reduce((sum, s) => sum + s.selling_amount_pkr, 0);
  const totalProfit = totalSelling - totalCost;
  const profitPercentage = totalCost > 0 ? (totalProfit / totalCost) * 100 : 0;
  const perPersonCost = passengerCount > 0 ? totalSelling / passengerCount : totalSelling;

  return {
    totalServices: services.length,
    totalCost,
    totalSelling,
    totalProfit,
    profitPercentage: Math.round(profitPercentage * 100) / 100,
    perPersonCost: Math.round(perPersonCost),
    services
  };
}

/**
 * Format currency for display
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-PK', {
    style: 'currency',
    currency: 'PKR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount).replace('PKR', 'Rs');
}

/**
 * Format services list for proposal text
 */
export function formatServicesForProposal(services: ProposalService[]): string {
  const serviceIcons: Record<string, string> = {
    'Hotel': '🏨',
    'Flight': '✈️',
    'Transport': '🚗',
    'Visa': '📋',
    'Insurance': '🛡️',
    'Tour': '🎯',
    'Other': '📦'
  };

  return services.map(service => {
    const icon = serviceIcons[service.service_type] || serviceIcons['Other'];
    const price = formatCurrency(service.selling_amount_pkr);
    return `${icon} ${service.service_type} - ${service.service_description}\n   ${price}`;
  }).join('\n\n');
}

/**
 * Replace template variables with actual values
 */
export function replaceTemplateVariables(
  template: string,
  variables: Record<string, string>
): string {
  let result = template;

  Object.entries(variables).forEach(([key, value]) => {
    const placeholder = `{${key}}`;
    result = result.replace(new RegExp(placeholder, 'g'), value);
  });

  return result;
}

/**
 * Generate complete proposal text
 */
export function generateProposalText(
  template: ProposalTemplate,
  query: {
    client_name: string;
    destination: string;
    travel_date: string | null;
    return_date: string | null;
    adults: number;
    children: number;
    infants: number;
  },
  calculation: ProposalCalculation,
  validityDays: number = 7
): string {
  const passengerText = [
    query.adults > 0 ? `${query.adults} Adult${query.adults > 1 ? 's' : ''}` : '',
    query.children > 0 ? `${query.children} Child${query.children > 1 ? 'ren' : ''}` : '',
    query.infants > 0 ? `${query.infants} Infant${query.infants > 1 ? 's' : ''}` : ''
  ].filter(Boolean).join(', ');

  const travelDates = query.travel_date && query.return_date
    ? `${format(new Date(query.travel_date), 'MMM dd')} - ${format(new Date(query.return_date), 'MMM dd, yyyy')}`
    : query.travel_date
    ? format(new Date(query.travel_date), 'MMM dd, yyyy')
    : 'To be confirmed';

  const validityDate = format(addDays(new Date(), validityDays), 'MMM dd, yyyy');

  const variables: Record<string, string> = {
    customer_name: query.client_name,
    destination: query.destination,
    travel_dates: travelDates,
    passenger_count: passengerText,
    total_price: formatCurrency(calculation.totalSelling),
    per_person_price: formatCurrency(calculation.perPersonCost),
    services_list: formatServicesForProposal(calculation.services),
    validity_date: validityDate
  };

  // Build complete proposal
  const sections = [
    replaceTemplateVariables(template.greeting, variables),
    '',
    replaceTemplateVariables(template.body, variables),
    '',
    replaceTemplateVariables(template.servicesSection, variables),
    '',
    replaceTemplateVariables(template.pricingSection, variables),
    '',
    replaceTemplateVariables(template.footer, variables),
    '',
    replaceTemplateVariables(template.closing, variables)
  ];

  return sections.join('\n');
}

/**
 * Get default proposal template with custom values
 */
export function getDefaultProposalTemplate(): ProposalTemplate {
  return { ...DEFAULT_PROPOSAL_TEMPLATE };
}

/**
 * Calculate validity date
 */
export function calculateValidityDate(validityDays: number): string {
  return format(addDays(new Date(), validityDays), 'yyyy-MM-dd');
}

/**
 * Compare two proposal versions and find changes
 */
export function compareProposalVersions(
  oldServices: ProposalService[],
  newServices: ProposalService[]
): {
  added: ProposalService[];
  removed: ProposalService[];
  modified: ProposalService[];
} {
  const added: ProposalService[] = [];
  const removed: ProposalService[] = [];
  const modified: ProposalService[] = [];

  // Find removed and modified
  oldServices.forEach(oldService => {
    const newService = newServices.find(s => s.id === oldService.id);
    if (!newService) {
      removed.push(oldService);
    } else if (
      newService.selling_amount_pkr !== oldService.selling_amount_pkr ||
      newService.service_description !== oldService.service_description
    ) {
      modified.push(newService);
    }
  });

  // Find added
  newServices.forEach(newService => {
    const oldService = oldServices.find(s => s.id === newService.id);
    if (!oldService) {
      added.push(newService);
    }
  });

  return { added, removed, modified };
}

/**
 * Format proposal changes for display
 */
export function formatProposalChanges(
  oldServices: ProposalService[],
  newServices: ProposalService[],
  oldTotal: number,
  newTotal: number
): string {
  const changes = compareProposalVersions(oldServices, newServices);
  const lines: string[] = [];

  if (changes.removed.length > 0) {
    lines.push('Removed:');
    changes.removed.forEach(service => {
      lines.push(`❌ ${service.service_type} - ${service.service_description} (${formatCurrency(service.selling_amount_pkr)})`);
    });
    lines.push('');
  }

  if (changes.added.length > 0) {
    lines.push('Added:');
    changes.added.forEach(service => {
      lines.push(`✅ ${service.service_type} - ${service.service_description} (${formatCurrency(service.selling_amount_pkr)})`);
    });
    lines.push('');
  }

  if (changes.modified.length > 0) {
    lines.push('Modified:');
    changes.modified.forEach(service => {
      const oldService = oldServices.find(s => s.id === service.id);
      if (oldService) {
        lines.push(`🔄 ${service.service_type} - ${service.service_description}`);
        if (oldService.selling_amount_pkr !== service.selling_amount_pkr) {
          lines.push(`   ${formatCurrency(oldService.selling_amount_pkr)} → ${formatCurrency(service.selling_amount_pkr)}`);
        }
      }
    });
    lines.push('');
  }

  if (oldTotal !== newTotal) {
    const diff = newTotal - oldTotal;
    const symbol = diff > 0 ? '↑' : '↓';
    lines.push(`💰 Total Price Changed: ${formatCurrency(oldTotal)} → ${formatCurrency(newTotal)} (${symbol} ${formatCurrency(Math.abs(diff))})`);
  }

  return lines.join('\n');
}

/**
 * Check if proposal is expired
 */
export function isProposalExpired(validUntil: string | null): boolean {
  if (!validUntil) return false;
  return new Date(validUntil) < new Date();
}

/**
 * Get days remaining for proposal validity
 */
export function getDaysRemaining(validUntil: string | null): number {
  if (!validUntil) return 0;
  const diff = new Date(validUntil).getTime() - new Date().getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

/**
 * Format relative time (e.g., "2 days ago")
 */
export function formatRelativeTime(date: string): string {
  const now = new Date();
  const past = new Date(date);
  const diffMs = now.getTime() - past.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  if (diffDays < 30) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;

  return format(past, 'MMM dd, yyyy');
}
