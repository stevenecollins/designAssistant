"use strict";
(() => {
  // src/tools/read.ts
  function serializeNode(node, depth, maxDepth) {
    var base = {
      id: node.id,
      name: node.name,
      type: node.type
    };
    if ("x" in node) base.x = node.x;
    if ("y" in node) base.y = node.y;
    if ("width" in node) base.width = node.width;
    if ("height" in node) base.height = node.height;
    if (depth < maxDepth && "children" in node) {
      var children = node.children;
      base.children = children.map(function(child) {
        return serializeNode(child, depth + 1, maxDepth);
      });
    }
    return base;
  }
  function getDocumentStructure() {
    var page = figma.currentPage;
    var nodes = [];
    var count = 0;
    var maxNodes = 200;
    var maxDepth = 3;
    for (var i = 0; i < page.children.length; i++) {
      if (count >= maxNodes) break;
      nodes.push(serializeNode(page.children[i], 0, maxDepth));
      count++;
    }
    return {
      pageName: page.name,
      nodeCount: page.children.length,
      nodes
    };
  }
  function getNodeProperties(args) {
    var node = figma.getNodeById(args.node_id);
    if (!node) {
      return { error: "Node not found with ID: " + args.node_id };
    }
    var result = {
      id: node.id,
      name: node.name,
      type: node.type
    };
    var sceneNode = node;
    if ("x" in sceneNode) result.x = sceneNode.x;
    if ("y" in sceneNode) result.y = sceneNode.y;
    if ("width" in sceneNode) result.width = sceneNode.width;
    if ("height" in sceneNode) result.height = sceneNode.height;
    if ("visible" in sceneNode) result.visible = sceneNode.visible;
    if ("opacity" in sceneNode) result.opacity = sceneNode.opacity;
    if ("fills" in sceneNode) {
      var fills = sceneNode.fills;
      if (fills !== figma.mixed && Array.isArray(fills)) {
        result.fills = fills.map(function(fill) {
          if (fill.type === "SOLID") {
            return {
              type: "SOLID",
              color: { r: fill.color.r, g: fill.color.g, b: fill.color.b },
              opacity: fill.opacity
            };
          }
          return { type: fill.type };
        });
      }
    }
    if ("strokes" in sceneNode) {
      var strokes = sceneNode.strokes;
      if (Array.isArray(strokes)) {
        result.strokes = strokes.map(function(stroke) {
          if (stroke.type === "SOLID") {
            return {
              type: "SOLID",
              color: { r: stroke.color.r, g: stroke.color.g, b: stroke.color.b },
              opacity: stroke.opacity
            };
          }
          return { type: stroke.type };
        });
      }
    }
    if ("cornerRadius" in sceneNode) {
      var cr = sceneNode.cornerRadius;
      if (cr !== figma.mixed) {
        result.cornerRadius = cr;
      }
    }
    if (node.type === "TEXT") {
      var textNode = node;
      result.characters = textNode.characters;
      var fontSize = textNode.fontSize;
      if (fontSize !== figma.mixed) {
        result.fontSize = fontSize;
      }
      var fontName = textNode.fontName;
      if (fontName !== figma.mixed) {
        result.fontFamily = fontName.family;
        result.fontStyle = fontName.style;
      }
    }
    if ("layoutMode" in sceneNode) {
      var frame = sceneNode;
      if (frame.layoutMode !== "NONE") {
        result.autoLayout = {
          direction: frame.layoutMode,
          spacing: frame.itemSpacing,
          paddingTop: frame.paddingTop,
          paddingBottom: frame.paddingBottom,
          paddingLeft: frame.paddingLeft,
          paddingRight: frame.paddingRight
        };
      }
    }
    if ("children" in sceneNode) {
      result.childCount = sceneNode.children.length;
    }
    return result;
  }
  function getSelection() {
    var selection = figma.currentPage.selection;
    if (selection.length === 0) {
      return { selectedNodes: [], message: "No nodes are currently selected." };
    }
    return {
      selectedNodes: selection.map(function(node) {
        var info = {
          id: node.id,
          name: node.name,
          type: node.type
        };
        if ("x" in node) info.x = node.x;
        if ("y" in node) info.y = node.y;
        if ("width" in node) info.width = node.width;
        if ("height" in node) info.height = node.height;
        return info;
      })
    };
  }

  // src/tools/write.ts
  function toFigmaFills(fills) {
    return fills.map(function(c) {
      return {
        type: "SOLID",
        color: { r: c.r, g: c.g, b: c.b }
      };
    });
  }
  async function createFrame(args) {
    var frame = figma.createFrame();
    frame.name = args.name;
    frame.x = args.x;
    frame.y = args.y;
    frame.resize(args.width, args.height);
    if (args.fills) {
      frame.fills = toFigmaFills(args.fills);
    }
    if (args.auto_layout) {
      var al = args.auto_layout;
      if (al.direction === "HORIZONTAL" || al.direction === "VERTICAL") {
        frame.layoutMode = al.direction;
      }
      if (al.spacing !== void 0) {
        frame.itemSpacing = al.spacing;
      }
      if (al.padding !== void 0) {
        frame.paddingTop = al.padding;
        frame.paddingBottom = al.padding;
        frame.paddingLeft = al.padding;
        frame.paddingRight = al.padding;
      }
    }
    return { id: frame.id, name: frame.name, type: frame.type };
  }
  async function createText(args) {
    var family = args.font_family || "Inter";
    var style = args.font_weight || "Regular";
    var textNode = figma.createText();
    textNode.x = args.x;
    textNode.y = args.y;
    try {
      await figma.loadFontAsync({ family, style });
    } catch (e) {
      await figma.loadFontAsync({ family: "Inter", style: "Regular" });
      family = "Inter";
      style = "Regular";
    }
    textNode.fontName = { family, style };
    textNode.fontSize = args.font_size;
    textNode.characters = args.text;
    if (args.color) {
      textNode.fills = [
        { type: "SOLID", color: { r: args.color.r, g: args.color.g, b: args.color.b } }
      ];
    }
    return { id: textNode.id, name: textNode.name, type: textNode.type };
  }
  async function createRectangle(args) {
    var rect = figma.createRectangle();
    rect.x = args.x;
    rect.y = args.y;
    rect.resize(args.width, args.height);
    if (args.name) {
      rect.name = args.name;
    }
    if (args.fills) {
      rect.fills = toFigmaFills(args.fills);
    }
    if (args.corner_radius !== void 0) {
      rect.cornerRadius = args.corner_radius;
    }
    return { id: rect.id, name: rect.name, type: rect.type };
  }
  async function updateNode(args) {
    var node = figma.getNodeById(args.node_id);
    if (!node) {
      return { error: "Node not found with ID: " + args.node_id };
    }
    var sceneNode = node;
    if (args.name !== void 0) {
      sceneNode.name = args.name;
    }
    if (args.visible !== void 0) {
      sceneNode.visible = args.visible;
    }
    if (args.opacity !== void 0 && "opacity" in sceneNode) {
      sceneNode.opacity = args.opacity;
    }
    if (args.x !== void 0 && "x" in sceneNode) {
      sceneNode.x = args.x;
    }
    if (args.y !== void 0 && "y" in sceneNode) {
      sceneNode.y = args.y;
    }
    if (args.width !== void 0 && args.height !== void 0 && "resize" in sceneNode) {
      sceneNode.resize(args.width, args.height);
    } else if (args.width !== void 0 && "resize" in sceneNode) {
      sceneNode.resize(args.width, sceneNode.height);
    } else if (args.height !== void 0 && "resize" in sceneNode) {
      sceneNode.resize(sceneNode.width, args.height);
    }
    if (args.fills && "fills" in sceneNode) {
      sceneNode.fills = toFigmaFills(args.fills);
    }
    if (args.corner_radius !== void 0 && "cornerRadius" in sceneNode) {
      sceneNode.cornerRadius = args.corner_radius;
    }
    if (node.type === "TEXT") {
      var textNode = node;
      if (args.text !== void 0 || args.font_size !== void 0) {
        var fontName = textNode.fontName;
        var family = "Inter";
        var style = "Regular";
        if (fontName !== figma.mixed) {
          family = fontName.family;
          style = fontName.style;
        }
        await figma.loadFontAsync({ family, style });
        if (args.text !== void 0) {
          textNode.characters = args.text;
        }
        if (args.font_size !== void 0) {
          textNode.fontSize = args.font_size;
        }
      }
    }
    return {
      id: node.id,
      name: node.name,
      type: node.type,
      message: "Node updated successfully"
    };
  }
  function deleteNode(args) {
    var node = figma.getNodeById(args.node_id);
    if (!node) {
      return { error: "Node not found with ID: " + args.node_id };
    }
    var name = node.name;
    node.remove();
    return { message: "Deleted node: " + name };
  }
  function moveNode(args) {
    var node = figma.getNodeById(args.node_id);
    if (!node) {
      return { error: "Node not found with ID: " + args.node_id };
    }
    var sceneNode = node;
    if (args.parent_id) {
      var parent = figma.getNodeById(args.parent_id);
      if (!parent) {
        return { error: "Parent node not found with ID: " + args.parent_id };
      }
      if (!("appendChild" in parent)) {
        return { error: "Target parent cannot contain children" };
      }
      parent.appendChild(sceneNode);
    }
    if (args.x !== void 0) {
      sceneNode.x = args.x;
    }
    if (args.y !== void 0) {
      sceneNode.y = args.y;
    }
    return {
      id: sceneNode.id,
      name: sceneNode.name,
      x: sceneNode.x,
      y: sceneNode.y,
      message: "Node moved successfully"
    };
  }

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
        const payload2 = msg.payload;
        const text = payload2 && payload2.message ? payload2.message : "";
        figma.notify(text);
        break;
      }
      case "tool-call": {
        var payload = msg.payload;
        var callId = payload.callId;
        var toolName = payload.toolName;
        var toolArgs = payload.args;
        (async function() {
          try {
            var result;
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
            figma.ui.postMessage({ type: "tool-result", callId, result });
          } catch (err) {
            figma.ui.postMessage({
              type: "tool-result",
              callId,
              error: err instanceof Error ? err.message : String(err)
            });
          }
        })();
        break;
      }
      default:
        console.log("Unknown message type:", msg.type);
    }
  };
})();
