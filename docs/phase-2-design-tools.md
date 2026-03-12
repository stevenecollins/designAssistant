# Phase 2: Design Modification Tools

## Goal
Enable Claude to create, modify, and delete design elements in Figma through structured tool-use. Integrate the published design library so Claude uses real components and styles.

## Prerequisites
- Phase 1 complete: chat UI works, Claude responds via proxy
- Access to the team's published Figma design library (file key needed)
- Figma Personal Access Token (for REST API library indexing)

## Architecture for This Phase

```
Plugin UI (chat)
    │
    │ sends user prompt
    ▼
Cloudflare Worker
    │
    │ Claude API with tool definitions
    ▼
Claude returns tool_use blocks
    │
    │ relayed back to plugin UI
    ▼
Plugin UI parses tool calls
    │
    │ postMessage to sandbox
    ▼
Plugin Sandbox executes via Figma Plugin API
    │
    │ returns results to UI
    ▼
Plugin UI sends tool_results back to Claude
    │
    │ Claude continues or responds
    ▼
Loop until Claude sends final text response
```

## What to Build

### 1. Tool Definitions (Claude tool-use schema)

Define tools that Claude can call. Start with a focused set:

**Reading tools:**
- `get_document_structure` — Returns the node tree (names, types, positions, sizes)
- `get_node_properties` — Returns detailed properties of a specific node by ID (fills, strokes, text content, font, effects, constraints)
- `get_selection` — Returns currently selected nodes

**Creation tools:**
- `create_frame` — Create a frame with name, position, size, optional auto-layout
- `create_text` — Create a text node with content, font, size, color
- `create_rectangle` — Create a rectangle with position, size, fills, corner radius

**Modification tools:**
- `update_node` — Update properties of an existing node (fills, size, position, text content, name, etc.)
- `delete_node` — Remove a node by ID
- `move_node` — Move a node to a new position or reparent it

**Library tools:**
- `search_library_components` — Search the published library for components by name/description
- `instantiate_component` — Import a library component by key and place it at a position

### 2. Tool Registry (`plugin/src/tools/registry.ts`)

Central dispatch: receives a tool name + arguments from the UI, routes to the correct handler in the sandbox, returns results.

### 3. Tool Handlers (`plugin/src/tools/read.ts`, `write.ts`, `library.ts`)

Each tool is implemented as a function in the sandbox that uses the Figma Plugin API:
- `read.ts`: traverse `figma.currentPage.children`, `figma.getNodeById()`, serialize node properties
- `write.ts`: `figma.createFrame()`, `figma.createText()`, `figma.createRectangle()`, set properties, `.remove()`
- `library.ts`: `figma.importComponentByKeyAsync(key)`, create instances, search cached library index

### 4. Library Indexing

On plugin startup (or first use):
1. Use the Figma REST API (`GET /v1/files/{fileKey}/components`) to fetch all published components from the library file
2. Cache the index: component name, key, description, variant properties
3. Include the top ~30 most-used components in Claude's system prompt
4. Make the full catalog searchable via `search_library_components` tool

The library file key and Figma access token need to be configured (stored in plugin settings or proxy env).

### 5. Tool-Use Loop in Chat Hook

Update `useClaudeChat.ts` to handle Claude's tool-use responses:
1. Send messages to proxy with tool definitions
2. When Claude returns `tool_use` blocks, parse them
3. For each tool call: postMessage to sandbox → wait for result → collect tool_results
4. Send tool_results back to Claude (continue the conversation)
5. Repeat until Claude returns a final text response

### 6. Proxy Updates

Update `proxy/worker.ts` to forward the `tools` array in the Claude API request body.

## Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `plugin/src/tools/registry.ts` | CREATE | Tool definitions (JSON schemas) and dispatch |
| `plugin/src/tools/read.ts` | CREATE | get_document_structure, get_node_properties, get_selection |
| `plugin/src/tools/write.ts` | CREATE | create_frame, create_text, create_rectangle, update_node, delete_node, move_node |
| `plugin/src/tools/library.ts` | CREATE | search_library_components, instantiate_component, library indexing |
| `plugin/src/ui/hooks/useClaudeChat.ts` | MODIFY | Add tool-use loop handling |
| `plugin/src/ui/components/ToolProgress.tsx` | CREATE | Shows which tools Claude is calling (visual feedback) |
| `plugin/src/code.ts` | MODIFY | Add tool execution dispatch via registry |
| `proxy/worker.ts` | MODIFY | Forward tools array in API request |

## Key Constraints

- **ES2017 in sandbox**: No optional chaining or nullish coalescing in sandbox code
- **Font loading**: Must call `figma.loadFontAsync()` before modifying text properties
- **Async operations**: `importComponentByKeyAsync` is async — handle with message-based request/response pattern between UI and sandbox
- **Node IDs are session-specific**: IDs change between sessions. Always reference nodes by searching, not by stored IDs.
- **Library file key**: Must be configured. Consider a settings UI in the plugin or hardcode for PoC.

## Verification

1. Open Figma with an empty page → run plugin
2. Type "Create a blue rectangle, 200x100, in the center of the page" → rectangle appears
3. Type "Add a text node above it saying 'Hello World' in 24px bold" → text appears
4. Type "Change the rectangle color to red" → rectangle updates
5. Type "Create a card component from our library" (if library configured) → real component instance appears
6. Type "Delete the rectangle" → rectangle removed
7. Verify all changes are real Figma nodes (can be selected, edited manually)

## Status: COMPLETE
