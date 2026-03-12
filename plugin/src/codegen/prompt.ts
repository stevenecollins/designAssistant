// Code generation prompt builder — runs in the UI (ES2020)
// Builds the Claude prompt that converts Figma frame data into React + Tailwind code.

export interface FrameExportData {
  frameData: unknown;
  imageBase64: string;
  width: number;
  height: number;
}

const CODEGEN_SYSTEM_PROMPT = `You are a React code generator. You convert Figma design data into a working React + Tailwind CSS web application.

RULES:
- Generate TypeScript React components (.tsx files)
- Use Tailwind CSS utility classes for all styling — no inline styles, no CSS files
- Match the Figma design as closely as possible (colors, spacing, font sizes, layout)
- Convert Figma auto-layout to flex/grid in Tailwind
- Convert Figma fills to Tailwind bg-[color] using arbitrary values like bg-[#hexcolor]
- Convert Figma text to appropriate Tailwind text sizes and font weights
- Make interactive elements work: buttons should have hover states, form inputs should be controlled, navigation links should route between pages
- Use React Router (react-router-dom) for navigation between pages
- Each frame becomes a page component

OUTPUT FORMAT:
You MUST output a single JSON object wrapped in a code block like this:

\`\`\`json
{
  "files": [
    { "path": "src/App.tsx", "content": "..." },
    { "path": "src/pages/PageName.tsx", "content": "..." }
  ]
}
\`\`\`

REQUIRED FILES:
- src/App.tsx — imports all pages and sets up React Router routes
- src/pages/*.tsx — one file per frame/screen

Do NOT generate package.json, vite.config.ts, index.html, main.tsx, or index.css — those are provided.
Do NOT use any external libraries besides react, react-dom, and react-router-dom.`;

export function buildCodeGenPrompt(
  frames: FrameExportData[],
  conversationSummary: string
): { system: string; userContent: unknown[] } {
  const userContent: unknown[] = [];

  // Add conversation context
  userContent.push({
    type: "text",
    text: `The designer's intent from the conversation:\n${conversationSummary}\n\nBelow are the Figma frames to convert. Each frame has a JSON structure describing the node tree and a screenshot for visual reference.`,
  });

  // Add each frame's data and image
  for (let i = 0; i < frames.length; i++) {
    const frame = frames[i];
    const frameName = (frame.frameData as any)?.name || `Frame ${i + 1}`;

    userContent.push({
      type: "text",
      text: `\n--- Frame ${i + 1}: "${frameName}" (${frame.width}x${frame.height}) ---\nNode tree:\n${JSON.stringify(frame.frameData, null, 2)}`,
    });

    // Add the screenshot as an image content block
    if (frame.imageBase64) {
      userContent.push({
        type: "image",
        source: {
          type: "base64",
          media_type: "image/png",
          data: frame.imageBase64,
        },
      });
    }
  }

  userContent.push({
    type: "text",
    text: "Generate the React + Tailwind code for these frames. Remember to output ONLY the JSON object with the files array, wrapped in a ```json code block.",
  });

  return {
    system: CODEGEN_SYSTEM_PROMPT,
    userContent,
  };
}
