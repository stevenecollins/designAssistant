# Phase 1: Plugin Chat + Claude API

## Tasks

- [x] Implement Cloudflare Worker proxy (`proxy/worker.ts`) — replace POST placeholder with streaming Anthropic API relay
- [x] Add `get-context` handler to sandbox (`plugin/src/code.ts`) — returns page name, top-level nodes, selected nodes
- [x] Create chat hook (`plugin/src/ui/hooks/useClaudeChat.ts`) — conversation state, context bridge, SSE stream parsing
- [x] Create ChatMessage component (`plugin/src/ui/components/ChatMessage.tsx`) — message bubble with user/assistant styling
- [x] Update App.tsx with chat layout — page badge, scrollable messages, input area
- [x] Build plugin and verify — builds successfully with no errors

## Review

### Changes Made

**proxy/worker.ts** — Replaced the placeholder POST handler with a full Claude API relay. Validates the API key, parses the request body, forwards to `https://api.anthropic.com/v1/messages` with streaming enabled, and pipes the SSE stream back with CORS headers. Errors from Anthropic are forwarded with proper status codes.

**plugin/src/code.ts** — Added a `get-context` message handler to the existing switch block. Returns the current page name, top-level node list (id/name/type), and selected node list (id/name/type) to the UI.

**plugin/src/ui/hooks/useClaudeChat.ts** (new) — Custom React hook managing chat state. Handles the async context request to the sandbox via a Promise + ref pattern. Sends messages to the proxy, parses the SSE stream using `ReadableStream.getReader()`, and updates the assistant message as chunks arrive. Captures a snapshot of messages to avoid stale closure issues during streaming.

**plugin/src/ui/components/ChatMessage.tsx** (new) — Simple presentational component for message bubbles. User messages are right-aligned with blue background; assistant messages are left-aligned with gray background. Uses inline styles matching the existing pattern.

**plugin/src/ui/App.tsx** — Replaced the Phase 1 placeholder with a full chat interface. Three-section layout: compact page context badge at top, scrollable message list in the middle (with auto-scroll), and textarea + Send button at the bottom. Enter sends, Shift+Enter adds a newline.

### Testing Instructions

1. Create `proxy/.dev.vars` with `ANTHROPIC_API_KEY=your-key-here`
2. Start proxy: `cd proxy && npx wrangler dev`
3. Build plugin: `cd plugin && npm run build`
4. In Figma: Plugins → Development → Import plugin from manifest → select `plugin/manifest.json`
5. Run the plugin — should see chat interface with page context badge
6. Type "Hello" and press Enter — Claude's response should stream in
7. Ask "What's on this page?" — Claude should describe the page context
8. Send multiple messages — conversation history should persist within the session
