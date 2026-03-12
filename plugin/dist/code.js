"use strict";
(() => {
  // src/code.ts
  figma.showUI(__html__, {
    width: 400,
    height: 600,
    title: "Design Assistant"
  });
  figma.ui.onmessage = async (msg) => {
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
              type: node.type
            }))
          }
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
              type: node.type
            })),
            selectedNodes: selection.map((node) => ({
              id: node.id,
              name: node.name,
              type: node.type
            }))
          }
        });
        break;
      }
      case "notify": {
        const payload = msg.payload;
        const text = payload && payload.message ? payload.message : "";
        figma.notify(text);
        break;
      }
      default:
        console.log("Unknown message type:", msg.type);
    }
  };
})();
