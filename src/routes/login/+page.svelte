<script lang="ts">
	import { Button, Card } from '$lib/ui';
	import { auth } from '$lib/stores/auth.svelte';

	let email = $state('');
	let password = $state('');
	let error = $state<string | null>(null);
	let submitting = $state(false);

	async function handleSubmit(e: SubmitEvent) {
		e.preventDefault();
		submitting = true;
		error = null;
		const result = await auth.signIn(email, password);
		error = result.error;
		submitting = false;
	}
</script>

<div class="flex min-h-screen items-center justify-center bg-slate-50 px-4">
	<div class="w-full max-w-sm">
		<div class="mb-6 text-center">
			<div class="text-2xl font-bold text-brand-700">Billoo Travel</div>
			<div class="text-sm text-slate-400">Umrah Season Console</div>
		</div>
		<Card>
			<form onsubmit={handleSubmit} class="space-y-4">
				<div>
					<label for="email" class="mb-1 block text-sm font-medium text-slate-700">Email</label>
					<input
						id="email"
						type="email"
						bind:value={email}
						required
						class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
					/>
				</div>
				<div>
					<label for="password" class="mb-1 block text-sm font-medium text-slate-700">Password</label>
					<input
						id="password"
						type="password"
						bind:value={password}
						required
						class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
					/>
				</div>
				{#if error}
					<p class="text-sm text-red-600">{error}</p>
				{/if}
				<Button type="submit" disabled={submitting} class="w-full">
					{submitting ? 'Signing in…' : 'Sign in'}
				</Button>
			</form>
		</Card>
	</div>
</div>
