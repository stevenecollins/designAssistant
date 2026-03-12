import React from "react";
import { ExportState } from "../hooks/usePrototypeExport";

interface PrototypePanelProps {
  frameCount: number;
  exportState: ExportState;
  errorMessage: string | null;
  downloadUrl: string | null;
  onCreatePrototype: () => void;
  onReset: () => void;
}

const STATUS_MESSAGES: Record<string, string> = {
  "exporting-frames": "Exporting frames from Figma...",
  "generating-code": "Generating React code with Claude...",
  "bundling": "Bundling project files...",
};

export function PrototypePanel({
  frameCount,
  exportState,
  errorMessage,
  downloadUrl,
  onCreatePrototype,
  onReset,
}: PrototypePanelProps) {
  if (exportState === "idle" && frameCount === 0) {
    return null;
  }

  return (
    <div style={{ padding: "8px 16px", borderBottom: "1px solid #eee", fontSize: 12 }}>
      {exportState === "idle" && (
        <button
          onClick={onCreatePrototype}
          style={{
            width: "100%",
            padding: "6px 12px",
            background: "#0D6EFD",
            color: "#fff",
            border: "none",
            borderRadius: 6,
            cursor: "pointer",
            fontSize: 12,
            fontWeight: 500,
          }}
        >
          Create Prototype ({frameCount} frame{frameCount !== 1 ? "s" : ""})
        </button>
      )}

      {(exportState === "exporting-frames" ||
        exportState === "generating-code" ||
        exportState === "bundling") && (
        <div style={{ color: "#666", display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ display: "inline-block", width: 12, height: 12, border: "2px solid #0D6EFD", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
          {STATUS_MESSAGES[exportState]}
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      )}

      {exportState === "done" && downloadUrl && (
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <a
            href={downloadUrl}
            download="design-prototype.zip"
            style={{
              flex: 1,
              padding: "6px 12px",
              background: "#198754",
              color: "#fff",
              border: "none",
              borderRadius: 6,
              textAlign: "center",
              textDecoration: "none",
              fontSize: 12,
              fontWeight: 500,
            }}
          >
            Download Prototype
          </a>
          <button
            onClick={onReset}
            style={{
              padding: "6px 8px",
              background: "none",
              border: "1px solid #ddd",
              borderRadius: 6,
              cursor: "pointer",
              fontSize: 11,
              color: "#666",
            }}
          >
            Reset
          </button>
        </div>
      )}

      {exportState === "error" && (
        <div>
          <div style={{ color: "#dc3545", marginBottom: 4 }}>
            Error: {errorMessage}
          </div>
          <button
            onClick={onReset}
            style={{
              padding: "4px 8px",
              background: "none",
              border: "1px solid #ddd",
              borderRadius: 4,
              cursor: "pointer",
              fontSize: 11,
              color: "#666",
            }}
          >
            Try Again
          </button>
        </div>
      )}
    </div>
  );
}
