#!/bin/bash
set -euo pipefail

# Only run in Claude Code on the web (remote) environments.
if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

cd "$CLAUDE_PROJECT_DIR"

# Install JS dependencies (cached after first run) and sync SvelteKit's
# generated types so `npm run check` works immediately.
npm install
npx svelte-kit sync
