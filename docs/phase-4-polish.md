# Phase 4: Polish & Team Rollout

## Goal
Make the plugin reliable and pleasant enough for 6 designers to use daily. Add undo support, error handling, conversation persistence, and deploy privately to the Figma Org.

## Prerequisites
- Phases 1-3 complete: chat works, design tools work, prototype export works
- Figma Organization plan (for private plugin distribution)

## What to Build

### 1. Undo / Snapshot Support
- Before each AI modification, snapshot the affected nodes (or the full page state)
- Add an "Undo last AI change" button in the chat UI
- Use `figma.currentPage.clone()` or per-node snapshots for rollback
- Consider Figma's built-in undo (`figma.commitUndo()` / undo groups)

### 2. Error Handling & Retry
- Graceful handling of: proxy timeouts, Claude API errors, rate limits, network failures
- Retry logic with exponential backoff for transient failures
- Clear error messages in the chat UI (not just console errors)
- "Retry" button on failed messages

### 3. Conversation Persistence
- Save conversation history per Figma file using `figma.clientStorage`
- Restore conversation when plugin is reopened on the same file
- "Clear conversation" button
- Consider token usage display (approximate cost per conversation)

### 4. Design Library Caching
- Cache the library component index in `figma.clientStorage`
- Refresh when the library file is updated (check via REST API timestamp)
- Add a "Refresh Library" button in plugin settings

### 5. System Prompt Optimization
- Tune the system prompt for the team's specific library naming conventions
- Include component usage guidelines and variant names
- Add examples of good tool-use sequences for common design tasks
- Test with the team's real design patterns

### 6. Plugin Settings UI
- Configurable proxy URL (localhost for dev, production Worker URL)
- Library file key input
- Figma access token input (for REST API library indexing)
- Theme preference (optional)

### 7. Build Optimization
- Add `minify: true` to esbuild config for production builds
- Reduce bundle size (currently ~1MB with React)
- Add a `build:prod` npm script

### 8. Private Distribution
- Register the plugin with Figma (get a real plugin ID)
- Publish privately to the Figma Organization
- Test installation for all 6 designers
- Document setup instructions (API key, library config)

## Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `plugin/src/ui/components/Settings.tsx` | CREATE | Settings panel UI |
| `plugin/src/ui/components/UndoButton.tsx` | CREATE | Undo last AI change |
| `plugin/src/ui/hooks/useConversationStorage.ts` | CREATE | Persist/restore chat per file |
| `plugin/src/tools/snapshot.ts` | CREATE | Node state snapshotting for undo |
| `plugin/src/code.ts` | MODIFY | Add settings storage, undo support |
| `plugin/src/ui/App.tsx` | MODIFY | Add settings, undo, error handling |
| `plugin/src/ui/hooks/useClaudeChat.ts` | MODIFY | Add retry logic, persistence |
| `plugin/esbuild.config.js` | MODIFY | Add production build with minification |
| `plugin/manifest.json` | MODIFY | Update with real plugin ID |

## Verification

1. **Undo**: Make an AI change → click Undo → change is reverted
2. **Persistence**: Chat about a design → close plugin → reopen → conversation is restored
3. **Error handling**: Disconnect network → send message → see friendly error → reconnect → retry works
4. **Library refresh**: Update a component in Figma library → click Refresh → new version available
5. **Distribution**: Install plugin via Figma Org → run → everything works without local server
6. **End-to-end**: Designer prompts 3 screens → manually tweaks → generates React prototype → shares URL

## Status: NOT STARTED
