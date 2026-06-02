import { createClient } from '@supabase/supabase-js';
import { env } from '$env/dynamic/public';
import type { Database } from './database.types';

// Single browser-side Supabase client for the whole SPA.
// Reads PUBLIC_* env at runtime so a fresh clone type-checks without a .env.
const url = env.PUBLIC_SUPABASE_URL ?? '';
const anonKey = env.PUBLIC_SUPABASE_ANON_KEY ?? '';

if (!url || !anonKey) {
	// Surfaces immediately in dev if the environment isn't configured.
	console.warn('[supabase] PUBLIC_SUPABASE_URL / PUBLIC_SUPABASE_ANON_KEY are not set.');
}

export const supabase = createClient<Database>(url, anonKey, {
	auth: {
		persistSession: true,
		autoRefreshToken: true,
		detectSessionInUrl: true
	}
});
