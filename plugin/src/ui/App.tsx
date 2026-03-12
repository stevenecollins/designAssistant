import React, { useState, useEffect, useRef } from "react";
import { createRoot } from "react-dom/client";
import { ChatMessage } from "./components/ChatMessage";
import { useClaudeChat } from "./hooks/useClaudeChat";

interface PageInfo {
  name: string;
  childCount: number;
  children: Array<{ id: string; name: string; type: string }>;
}

function App() {
  const [pageInfo, setPageInfo] = useState<PageInfo | null>(null);
  const [inputText, setInputText] = useState("");
  const { messages, isLoading, sendMessage } = useClaudeChat();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const msg = event.data.pluginMessage;
      if (!msg) return;
      if (msg.type === "page-info") {
        setPageInfo(msg.payload);
      }
    };

    window.addEventListener("message", handleMessage);
    parent.postMessage({ pluginMessage: { type: "get-page-info" } }, "*");
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = () => {
    const trimmed = inputText.trim();
    if (!trimmed || isLoading) return;
    setInputText("");
    sendMessage(trimmed);
  };

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column" }}>
      {/* Page context badge */}
      <div style={{ padding: "8px 16px", borderBottom: "1px solid #eee", fontSize: 12, color: "#666" }}>
        {pageInfo ? (
          <span>Page: <strong>{pageInfo.name}</strong> &middot; {pageInfo.childCount} elements</span>
        ) : (
          <span>Loading...</span>
        )}
      </div>

      {/* Message list */}
      <div style={{ flex: 1, overflowY: "auto", padding: 16 }}>
        {messages.length === 0 && (
          <div style={{ textAlign: "center", color: "#999", fontSize: 12, marginTop: 32 }}>
            Ask me anything about your design.
          </div>
        )}
        {messages.map((msg, i) => (
          <ChatMessage key={i} role={msg.role} content={msg.content} />
        ))}
        {isLoading && messages[messages.length - 1]?.role !== "assistant" && (
          <div style={{ color: "#999", fontSize: 12, padding: 8 }}>Claude is thinking...</div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div style={{ padding: "8px 12px", borderTop: "1px solid #eee", display: "flex", gap: 8 }}>
        <textarea
          style={{
            flex: 1,
            resize: "none",
            border: "1px solid #ddd",
            borderRadius: 8,
            padding: "8px 12px",
            fontSize: 13,
            fontFamily: "inherit",
            outline: "none",
          }}
          rows={1}
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          placeholder="Ask about your design..."
        />
        <button
          style={{
            background: isLoading || !inputText.trim() ? "#ccc" : "#0D6EFD",
            color: "#fff",
            border: "none",
            borderRadius: 8,
            padding: "8px 16px",
            cursor: isLoading || !inputText.trim() ? "default" : "pointer",
            fontSize: 13,
          }}
          onClick={handleSend}
          disabled={isLoading || !inputText.trim()}
        >
          Send
        </button>
      </div>
    </div>
  );
}

// Mount React app
const container = document.getElementById("root");
if (container) {
  const root = createRoot(container);
  root.render(<App />);
}
