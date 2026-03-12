// Prototype export orchestration hook — runs in the UI (ES2020)
// Handles: export frames → generate code via Claude → bundle into zip for download.

import { useState, useCallback } from "react";
import JSZip from "jszip";
import { buildCodeGenPrompt, FrameExportData } from "../../codegen/prompt";
import { getScaffoldFiles } from "../../codegen/scaffold";

export type ExportState = "idle" | "exporting-frames" | "generating-code" | "bundling" | "done" | "error";

const PROXY_URL = "http://localhost:8787";

export function usePrototypeExport(
  executeToolInSandbox: (toolName: string, args: unknown) => Promise<unknown>,
  chatMessages: Array<{ role: string; content: string }>
) {
  const [exportState, setExportState] = useState<ExportState>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);

  const createPrototype = useCallback(async (frameIds: string[]) => {
    if (frameIds.length === 0) return;

    setExportState("exporting-frames");
    setErrorMessage(null);
    setDownloadUrl(null);

    try {
      // 1. Export frame data and images from sandbox
      const frames: FrameExportData[] = [];
      for (const frameId of frameIds) {
        const dataResult = await executeToolInSandbox("export_frame_data", { frame_id: frameId });
        const imageResult = await executeToolInSandbox("export_frame_image", { frame_id: frameId }) as any;

        if ((dataResult as any)?.error) {
          console.warn("Skipping frame " + frameId + ": " + (dataResult as any).error);
          continue;
        }

        frames.push({
          frameData: dataResult,
          imageBase64: imageResult?.image_base64 || "",
          width: imageResult?.width || 0,
          height: imageResult?.height || 0,
        });
      }

      if (frames.length === 0) {
        throw new Error("No frames could be exported.");
      }

      // 2. Build conversation summary from chat messages
      const conversationSummary = chatMessages
        .filter((m) => m.role === "user")
        .map((m) => m.content)
        .join("\n");

      // 3. Generate code via Claude
      setExportState("generating-code");
      const { system, userContent } = buildCodeGenPrompt(frames, conversationSummary);

      const response = await fetch(PROXY_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [{ role: "user", content: userContent }],
          system,
          stream: false,
          max_tokens: 16384,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error("Code generation failed: " + errorText);
      }

      const claudeResponse = await response.json();
      const contentBlocks = Array.isArray(claudeResponse.content) ? claudeResponse.content : [];
      const textParts = contentBlocks
        .filter((b: any) => b.type === "text")
        .map((b: any) => b.text)
        .join("\n");

      // 4. Parse generated files from Claude's response
      const generatedFiles = parseGeneratedFiles(textParts);
      if (generatedFiles.length === 0) {
        throw new Error("Claude did not generate any files. Response:\n" + textParts.substring(0, 500));
      }

      // 5. Bundle into zip
      setExportState("bundling");
      const zip = new JSZip();
      const scaffoldFiles = getScaffoldFiles();

      // Add scaffold files
      for (const file of scaffoldFiles) {
        zip.file(file.path, file.content);
      }

      // Add generated files (these may override scaffold files like src/App.tsx)
      for (const file of generatedFiles) {
        zip.file(file.path, file.content);
      }

      const blob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(blob);

      setDownloadUrl(url);
      setExportState("done");
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : String(err));
      setExportState("error");
    }
  }, [executeToolInSandbox, chatMessages]);

  const reset = useCallback(() => {
    if (downloadUrl) {
      URL.revokeObjectURL(downloadUrl);
    }
    setExportState("idle");
    setErrorMessage(null);
    setDownloadUrl(null);
  }, [downloadUrl]);

  return { exportState, errorMessage, downloadUrl, createPrototype, reset };
}

function parseGeneratedFiles(text: string): Array<{ path: string; content: string }> {
  // Look for JSON in a ```json code block
  const jsonBlockMatch = text.match(/```json\s*\n([\s\S]*?)\n```/);
  if (jsonBlockMatch) {
    try {
      const parsed = JSON.parse(jsonBlockMatch[1]);
      if (parsed.files && Array.isArray(parsed.files)) {
        return parsed.files;
      }
    } catch {
      // Fall through to other parsing attempts
    }
  }

  // Try to find a JSON object with "files" anywhere in the text
  const filesMatch = text.match(/\{[\s\S]*"files"\s*:\s*\[[\s\S]*\]\s*\}/);
  if (filesMatch) {
    try {
      const parsed = JSON.parse(filesMatch[0]);
      if (parsed.files && Array.isArray(parsed.files)) {
        return parsed.files;
      }
    } catch {
      // Could not parse
    }
  }

  return [];
}
