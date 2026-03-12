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

    // Relay to Anthropic API (to be implemented in Phase 1)
    return new Response(
      JSON.stringify({ message: "Proxy ready. Claude API relay coming in Phase 1." }),
      { status: 200, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
    );
  },
};
