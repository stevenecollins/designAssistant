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

---

# Phase 2: Design Modification Tools

## Tasks

- [x] Update proxy to accept `tools` array and `stream` flag (`proxy/worker.ts`)
- [x] Create tool definitions — 9 Claude tool schemas (`plugin/src/tools/definitions.ts`)
- [x] Create sandbox read handlers (`plugin/src/tools/read.ts`) — get_document_structure, get_node_properties, get_selection
- [x] Create sandbox write handlers (`plugin/src/tools/write.ts`) — create_frame, create_text, create_rectangle, update_node, delete_node, move_node
- [x] Add tool-call dispatch to sandbox (`plugin/src/code.ts`) — routes tool calls to handlers
- [x] Implement tool-use loop (`plugin/src/ui/hooks/useClaudeChat.ts`) — non-streaming, callId-keyed sandbox communication, max 10 rounds
- [x] Verify App.tsx needs no changes — tool status shown as assistant messages automatically
- [x] Build and verify — builds successfully with no errors

## Review

### Changes Made

**proxy/worker.ts** — Added support for `tools` array and `stream` boolean flag from client. If `tools` is present, it's forwarded to Anthropic. The `stream` flag defaults to `true` for backward compatibility but can be set to `false` for non-streaming tool-use requests. Response content-type is set conditionally.

**plugin/src/tools/definitions.ts** (new) — Defines 9 Claude tool schemas: 3 reading tools (get_document_structure, get_node_properties, get_selection), 3 creation tools (create_frame, create_text, create_rectangle), and 3 modification tools (update_node, delete_node, move_node). Each has a name, description, and JSON Schema input_schema.

**plugin/src/tools/read.ts** (new) — ES2017 sandbox code for reading the Figma document. `getDocumentStructure()` recursively walks the page tree (depth-limited to 3, max 200 nodes). `getNodeProperties()` returns detailed node info including fills, strokes, text content, font, auto-layout, and corner radius. `getSelection()` returns summaries of selected nodes.

**plugin/src/tools/write.ts** (new) — ES2017 sandbox code for creating/modifying/deleting nodes. All creation functions return `{ id, name, type }`. `createText()` loads fonts via `figma.loadFontAsync()` before setting characters, with fallback to Inter Regular. `updateNode()` only modifies provided fields. Fills accept simplified `{r, g, b}` format (0-1 range) and convert to Figma Paint[]. `deleteNode()` and `moveNode()` validate node existence before acting.

**plugin/src/code.ts** — Added imports for read/write tool handlers. Added a `"tool-call"` case in the message switch that extracts `callId`, `toolName`, and `args`, routes to the correct handler, and returns results via `postMessage` with matching `callId`. Wrapped in try/catch for error handling.

**plugin/src/ui/hooks/useClaudeChat.ts** — Major rewrite. Switched from streaming to non-streaming API calls. Added `apiMessagesRef` for full Claude API message format (content block arrays). Added `pendingToolCallsRef` Map for callId-keyed tool call resolution. New `executeToolInSandbox()` sends tool-call messages and returns a Promise. New `callClaude()` makes non-streaming requests with tool definitions. The `doSend()` function now implements a tool-use loop: calls Claude → if tool_use blocks returned, executes tools in sandbox → sends tool_results back → repeats until end_turn (max 10 rounds). Tool activity is shown as intermediate "Working: tool_name..." messages.

**plugin/src/ui/App.tsx** — No changes needed. Tool activity messages display as regular assistant messages.

### Architecture

```
User types message → useClaudeChat.sendMessage()
  → requestContext() from sandbox
  → callClaude() with tools (non-streaming)
  → If stop_reason="tool_use":
      → executeToolInSandbox() for each tool
      → Sandbox routes via tool-call dispatch
      → Results sent back with callId matching
      → tool_results added to apiMessages
      → Loop: callClaude() again
  → If stop_reason="end_turn":
      → Extract text, display final response
```

### Testing Instructions

1. Start proxy: `cd proxy && npx wrangler dev`
2. Build plugin: `cd plugin && npm run build`
3. Run plugin in Figma
4. "Create a blue rectangle, 200x100, in the center of the page" → rectangle appears on canvas
5. "Add a text node above it saying 'Hello World' in 24px bold" → text node appears
6. "Change the rectangle color to red" → rectangle fill updates
7. "Delete the rectangle" → rectangle is removed
8. All created nodes should be real Figma objects (selectable, editable, visible in layers panel)
