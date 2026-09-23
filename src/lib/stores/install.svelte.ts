// PWA install prompt. Chrome/Edge/Android fire `beforeinstallprompt`; we stash
// it so the nav can offer an "Install app" button. iOS Safari never fires it —
// there the user installs via Share → Add to Home Screen, so we show a hint.

interface BeforeInstallPromptEvent extends Event {
	prompt: () => Promise<void>;
	userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

let deferred = $state<BeforeInstallPromptEvent | null>(null);
let standalone = $state(false);
let ios = $state(false);

export const install = {
	/** True when the browser offered a native install prompt. */
	get canPrompt() {
		return deferred !== null;
	},
	/** Already running as an installed app. */
	get standalone() {
		return standalone;
	},
	/** iOS Safari: no prompt API, show the Add-to-Home-Screen hint instead. */
	get iosHint() {
		return ios && !standalone;
	},
	async prompt() {
		if (!deferred) return;
		await deferred.prompt();
		await deferred.userChoice;
		deferred = null;
	}
};

/** Wire the listeners once from the root layout. Returns a cleanup. */
export function initInstall(): () => void {
	standalone =
		window.matchMedia('(display-mode: standalone)').matches ||
		(navigator as Navigator & { standalone?: boolean }).standalone === true;
	ios = /iphone|ipad|ipod/i.test(navigator.userAgent);

	const onPrompt = (e: Event) => {
		e.preventDefault();
		deferred = e as BeforeInstallPromptEvent;
	};
	const onInstalled = () => {
		deferred = null;
		standalone = true;
	};
	window.addEventListener('beforeinstallprompt', onPrompt);
	window.addEventListener('appinstalled', onInstalled);
	return () => {
		window.removeEventListener('beforeinstallprompt', onPrompt);
		window.removeEventListener('appinstalled', onInstalled);
	};
}
