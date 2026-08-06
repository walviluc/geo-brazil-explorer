// Proxy for public Brazilian GeoServer/OGC endpoints to avoid CORS.
// Hosts curated from the INDE catalog (https://inde.gov.br/api/catalogo/get).
const ALLOWED_HOSTS = [
  "portalmaps.com.br",
  "geoservicos.ibge.gov.br",
  "geoservicoscenso2022.ibge.gov.br",
  "terrabrasilis.dpi.inpe.br",
  "geoservicos.inde.gov.br",
  "gishub.anp.gov.br",
  "geoservicos.sgb.gov.br",
  "geoinfo.dados.embrapa.br",
  "sistemas.florestal.gov.br",
  "sistemas.anatel.gov.br",
  "geoserver.iphan.gov.br",
];

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
    let allowed = [...ALLOWED_HOSTS];

    // Hosts registered by admins in public_data_sources (enabled only).
    try {
      const sbUrl = Deno.env.get("SUPABASE_URL");
      const sbKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
      if (sbUrl && sbKey) {
        const res = await fetch(
          `${sbUrl}/rest/v1/public_data_sources?select=url&enabled=eq.true`,
          { headers: { apikey: sbKey, Authorization: `Bearer ${sbKey}` } },
        );
        if (res.ok) {
          const rows = (await res.json()) as Array<{ url: string }>;
          for (const r of rows) {
            try { allowed.push(new URL(r.url).hostname); } catch { /* ignore */ }
          }
        }
      }
    } catch { /* fall back to static allowlist */ }

    const hostAllowed = allowed.some(
      (host) => parsed.hostname === host || parsed.hostname.endsWith(`.${host}`),
    );
    if (!hostAllowed) {
      return new Response(`Host not allowed: ${parsed.hostname}`, {
        status: 403,
        headers: corsHeaders,
      });
    }

    const upstream = await fetch(parsed.toString(), {
      headers: { Accept: req.headers.get("accept") || "*/*" },
    });

    // Upstream 4xx = the GeoServer rejected the request (e.g. layer has no
    // WFS published). Return 200 + JSON envelope so the browser and Lovable
    // runtime don't flag it as an edge-function error.
    if (upstream.status >= 400 && upstream.status < 500) {
      const text = await upstream.text();
      const match = text.match(/<ows:ExceptionText[^>]*>([\s\S]*?)<\/ows:ExceptionText>/i);
      const detail = match?.[1]?.trim();
      return new Response(
        JSON.stringify({
          __proxyError: true,
          upstreamStatus: upstream.status,
          message:
            detail && detail !== "(details omitted)"
              ? `O servidor rejeitou a requisição: ${detail}`
              : "Esta camada não está disponível para download nesta fonte (WFS não publicado ou camada inválida no servidor de origem).",
        }),
        { status: 200, headers: { ...corsHeaders, "content-type": "application/json" } },
      );
    }

    const body = await upstream.arrayBuffer();
    const headers = new Headers(corsHeaders);
    const ct = upstream.headers.get("content-type");
    if (ct) headers.set("content-type", ct);
    return new Response(body, { status: upstream.status, headers });
  } catch (e) {
    return new Response(`Proxy error: ${(e as Error).message}`, { status: 500, headers: corsHeaders });
  }
});