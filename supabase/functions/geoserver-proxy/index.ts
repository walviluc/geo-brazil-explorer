// Proxy for public Brazilian GeoServer/OGC endpoints to avoid CORS.
// Hosts curated from the INDE catalog (https://inde.gov.br/api/catalogo/get).
const ALLOWED_HOSTS = [
  "portalmaps.com.br",
  "geoservicos.ibge.gov.br",
  "geoservicoscenso2022.ibge.gov.br",
  "terrabrasilis.dpi.inpe.br",
  "siscom.ibama.gov.br",
  "geoservicos.inde.gov.br",
  "geoserver.funai.gov.br",
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
    const hostAllowed = ALLOWED_HOSTS.some(
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

    const body = await upstream.arrayBuffer();
    const headers = new Headers(corsHeaders);
    const ct = upstream.headers.get("content-type");
    if (ct) headers.set("content-type", ct);
    return new Response(body, { status: upstream.status, headers });
  } catch (e) {
    return new Response(`Proxy error: ${(e as Error).message}`, { status: 500, headers: corsHeaders });
  }
});