import React, { useState, useEffect } from "react";
import { createRoot } from "react-dom/client";

interface PageInfo {
  name: string;
  childCount: number;
  children: Array<{ id: string; name: string; type: string }>;
}

function App() {
  const [pageInfo, setPageInfo] = useState<PageInfo | null>(null);

  useEffect(() => {
    // Listen for messages from the plugin sandbox
    const handleMessage = (event: MessageEvent) => {
      const msg = event.data.pluginMessage;
      if (!msg) return;

      switch (msg.type) {
        case "page-info":
          setPageInfo(msg.payload);
          break;
      }
    };

    window.addEventListener("message", handleMessage);

    // Request page info on mount
    parent.postMessage({ pluginMessage: { type: "get-page-info" } }, "*");

    return () => window.removeEventListener("message", handleMessage);
  }, []);

  return (
    <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
      <h2 style={{ fontSize: 16, fontWeight: 600 }}>Design Assistant</h2>

      {pageInfo ? (
        <div style={{ fontSize: 12, color: "#666" }}>
          <p>Page: <strong>{pageInfo.name}</strong></p>
          <p>Elements: {pageInfo.childCount}</p>
        </div>
      ) : (
        <p style={{ fontSize: 12, color: "#999" }}>Loading...</p>
      )}

      <div
        style={{
          padding: 12,
          background: "#f5f5f5",
          borderRadius: 8,
          fontSize: 12,
          color: "#666",
          textAlign: "center",
        }}
      >
        Chat interface coming in Phase 1
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
