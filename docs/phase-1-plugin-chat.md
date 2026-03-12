# Phase 1: Plugin Chat + Claude API

## Goal
Build a working chat interface inside the Figma plugin that communicates with Claude via a Cloudflare Worker proxy. Designer types a message, Claude responds. No design modification yet — just conversation with page context.

## Prerequisites
- Phase 0 complete: plugin loads in Figma, shows page info
- Cloudflare account (free tier) for deploying the Worker proxy
- Anthropic API key for Claude

## Architecture for This Phase

```
Plugin UI (iframe)          Plugin Sandbox (code.ts)
┌──────────────────┐       ┌─────────────────────┐
│ Chat input       │──────►│ get-context handler  │
│ Message list     │◄──────│ Returns page info    │
│ Loading state    │       └─────────────────────┘
└────────┬─────────┘
         │ HTTPS fetch
         ▼
┌──────────────────┐       ┌─────────────────────┐
│ Cloudflare Worker│──────►│ Anthropic API        │
│ (CORS + API key) │◄──────│ POST /v1/messages    │
└──────────────────┘       └─────────────────────┘
```

## What to Build

### 1. Chat UI (`plugin/src/ui/App.tsx` + new components)

Replace the "Chat interface coming in Phase 1" placeholder:
- **Message list**: scrollable container, auto-scrolls to bottom on new messages
- **Chat input**: text area + send button at bottom of panel
- **Message bubbles**: different styles for user (right-aligned, blue) vs assistant (left-aligned, gray)
- **Loading indicator**: shows while waiting for Claude's response
- **Page context badge**: keep showing current page name and element count at top

New files:
- `plugin/src/ui/components/ChatMessage.tsx` — renders a single message bubble
- `plugin/src/ui/hooks/useClaudeChat.ts` — manages conversation state and API calls

### 2. Chat Hook (`plugin/src/ui/hooks/useClaudeChat.ts`)

State and logic:
- `messages`: array of `{ role: 'user' | 'assistant', content: string }`
- `isLoading`: boolean
- `sendMessage(text: string)`:
  1. Appends user message to state
  2. Requests current page context from sandbox via postMessage
  3. POSTs to Cloudflare Worker proxy with messages array + system prompt + page context
  4. Streams response back, appending assistant message as chunks arrive
  5. Sets isLoading false when complete

System prompt (keep simple for Phase 1):
```
You are a Figma design assistant. You help designers create and modify designs.
You are currently viewing a Figma file. Here is the current page context:
{pageContext}
```

### 3. Cloudflare Worker Proxy (`proxy/worker.ts`)

Implement the POST handler:
- Parse request body: `{ messages: [{role, content}], system?: string }`
- Forward to `https://api.anthropic.com/v1/messages` with:
  - `x-api-key` header from `env.ANTHROPIC_API_KEY` secret
  - `anthropic-version: 2023-06-01`
  - `content-type: application/json`
  - Body: `{ model: "claude-sonnet-4-20250514", max_tokens: 4096, stream: true, system, messages }`
- Stream the response back to the plugin (pipe the ReadableStream)
- Handle errors: missing API key, Anthropic errors, network failures

### 4. Sandbox Context (`plugin/src/code.ts`)

Add a `get-context` message handler:
```typescript
case "get-context": {
  const page = figma.currentPage;
  const selection = figma.currentPage.selection;
  figma.ui.postMessage({
    type: "context",
    payload: {
      pageName: page.name,
      topLevelNodes: page.children.map(node => ({
        id: node.id,
        name: node.name,
        type: node.type,
      })),
      selectedNodes: selection.map(node => ({
        id: node.id,
        name: node.name,
        type: node.type,
      })),
    }
  });
  break;
}
```

## Files to Modify

| File | Action | Description |
|------|--------|-------------|
| `plugin/src/ui/App.tsx` | MODIFY | Replace placeholder with chat layout |
| `plugin/src/ui/components/ChatMessage.tsx` | CREATE | Message bubble component |
| `plugin/src/ui/hooks/useClaudeChat.ts` | CREATE | Chat state + API communication |
| `plugin/src/code.ts` | MODIFY | Add `get-context` handler |
| `proxy/worker.ts` | MODIFY | Implement Claude API relay with streaming |

## Key Constraints

- **No tool-use yet**: Phase 1 is chat only. Claude can describe the design but cannot modify it. Tool-use comes in Phase 2.
- **ES2017 target for sandbox**: Figma's sandbox doesn't support optional chaining (`?.`) or nullish coalescing (`??`). Keep esbuild sandbox target at `es2017`.
- **Streaming**: Stream Claude's responses for better UX. The Cloudflare Worker pipes the Anthropic SSE stream back to the plugin.
- **Proxy URL config**: For local dev, use `http://localhost:8787` (wrangler dev). For production, deploy to Cloudflare and use the Worker URL. Store the URL in a constant in the chat hook.

## Verification

1. **Proxy local dev**: `cd proxy && npm install && npx wrangler dev` — starts at localhost:8787
2. **Set API key**: `cd proxy && npx wrangler secret put ANTHROPIC_API_KEY` (for deployed) or set in `.dev.vars` file for local dev
3. **Build plugin**: `cd plugin && npm run build`
4. **Test in Figma**:
   - Open Figma → run plugin → see chat interface
   - Type "Hello" → see Claude's response stream in
   - Type "What's on this page?" → Claude describes the current page
   - Send multiple messages → conversation history persists
   - Close and reopen plugin → conversation resets (no persistence yet)

## Status: NOT STARTED
