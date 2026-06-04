import { createQuery } from '@tanstack/svelte-query';
import { listClientReceivables } from './api';

export function useClientReceivables() {
	return createQuery({ queryKey: ['client-receivables'], queryFn: listClientReceivables });
}
