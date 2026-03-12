// Write tool handlers — runs in Figma plugin sandbox (ES2017, no optional chaining)

function toFigmaFills(fills: Array<{ r: number; g: number; b: number }>): Paint[] {
  return fills.map(function (c) {
    return {
      type: "SOLID" as const,
      color: { r: c.r, g: c.g, b: c.b },
    };
  });
}

export async function createFrame(args: {
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fills?: Array<{ r: number; g: number; b: number }>;
  auto_layout?: { direction?: string; spacing?: number; padding?: number };
}): Promise<unknown> {
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
    if (al.spacing !== undefined) {
      frame.itemSpacing = al.spacing;
    }
    if (al.padding !== undefined) {
      frame.paddingTop = al.padding;
      frame.paddingBottom = al.padding;
      frame.paddingLeft = al.padding;
      frame.paddingRight = al.padding;
    }
  }

  return { id: frame.id, name: frame.name, type: frame.type };
}

export async function createText(args: {
  text: string;
  x: number;
  y: number;
  font_size: number;
  font_family?: string;
  font_weight?: string;
  color?: { r: number; g: number; b: number };
}): Promise<unknown> {
  var family = args.font_family || "Inter";
  var style = args.font_weight || "Regular";

  var textNode = figma.createText();
  textNode.x = args.x;
  textNode.y = args.y;

  try {
    await figma.loadFontAsync({ family: family, style: style });
  } catch (e) {
    // Fall back to Inter Regular if requested font isn't available
    await figma.loadFontAsync({ family: "Inter", style: "Regular" });
    family = "Inter";
    style = "Regular";
  }

  textNode.fontName = { family: family, style: style };
  textNode.fontSize = args.font_size;
  textNode.characters = args.text;

  if (args.color) {
    textNode.fills = [
      { type: "SOLID" as const, color: { r: args.color.r, g: args.color.g, b: args.color.b } },
    ];
  }

  return { id: textNode.id, name: textNode.name, type: textNode.type };
}

export async function createRectangle(args: {
  x: number;
  y: number;
  width: number;
  height: number;
  fills?: Array<{ r: number; g: number; b: number }>;
  corner_radius?: number;
  name?: string;
}): Promise<unknown> {
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

  if (args.corner_radius !== undefined) {
    rect.cornerRadius = args.corner_radius;
  }

  return { id: rect.id, name: rect.name, type: rect.type };
}

export async function updateNode(args: {
  node_id: string;
  name?: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  fills?: Array<{ r: number; g: number; b: number }>;
  text?: string;
  font_size?: number;
  visible?: boolean;
  opacity?: number;
  corner_radius?: number;
}): Promise<unknown> {
  var node = figma.getNodeById(args.node_id);
  if (!node) {
    return { error: "Node not found with ID: " + args.node_id };
  }

  var sceneNode = node as SceneNode;

  if (args.name !== undefined) {
    sceneNode.name = args.name;
  }
  if (args.visible !== undefined) {
    sceneNode.visible = args.visible;
  }
  if (args.opacity !== undefined && "opacity" in sceneNode) {
    (sceneNode as any).opacity = args.opacity;
  }
  if (args.x !== undefined && "x" in sceneNode) {
    sceneNode.x = args.x;
  }
  if (args.y !== undefined && "y" in sceneNode) {
    sceneNode.y = args.y;
  }
  if (args.width !== undefined && args.height !== undefined && "resize" in sceneNode) {
    (sceneNode as any).resize(args.width, args.height);
  } else if (args.width !== undefined && "resize" in sceneNode) {
    (sceneNode as any).resize(args.width, (sceneNode as any).height);
  } else if (args.height !== undefined && "resize" in sceneNode) {
    (sceneNode as any).resize((sceneNode as any).width, args.height);
  }

  if (args.fills && "fills" in sceneNode) {
    (sceneNode as GeometryMixin).fills = toFigmaFills(args.fills);
  }

  if (args.corner_radius !== undefined && "cornerRadius" in sceneNode) {
    (sceneNode as any).cornerRadius = args.corner_radius;
  }

  // Text-specific updates
  if (node.type === "TEXT") {
    var textNode = node as TextNode;
    if (args.text !== undefined || args.font_size !== undefined) {
      var fontName = textNode.fontName;
      var family = "Inter";
      var style = "Regular";
      if (fontName !== figma.mixed) {
        family = fontName.family;
        style = fontName.style;
      }
      await figma.loadFontAsync({ family: family, style: style });

      if (args.text !== undefined) {
        textNode.characters = args.text;
      }
      if (args.font_size !== undefined) {
        textNode.fontSize = args.font_size;
      }
    }
  }

  return {
    id: node.id,
    name: node.name,
    type: node.type,
    message: "Node updated successfully",
  };
}

export function deleteNode(args: { node_id: string }): unknown {
  var node = figma.getNodeById(args.node_id);
  if (!node) {
    return { error: "Node not found with ID: " + args.node_id };
  }

  var name = node.name;
  (node as SceneNode).remove();

  return { message: "Deleted node: " + name };
}

export function moveNode(args: {
  node_id: string;
  x?: number;
  y?: number;
  parent_id?: string;
}): unknown {
  var node = figma.getNodeById(args.node_id);
  if (!node) {
    return { error: "Node not found with ID: " + args.node_id };
  }

  var sceneNode = node as SceneNode;

  if (args.parent_id) {
    var parent = figma.getNodeById(args.parent_id);
    if (!parent) {
      return { error: "Parent node not found with ID: " + args.parent_id };
    }
    if (!("appendChild" in parent)) {
      return { error: "Target parent cannot contain children" };
    }
    (parent as ChildrenMixin).appendChild(sceneNode);
  }

  if (args.x !== undefined) {
    sceneNode.x = args.x;
  }
  if (args.y !== undefined) {
    sceneNode.y = args.y;
  }

  return {
    id: sceneNode.id,
    name: sceneNode.name,
    x: sceneNode.x,
    y: sceneNode.y,
    message: "Node moved successfully",
  };
}
