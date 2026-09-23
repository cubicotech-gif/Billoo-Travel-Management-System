import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	preprocess: vitePreprocess(),
	kit: {
		// SPA mode: static adapter with a fallback so client-side routing works.
		adapter: adapter({
			fallback: 'index.html',
			precompress: false,
			strict: false
		}),
		// Installed (PWA) sessions stay open for days — poll for a new deploy so
		// the next navigation does a full reload onto the fresh build.
		version: {
			pollInterval: 5 * 60 * 1000
		},
		alias: {
			$features: 'src/lib/features',
			$ui: 'src/lib/ui'
		}
	}
};

export default config;
