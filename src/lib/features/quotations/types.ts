import type { Database } from '$lib/database.types';

export type Quotation = Database['public']['Tables']['quotations']['Row'];
export type QuotationLine = Database['public']['Tables']['quotation_lines']['Row'];

export const QUOTATION_STATUS_TONE: Record<
	Quotation['status'],
	'neutral' | 'info' | 'success' | 'warning' | 'danger'
> = {
	draft: 'neutral',
	sent: 'info',
	accepted: 'success',
	rejected: 'danger',
	archived: 'neutral'
};
