// Read tool handlers — runs in Figma plugin sandbox (ES2017, no optional chaining)

function serializeNode(node: SceneNode, depth: number, maxDepth: number): unknown {
  var base: Record<string, unknown> = {
    id: node.id,
    name: node.name,
    type: node.type,
  };

  if ("x" in node) base.x = node.x;
  if ("y" in node) base.y = node.y;
  if ("width" in node) base.width = node.width;
  if ("height" in node) base.height = node.height;

  if (depth < maxDepth && "children" in node) {
    var children = (node as ChildrenMixin).children;
    base.children = children.map(function (child: SceneNode) {
      return serializeNode(child, depth + 1, maxDepth);
    });
  }

  return base;
}

export function getDocumentStructure(): unknown {
  var page = figma.currentPage;
  var nodes: unknown[] = [];
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
    nodes: nodes,
  };
}

export function getNodeProperties(args: { node_id: string }): unknown {
  var node = figma.getNodeById(args.node_id);
  if (!node) {
    return { error: "Node not found with ID: " + args.node_id };
  }

  var result: Record<string, unknown> = {
    id: node.id,
    name: node.name,
    type: node.type,
  };

  var sceneNode = node as SceneNode;
  if ("x" in sceneNode) result.x = sceneNode.x;
  if ("y" in sceneNode) result.y = sceneNode.y;
  if ("width" in sceneNode) result.width = sceneNode.width;
  if ("height" in sceneNode) result.height = sceneNode.height;
  if ("visible" in sceneNode) result.visible = sceneNode.visible;
  if ("opacity" in sceneNode) result.opacity = (sceneNode as any).opacity;

  // Fills
  if ("fills" in sceneNode) {
    var fills = (sceneNode as GeometryMixin).fills;
    if (fills !== figma.mixed && Array.isArray(fills)) {
      result.fills = fills.map(function (fill: Paint) {
        if (fill.type === "SOLID") {
          return {
            type: "SOLID",
            color: { r: fill.color.r, g: fill.color.g, b: fill.color.b },
            opacity: fill.opacity,
          };
        }
        return { type: fill.type };
      });
    }
  }

  // Strokes
  if ("strokes" in sceneNode) {
    var strokes = (sceneNode as GeometryMixin).strokes;
    if (Array.isArray(strokes)) {
      result.strokes = strokes.map(function (stroke: Paint) {
        if (stroke.type === "SOLID") {
          return {
            type: "SOLID",
            color: { r: stroke.color.r, g: stroke.color.g, b: stroke.color.b },
            opacity: stroke.opacity,
          };
        }
        return { type: stroke.type };
      });
    }
  }

  // Corner radius
  if ("cornerRadius" in sceneNode) {
    var cr = (sceneNode as any).cornerRadius;
    if (cr !== figma.mixed) {
      result.cornerRadius = cr;
    }
  }

  // Text-specific
  if (node.type === "TEXT") {
    var textNode = node as TextNode;
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

  // Auto-layout (frames)
  if ("layoutMode" in sceneNode) {
    var frame = sceneNode as FrameNode;
    if (frame.layoutMode !== "NONE") {
      result.autoLayout = {
        direction: frame.layoutMode,
        spacing: frame.itemSpacing,
        paddingTop: frame.paddingTop,
        paddingBottom: frame.paddingBottom,
        paddingLeft: frame.paddingLeft,
        paddingRight: frame.paddingRight,
      };
    }
  }

  // Children count
  if ("children" in sceneNode) {
    result.childCount = (sceneNode as ChildrenMixin).children.length;
  }

  return result;
}

export function getSelection(): unknown {
  var selection = figma.currentPage.selection;
  if (selection.length === 0) {
    return { selectedNodes: [], message: "No nodes are currently selected." };
  }

  return {
    selectedNodes: selection.map(function (node: SceneNode) {
      var info: Record<string, unknown> = {
        id: node.id,
        name: node.name,
        type: node.type,
      };
      if ("x" in node) info.x = node.x;
      if ("y" in node) info.y = node.y;
      if ("width" in node) info.width = node.width;
      if ("height" in node) info.height = node.height;
      return info;
    }),
  };
}
