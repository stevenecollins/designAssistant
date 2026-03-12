// Design Assistant - Plugin Sandbox
// This file runs in Figma's plugin sandbox and has access to the Figma Plugin API.
// It communicates with the UI iframe via figma.ui.postMessage / figma.ui.onmessage.

import { getDocumentStructure, getNodeProperties, getSelection } from "./tools/read";
import { createFrame, createText, createRectangle, updateNode, deleteNode, moveNode } from "./tools/write";

figma.showUI(__html__, {
  width: 400,
  height: 600,
  title: "Design Assistant",
});

// Handle messages from the UI iframe
figma.ui.onmessage = async (msg: { type: string; payload?: unknown }) => {
  switch (msg.type) {
    case "get-page-info": {
      const page = figma.currentPage;
      figma.ui.postMessage({
        type: "page-info",
        payload: {
          name: page.name,
          childCount: page.children.length,
          children: page.children.map((node) => ({
            id: node.id,
            name: node.name,
            type: node.type,
          })),
        },
      });
      break;
    }

    case "get-context": {
      const page = figma.currentPage;
      const selection = figma.currentPage.selection;
      figma.ui.postMessage({
        type: "context",
        payload: {
          pageName: page.name,
          topLevelNodes: page.children.map((node) => ({
            id: node.id,
            name: node.name,
            type: node.type,
          })),
          selectedNodes: selection.map((node) => ({
            id: node.id,
            name: node.name,
            type: node.type,
          })),
        },
      });
      break;
    }

    case "notify": {
      const payload = msg.payload as { message: string } | undefined;
      const text = payload && payload.message ? payload.message : "";
      figma.notify(text);
      break;
    }

    case "tool-call": {
      var payload = msg.payload as { callId: string; toolName: string; args: any };
      var callId = payload.callId;
      var toolName = payload.toolName;
      var toolArgs = payload.args;

      (async function () {
        try {
          var result: unknown;
          switch (toolName) {
            case "get_document_structure":
              result = getDocumentStructure();
              break;
            case "get_node_properties":
              result = getNodeProperties(toolArgs);
              break;
            case "get_selection":
              result = getSelection();
              break;
            case "create_frame":
              result = await createFrame(toolArgs);
              break;
            case "create_text":
              result = await createText(toolArgs);
              break;
            case "create_rectangle":
              result = await createRectangle(toolArgs);
              break;
            case "update_node":
              result = await updateNode(toolArgs);
              break;
            case "delete_node":
              result = deleteNode(toolArgs);
              break;
            case "move_node":
              result = moveNode(toolArgs);
              break;
            default:
              result = { error: "Unknown tool: " + toolName };
          }
          figma.ui.postMessage({ type: "tool-result", callId: callId, result: result });
        } catch (err) {
          figma.ui.postMessage({
            type: "tool-result",
            callId: callId,
            error: err instanceof Error ? err.message : String(err),
          });
        }
      })();
      break;
    }

    default:
      console.log("Unknown message type:", msg.type);
  }
};
