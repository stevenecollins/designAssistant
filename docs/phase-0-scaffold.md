# Phase 0: Project Scaffold

## Goal
Set up the project directory structure, config files, and build tooling so that the plugin compiles and can be loaded into Figma (even if it does nothing yet).

## What We're Creating

### Plugin (`plugin/`)
- `manifest.json` — Figma plugin manifest (name, API version, main/ui entry points, networkAccess)
- `package.json` — Dependencies: React, ReactDOM, Figma typings, esbuild, TypeScript
- `tsconfig.json` — TypeScript config targeting ES2020 with JSX support
- `esbuild.config.js` — Builds two bundles: `code.js` (sandbox) and `ui.html` (iframe with inlined JS)
- `src/code.ts` — Minimal plugin sandbox: shows UI, listens for messages
- `src/ui/index.html` — UI iframe HTML shell
- `src/ui/App.tsx` — Minimal React app rendering "Plugin loaded"

### Proxy (`proxy/`)
- `worker.ts` — Cloudflare Worker stub (returns 200 OK, ready for Phase 1)
- `wrangler.toml` — Cloudflare config (name, compatibility date)
- `package.json` — Wrangler CLI dependency

### Docs (`docs/`)
- `phase-0-scaffold.md` — This file

## Verification
1. Run `npm install` in `plugin/`
2. Run `npm run build` in `plugin/` — should produce `plugin/dist/code.js` and `plugin/dist/ui.html`
3. Open Figma → Plugins → Development → Import plugin from manifest → select `plugin/manifest.json`
4. Run the plugin — should show a panel with "Plugin loaded" text

## Status: IN PROGRESS
