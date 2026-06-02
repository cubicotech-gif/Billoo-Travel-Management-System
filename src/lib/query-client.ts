import { QueryClient } from '@tanstack/svelte-query';

// Shared TanStack Query client. Sensible defaults for an internal tool:
// data is considered fresh for 30s, retries once, and refetches on reconnect.
export function createQueryClient(): QueryClient {
	return new QueryClient({
		defaultOptions: {
			queries: {
				staleTime: 30_000,
				retry: 1,
				refetchOnWindowFocus: false
			}
		}
	});
}
