# Future: Prototype Publishing UX Improvements

## Problem
The current Phase 3 prototype export requires designers to download a zip, unzip it, and run `npm install && npm run dev` in the terminal. Designers don't have CLI skills — this needs to be zero-friction.

## Requirements
- Designer clicks a button in the plugin and sees their prototype in the browser
- Designer can make changes in Figma, then re-generate the prototype with another click
- No terminal, no npm, no unzipping
- Support iterative workflow: design → prototype → tweak design → re-prototype

## Options to Explore

### Option A: StackBlitz WebContainer
- Use StackBlitz SDK to open generated project directly in the browser
- `sdk.openProject()` accepts a files object — we already generate this
- Full React + Tailwind with proper routing, runs in-browser
- Free, no infrastructure
- Designers can also share the URL or hand off to engineering

### Option B: Cloud-hosted preview
- Proxy deploys generated files to Cloudflare Pages or R2 static hosting
- Plugin gets back a preview URL and opens it
- Each re-generation creates a new deployment
- Requires infrastructure but gives stable shareable URLs

### Option C: Companion local tool
- One-time install: `npm install -g design-prototype-server`
- Plugin sends code to local server, it writes files + runs Vite
- Subsequent re-generations just hot-reload
- Best iterative experience but requires initial setup

## Key UX Considerations
- "Re-generate Prototype" button should be prominent after first generation
- Should track which frames changed since last prototype generation
- Consider showing a diff or "what changed" summary
- Prototype URL/tab should persist across regenerations (hot reload vs new tab)

## Status: TO BE DISCUSSED
