// Proxy for portalmaps.com.br GeoServer to avoid CORS
const ALLOWED_HOST = "portalmaps.com.br";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    const target = url.searchParams.get("url");
    if (!target) return new Response("Missing url", { status: 400, headers: corsHeaders });

    const parsed = new URL(target);
    if (!parsed.hostname.endsWith(ALLOWED_HOST)) {
      return new Response("Host not allowed", { status: 403, headers: corsHeaders });
    }

    const upstream = await fetch(parsed.toString(), {
      headers: { Accept: req.headers.get("accept") || "*/*" },
    });

    const body = await upstream.arrayBuffer();
    const headers = new Headers(corsHeaders);
    const ct = upstream.headers.get("content-type");
    if (ct) headers.set("content-type", ct);
    return new Response(body, { status: upstream.status, headers });
  } catch (e) {
    return new Response(`Proxy error: ${(e as Error).message}`, { status: 500, headers: corsHeaders });
  }
});