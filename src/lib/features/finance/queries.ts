import { createQuery } from '@tanstack/svelte-query';
import {
	bookingFinanceByQuery,
	getProfitSummary,
	listClientReceivables,
	listCollections
} from './api';

export function useClientReceivables() {
	return createQuery({ queryKey: ['client-receivables'], queryFn: listClientReceivables });
}

export function useBookingFinance() {
	return createQuery({ queryKey: ['booking-finance'], queryFn: bookingFinanceByQuery });
}

export function useCollections() {
	return createQuery({ queryKey: ['collections'], queryFn: () => listCollections() });
}

export function useProfitSummary() {
	return createQuery({ queryKey: ['profit-summary'], queryFn: getProfitSummary });
}
