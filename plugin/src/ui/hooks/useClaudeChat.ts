import { useState, useEffect, useRef, useCallback } from "react";

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

export function useClaudeChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const contextResolverRef = useRef<((ctx: PageContext) => void) | null>(null);

  // Listen for context responses from the sandbox
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const msg = event.data.pluginMessage;
      if (!msg) return;
      if (msg.type === "context" && contextResolverRef.current) {
        contextResolverRef.current(msg.payload);
        contextResolverRef.current = null;
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

  const sendMessage = useCallback(async (text: string) => {
    const userMessage: ChatMessage = { role: "user", content: text };

    setMessages((prev) => {
      const updated = [...prev, userMessage];
      // Kick off the async work with the correct messages snapshot
      doSend(updated);
      return updated;
    });

    async function doSend(updatedMessages: ChatMessage[]) {
      setIsLoading(true);

      try {
        const context = await requestContext();

        const systemPrompt = `You are a Figma design assistant. You help designers create and modify designs.
You are currently viewing a Figma file. Here is the current page context:
Page: ${context.pageName}
Top-level layers: ${JSON.stringify(context.topLevelNodes)}
Selected nodes: ${JSON.stringify(context.selectedNodes)}`;

        const response = await fetch(PROXY_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: updatedMessages, system: systemPrompt }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          setMessages([...updatedMessages, { role: "assistant", content: `Error: ${errorText}` }]);
          return;
        }

        // Parse SSE stream
        const reader = response.body!.getReader();
        const decoder = new TextDecoder();
        let assistantContent = "";
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          const lines = buffer.split("\n");
          buffer = lines.pop()!;

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const data = line.slice(6);
            if (data === "[DONE]") continue;
            try {
              const parsed = JSON.parse(data);
              if (
                parsed.type === "content_block_delta" &&
                parsed.delta &&
                parsed.delta.type === "text_delta"
              ) {
                assistantContent += parsed.delta.text;
                setMessages([
                  ...updatedMessages,
                  { role: "assistant", content: assistantContent },
                ]);
              }
            } catch {
              // Skip non-JSON lines
            }
          }
        }

        // If no content was streamed, add a fallback
        if (!assistantContent) {
          setMessages([
            ...updatedMessages,
            { role: "assistant", content: "No response received." },
          ]);
        }
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : "Unknown error";
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: `Error: ${errorMsg}` },
        ]);
      } finally {
        setIsLoading(false);
      }
    }
  }, []);

  return { messages, isLoading, sendMessage };
}
