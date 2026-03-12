// Export tool handlers — runs in Figma plugin sandbox (ES2017, no optional chaining)
// These are internal commands called by the UI, not Claude-facing tools.

function serializeNodeDetailed(node: SceneNode, depth: number, maxDepth: number): unknown {
  var base: Record<string, unknown> = {
    id: node.id,
    name: node.name,
    type: node.type,
  };

  if ("x" in node) base.x = node.x;
  if ("y" in node) base.y = node.y;
  if ("width" in node) base.width = node.width;
  if ("height" in node) base.height = node.height;
  if ("visible" in node) base.visible = node.visible;
  if ("opacity" in node) base.opacity = (node as any).opacity;

  // Fills
  if ("fills" in node) {
    var fills = (node as GeometryMixin).fills;
    if (fills !== figma.mixed && Array.isArray(fills)) {
      base.fills = fills.map(function (fill: Paint) {
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
  if ("strokes" in node) {
    var strokes = (node as GeometryMixin).strokes;
    if (Array.isArray(strokes) && strokes.length > 0) {
      base.strokes = strokes.map(function (stroke: Paint) {
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
  if ("cornerRadius" in node) {
    var cr = (node as any).cornerRadius;
    if (cr !== figma.mixed) {
      base.cornerRadius = cr;
    }
  }

  // Text-specific
  if (node.type === "TEXT") {
    var textNode = node as TextNode;
    base.characters = textNode.characters;
    var fontSize = textNode.fontSize;
    if (fontSize !== figma.mixed) {
      base.fontSize = fontSize;
    }
    var fontName = textNode.fontName;
    if (fontName !== figma.mixed) {
      base.fontFamily = fontName.family;
      base.fontStyle = fontName.style;
    }
  }

  // Auto-layout (frames)
  if ("layoutMode" in node) {
    var frame = node as FrameNode;
    if (frame.layoutMode !== "NONE") {
      base.autoLayout = {
        direction: frame.layoutMode,
        spacing: frame.itemSpacing,
        paddingTop: frame.paddingTop,
        paddingBottom: frame.paddingBottom,
        paddingLeft: frame.paddingLeft,
        paddingRight: frame.paddingRight,
      };
    }
  }

  // Recurse into children
  if (depth < maxDepth && "children" in node) {
    var children = (node as ChildrenMixin).children;
    base.children = children.map(function (child: SceneNode) {
      return serializeNodeDetailed(child, depth + 1, maxDepth);
    });
  }

  return base;
}

function uint8ArrayToBase64(bytes: Uint8Array): string {
  var binary = "";
  var chunkSize = 8192;
  for (var i = 0; i < bytes.length; i += chunkSize) {
    var chunk = bytes.subarray(i, Math.min(i + chunkSize, bytes.length));
    for (var j = 0; j < chunk.length; j++) {
      binary += String.fromCharCode(chunk[j]);
    }
  }
  return btoa(binary);
}

export function exportFrameData(args: { frame_id: string }): unknown {
  var node = figma.getNodeById(args.frame_id);
  if (!node) {
    return { error: "Node not found with ID: " + args.frame_id };
  }
  if (node.type !== "FRAME" && node.type !== "COMPONENT" && node.type !== "INSTANCE") {
    return { error: "Node is not a frame: " + node.type };
  }
  var sceneNode = node as SceneNode;
  return serializeNodeDetailed(sceneNode, 0, 20);
}

export async function exportFrameImage(args: { frame_id: string }): Promise<unknown> {
  var node = figma.getNodeById(args.frame_id);
  if (!node) {
    return { error: "Node not found with ID: " + args.frame_id };
  }
  if (!("exportAsync" in node)) {
    return { error: "Node does not support export" };
  }

  var exportable = node as SceneNode;
  var bytes = await (exportable as any).exportAsync({
    format: "PNG",
    constraint: { type: "SCALE", value: 2 },
  });

  var base64 = uint8ArrayToBase64(bytes);
  return {
    image_base64: base64,
    width: "width" in exportable ? exportable.width : 0,
    height: "height" in exportable ? exportable.height : 0,
  };
}
