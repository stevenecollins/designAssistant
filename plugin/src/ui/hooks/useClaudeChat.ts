import { useState, useEffect, useRef, useCallback } from "react";
import { TOOL_DEFINITIONS } from "../../tools/definitions";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface PageContext {
  pageName: string;
  topLevelNodes: Array<{ id: string; name: string; type: string }>;
  selectedNodes: Array<{ id: string; name: string; type: string }>;
}

const PROXY_URL = "http://localhost:8787";
const MAX_TOOL_ROUNDS = 10;

// Generate a unique ID for matching tool call requests to responses
let callIdCounter = 0;
function nextCallId(): string {
  callIdCounter++;
  return "tc_" + callIdCounter + "_" + Date.now();
}

export function useClaudeChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const contextResolverRef = useRef<((ctx: PageContext) => void) | null>(null);
  const pendingToolCallsRef = useRef<Map<string, (result: unknown) => void>>(new Map());
  // Full API message history (content block arrays for tool-use)
  const apiMessagesRef = useRef<Array<{ role: string; content: unknown }>>([]);
  // Track frame IDs created during the conversation
  const trackedFrameIdsRef = useRef<Set<string>>(new Set());
  const [trackedFrameIds, setTrackedFrameIds] = useState<string[]>([]);

  // Listen for messages from the sandbox
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const msg = event.data.pluginMessage;
      if (!msg) return;

      if (msg.type === "context" && contextResolverRef.current) {
        contextResolverRef.current(msg.payload);
        contextResolverRef.current = null;
      }

      if (msg.type === "tool-result") {
        const resolver = pendingToolCallsRef.current.get(msg.callId);
        if (resolver) {
          pendingToolCallsRef.current.delete(msg.callId);
          if (msg.error) {
            resolver({ error: msg.error });
          } else {
            resolver(msg.result);
          }
        }
      }
    };
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  function requestContext(): Promise<PageContext> {
    return new Promise((resolve) => {
      contextResolverRef.current = resolve;
      parent.postMessage({ pluginMessage: { type: "get-context" } }, "*");
    });
  }

  function executeToolInSandbox(toolName: string, args: unknown): Promise<unknown> {
    return new Promise((resolve) => {
      const callId = nextCallId();
      pendingToolCallsRef.current.set(callId, resolve);
      parent.postMessage(
        {
          pluginMessage: {
            type: "tool-call",
            payload: { callId, toolName, args },
          },
        },
        "*"
      );
    });
  }

  async function callClaude(
    apiMessages: Array<{ role: string; content: unknown }>,
    systemPrompt: string
  ): Promise<{ content: unknown[]; stop_reason: string }> {
    const response = await fetch(PROXY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: apiMessages,
        system: systemPrompt,
        tools: TOOL_DEFINITIONS,
        stream: false,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error("API error: " + errorText);
    }

    return await response.json();
  }

  const sendMessage = useCallback(async (text: string) => {
    const userMessage: ChatMessage = { role: "user", content: text };

    setMessages((prev) => {
      const updated = [...prev, userMessage];
      doSend(updated);
      return updated;
    });

    async function doSend(displayMessages: ChatMessage[]) {
      setIsLoading(true);

      try {
        const context = await requestContext();

        const systemPrompt = `You are a Figma design assistant. You help designers create and modify designs.
You have tools to read the document, create elements, and modify existing ones.
Use tools to fulfill the user's design requests. After making changes, briefly confirm what you did.

Current page context:
Page: ${context.pageName}
Top-level layers: ${JSON.stringify(context.topLevelNodes)}
Selected nodes: ${JSON.stringify(context.selectedNodes)}`;

        // Add user message to API history
        apiMessagesRef.current.push({ role: "user", content: text });

        let rounds = 0;

        while (rounds < MAX_TOOL_ROUNDS) {
          rounds++;

          const response = await callClaude(apiMessagesRef.current, systemPrompt);

          // Extract content blocks
          const contentBlocks = Array.isArray(response.content)
            ? response.content
            : [];

          // Push assistant message to API history (full content blocks)
          apiMessagesRef.current.push({ role: "assistant", content: contentBlocks });

          // Check if Claude wants to use tools
          const toolUseBlocks = contentBlocks.filter(
            (block: any) => block.type === "tool_use"
          );

          if (response.stop_reason === "end_turn" || toolUseBlocks.length === 0) {
            // Final response — extract text and display
            const textParts = contentBlocks
              .filter((block: any) => block.type === "text")
              .map((block: any) => block.text);
            const finalText = textParts.join("\n") || "Done.";

            setMessages([
              ...displayMessages,
              { role: "assistant", content: finalText },
            ]);
            break;
          }

          // Show tool activity in chat
          const toolNames = toolUseBlocks.map((b: any) => b.name).join(", ");
          setMessages([
            ...displayMessages,
            {
              role: "assistant",
              content: "Working: " + toolNames + "...",
            },
          ]);

          // Execute each tool call and collect results
          const toolResults: unknown[] = [];
          for (const toolBlock of toolUseBlocks) {
            const result = await executeToolInSandbox(
              (toolBlock as any).name,
              (toolBlock as any).input
            );
            // Track frames created during conversation
            if ((toolBlock as any).name === "create_frame" && result && (result as any).id) {
              trackedFrameIdsRef.current.add((result as any).id);
              setTrackedFrameIds(Array.from(trackedFrameIdsRef.current));
            }
            toolResults.push({
              type: "tool_result",
              tool_use_id: (toolBlock as any).id,
              content: JSON.stringify(result),
            });
          }

          // Add tool results as a user message to API history
          apiMessagesRef.current.push({ role: "user", content: toolResults });
        }

        if (rounds >= MAX_TOOL_ROUNDS) {
          setMessages([
            ...displayMessages,
            {
              role: "assistant",
              content:
                "I've reached the maximum number of tool calls. Here's what I've done so far.",
            },
          ]);
        }
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : "Unknown error";
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: "Error: " + errorMsg },
        ]);
      } finally {
        setIsLoading(false);
      }
    }
  }, []);

  return { messages, isLoading, sendMessage, trackedFrameIds, executeToolInSandbox };
}
