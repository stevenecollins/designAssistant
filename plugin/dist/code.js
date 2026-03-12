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
      case "notify": {
        const text = msg.payload?.message ?? "";
        figma.notify(text);
        break;
      }
      default:
        console.log("Unknown message type:", msg.type);
    }
  };
})();
