## Rules to Follow

1. First think through the problem, read the codebase for relevant files, and write a plan to `tasks/todo.md`.
2. The plan should have a list of todo items that you can check off as you complete them.
3. Before you begin working, check in with me and I will verify the plan.
4. Then, begin working on the todo items, marking them as complete as you go.
5. Please every step of the way just give me a high level explanation of what changes you made.
6. Make every task and code change you do as simple as possible. We want to avoid making any massive or complex changes. Every change should impact as little code as possible. Everything is about simplicity.
7. Finally, add a review section to the `tasks/todo.md` file with a summary of the changes you made and any other relevant information.
8. DO NOT BE LAZY. NEVER BE LAZY. IF THERE IS A BUG FIND THE ROOT CAUSE AND FIX IT. NO TEMPORARY FIXES. YOU ARE A SENIOR DEVELOPER. NEVER BE LAZY.
9. MAKE ALL FIXES AND CODE CHANGES AS SIMPLE AS HUMANLY POSSIBLE. THEY SHOULD ONLY IMPACT NECESSARY CODE RELEVANT TO THE TASK AND NOTHING ELSE. IT SHOULD IMPACT AS LITTLE CODE AS POSSIBLE. YOUR GOAL IS TO NOT INTRODUCE ANY BUGS. IT'S ALL ABOUT SIMPLICITY.

## Project Information

**Design Assistant** — A Figma plugin that lets designers chat with Claude AI to create and modify designs using a published Figma design library, then export interactive React prototypes.

### Architecture
- `plugin/` — Figma plugin (TypeScript + React). Sandbox (`code.ts`) modifies the Figma file via Plugin API. UI iframe (`ui/App.tsx`) provides a chat interface.
- `proxy/` — Cloudflare Worker that relays requests to the Claude API (handles CORS, holds API key).
- `docs/` — Phase-by-phase implementation plans.

### Build Commands
- **Plugin**: `cd plugin && npm install && npm run build` (outputs `dist/code.js` and `dist/ui.html`)
- **Plugin watch**: `cd plugin && npm run watch`
- **Proxy dev**: `cd proxy && npm install && npx wrangler dev`
- **Proxy deploy**: `cd proxy && npx wrangler deploy`

### Key Figma Plugin Concepts
- Plugin sandbox (`code.ts`) has access to the `figma` global — can read/modify the document
- Plugin UI (`ui/`) is an iframe — communicates with sandbox via `postMessage` / `onmessage`
- UI iframe cannot access `figma` global directly — must request data from sandbox
- `manifest.json` points to `dist/code.js` (main) and `dist/ui.html` (ui)

### Phase Plans
See `docs/phase-*.md` for detailed implementation plans per phase.

# currentDate
Today's date is 2026-03-12.
