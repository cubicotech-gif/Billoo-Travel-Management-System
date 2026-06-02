import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '$lib/supabase';

// Reactive auth state, shared app-wide. Uses Svelte 5 runes in a .svelte.ts
// module so any component can import and read `auth.user` reactively.
class AuthStore {
	session = $state<Session | null>(null);
	user = $state<User | null>(null);
	loading = $state(true);

	/** Wire up the session listener. Call once, from the root layout. */
	async init(): Promise<void> {
		const { data } = await supabase.auth.getSession();
		this.session = data.session;
		this.user = data.session?.user ?? null;
		this.loading = false;

		supabase.auth.onAuthStateChange((_event, session) => {
			this.session = session;
			this.user = session?.user ?? null;
		});
	}

	async signIn(email: string, password: string): Promise<{ error: string | null }> {
		const { error } = await supabase.auth.signInWithPassword({ email, password });
		return { error: error?.message ?? null };
	}

	async signOut(): Promise<void> {
		await supabase.auth.signOut();
	}

	get isAuthenticated(): boolean {
		return this.user !== null;
	}
}

export const auth = new AuthStore();
