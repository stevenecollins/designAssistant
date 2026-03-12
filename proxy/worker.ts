// Cloudflare Worker - Claude API Proxy
// Handles CORS for Figma plugin iframe and relays requests to the Anthropic API.
// The API key is stored as a Cloudflare secret (not in code).

export interface Env {
  ANTHROPIC_API_KEY: string;
}

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    // Handle CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    // Health check
    if (request.method === "GET") {
      return new Response(
        JSON.stringify({ status: "ok", service: "design-assistant-proxy" }),
        { status: 200, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
      );
    }

    // Only accept POST for API relay
    if (request.method !== "POST") {
      return new Response("Method not allowed", { status: 405, headers: CORS_HEADERS });
    }

    // Validate API key
    if (!env.ANTHROPIC_API_KEY) {
      return new Response(
        JSON.stringify({ error: "ANTHROPIC_API_KEY not configured" }),
        { status: 500, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
      );
    }

    // Parse request body
    let body: { messages: Array<{ role: string; content: unknown }>; system?: string; tools?: unknown[]; stream?: boolean; max_tokens?: number };
    try {
      body = await request.json();
    } catch {
      return new Response(
        JSON.stringify({ error: "Invalid JSON body" }),
        { status: 400, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
      );
    }

    if (!body.messages || !Array.isArray(body.messages)) {
      return new Response(
        JSON.stringify({ error: "messages array is required" }),
        { status: 400, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
      );
    }

    // Forward to Anthropic API
    const useStream = body.stream !== undefined ? body.stream : true;
    const maxTokens = Math.min(body.max_tokens || 4096, 16384);
    const anthropicBody: Record<string, unknown> = {
      model: "claude-sonnet-4-20250514",
      max_tokens: maxTokens,
      stream: useStream,
      messages: body.messages,
    };
    if (body.system) {
      anthropicBody.system = body.system;
    }
    if (body.tools) {
      anthropicBody.tools = body.tools;
    }

    const anthropicResponse = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify(anthropicBody),
    });

    // If Anthropic returns an error, forward it
    if (!anthropicResponse.ok) {
      const errorText = await anthropicResponse.text();
      return new Response(
        JSON.stringify({ error: "Anthropic API error", status: anthropicResponse.status, detail: errorText }),
        { status: anthropicResponse.status, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
      );
    }

    // Pipe the response back to the client
    return new Response(anthropicResponse.body, {
      status: 200,
      headers: {
        ...CORS_HEADERS,
        "Content-Type": useStream ? "text/event-stream" : "application/json",
        "Cache-Control": "no-cache",
      },
    });
  },
};
