import React from "react";

interface ChatMessageProps {
  role: "user" | "assistant";
  content: string;
}

export function ChatMessage({ role, content }: ChatMessageProps) {
  const isUser = role === "user";

  return (
    <div style={{ display: "flex", justifyContent: isUser ? "flex-end" : "flex-start", marginBottom: 8 }}>
      <div
        style={{
          maxWidth: "80%",
          padding: "8px 12px",
          borderRadius: isUser ? "12px 12px 0 12px" : "12px 12px 12px 0",
          background: isUser ? "#0D6EFD" : "#F0F0F0",
          color: isUser ? "#fff" : "#333",
          fontSize: 13,
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
        }}
      >
        {content}
      </div>
    </div>
  );
}
