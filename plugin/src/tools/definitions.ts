// Tool definitions for Claude tool-use API
// These schemas tell Claude what tools are available and how to call them.
// This file is imported by the UI (ES2020) and sent with API requests.

export const TOOL_DEFINITIONS = [
  // ── Reading tools ──
  {
    name: "get_document_structure",
    description:
      "Returns the node tree of the current Figma page, including names, types, positions, and sizes. Use this to understand what exists on the page before making changes.",
    input_schema: {
      type: "object" as const,
      properties: {},
      required: [],
    },
  },
  {
    name: "get_node_properties",
    description:
      "Returns detailed properties of a specific node by ID, including fills, strokes, text content, font info, effects, and constraints.",
    input_schema: {
      type: "object" as const,
      properties: {
        node_id: {
          type: "string",
          description: "The ID of the node to inspect",
        },
      },
      required: ["node_id"],
    },
  },
  {
    name: "get_selection",
    description:
      "Returns the currently selected nodes in Figma. Use this when the user says 'this', 'these', or 'the selected element'.",
    input_schema: {
      type: "object" as const,
      properties: {},
      required: [],
    },
  },

  // ── Creation tools ──
  {
    name: "create_frame",
    description:
      "Creates a new frame (container) on the current page. Frames can contain other elements and support auto-layout.",
    input_schema: {
      type: "object" as const,
      properties: {
        name: { type: "string", description: "Name for the frame" },
        x: { type: "number", description: "X position" },
        y: { type: "number", description: "Y position" },
        width: { type: "number", description: "Width in pixels" },
        height: { type: "number", description: "Height in pixels" },
        fills: {
          type: "array",
          description:
            "Array of fill colors, e.g. [{r: 1, g: 0, b: 0}] for red. Values 0-1.",
          items: {
            type: "object",
            properties: {
              r: { type: "number" },
              g: { type: "number" },
              b: { type: "number" },
            },
          },
        },
        auto_layout: {
          type: "object",
          description: "Auto-layout settings",
          properties: {
            direction: {
              type: "string",
              enum: ["HORIZONTAL", "VERTICAL"],
            },
            spacing: { type: "number", description: "Gap between items" },
            padding: { type: "number", description: "Padding on all sides" },
          },
        },
      },
      required: ["name", "x", "y", "width", "height"],
    },
  },
  {
    name: "create_text",
    description:
      "Creates a text node on the current page. Always loads the font before setting text.",
    input_schema: {
      type: "object" as const,
      properties: {
        text: { type: "string", description: "The text content" },
        x: { type: "number", description: "X position" },
        y: { type: "number", description: "Y position" },
        font_size: { type: "number", description: "Font size in pixels" },
        font_family: {
          type: "string",
          description: "Font family name, defaults to 'Inter'",
        },
        font_weight: {
          type: "string",
          description:
            "Font weight/style, e.g. 'Regular', 'Bold', 'Medium'. Defaults to 'Regular'",
        },
        color: {
          type: "object",
          description: "Text color as {r, g, b} with values 0-1",
          properties: {
            r: { type: "number" },
            g: { type: "number" },
            b: { type: "number" },
          },
        },
      },
      required: ["text", "x", "y", "font_size"],
    },
  },
  {
    name: "create_rectangle",
    description: "Creates a rectangle on the current page.",
    input_schema: {
      type: "object" as const,
      properties: {
        x: { type: "number", description: "X position" },
        y: { type: "number", description: "Y position" },
        width: { type: "number", description: "Width in pixels" },
        height: { type: "number", description: "Height in pixels" },
        fills: {
          type: "array",
          description:
            "Array of fill colors, e.g. [{r: 0, g: 0, b: 1}] for blue. Values 0-1.",
          items: {
            type: "object",
            properties: {
              r: { type: "number" },
              g: { type: "number" },
              b: { type: "number" },
            },
          },
        },
        corner_radius: {
          type: "number",
          description: "Corner radius for rounded rectangles",
        },
        name: { type: "string", description: "Name for the rectangle" },
      },
      required: ["x", "y", "width", "height"],
    },
  },

  // ── Modification tools ──
  {
    name: "update_node",
    description:
      "Updates properties of an existing node. Only provide the fields you want to change.",
    input_schema: {
      type: "object" as const,
      properties: {
        node_id: { type: "string", description: "The ID of the node to update" },
        name: { type: "string", description: "New name for the node" },
        x: { type: "number", description: "New X position" },
        y: { type: "number", description: "New Y position" },
        width: { type: "number", description: "New width" },
        height: { type: "number", description: "New height" },
        fills: {
          type: "array",
          description: "New fill colors as [{r, g, b}] with values 0-1",
          items: {
            type: "object",
            properties: {
              r: { type: "number" },
              g: { type: "number" },
              b: { type: "number" },
            },
          },
        },
        text: {
          type: "string",
          description: "New text content (only for text nodes)",
        },
        font_size: {
          type: "number",
          description: "New font size (only for text nodes)",
        },
        visible: { type: "boolean", description: "Show or hide the node" },
        opacity: {
          type: "number",
          description: "Opacity from 0 to 1",
        },
        corner_radius: {
          type: "number",
          description: "Corner radius for rectangles/frames",
        },
      },
      required: ["node_id"],
    },
  },
  {
    name: "delete_node",
    description: "Deletes a node from the document by its ID.",
    input_schema: {
      type: "object" as const,
      properties: {
        node_id: {
          type: "string",
          description: "The ID of the node to delete",
        },
      },
      required: ["node_id"],
    },
  },
  {
    name: "move_node",
    description:
      "Moves a node to a new position, or reparents it under a different frame.",
    input_schema: {
      type: "object" as const,
      properties: {
        node_id: {
          type: "string",
          description: "The ID of the node to move",
        },
        x: { type: "number", description: "New X position" },
        y: { type: "number", description: "New Y position" },
        parent_id: {
          type: "string",
          description:
            "ID of the new parent frame. If provided, the node is reparented.",
        },
      },
      required: ["node_id"],
    },
  },
];
