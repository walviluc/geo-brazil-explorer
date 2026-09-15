// Edge function: proxy for GeoAPI (https://geoapi.com.br) territorial limits.
// The API key is server-side only (GEOAPI_KEY secret).
// Actions:
//  - { action: "list" }                       -> catalog of available layers
//  - { action: "get", kind, uf|region|code }  -> GeoJSON FeatureCollection

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

const API_BASE = "https://api.geoapi.com.br";

const UF_NAMES: Record<string, string> = {
  AC: "Acre", AL: "Alagoas", AP: "Amapá", AM: "Amazonas", BA: "Bahia",
  CE: "Ceará", DF: "Distrito Federal", ES: "Espírito Santo", GO: "Goiás",
  MA: "Maranhão", MT: "Mato Grosso", MS: "Mato Grosso do Sul", MG: "Minas Gerais",
  PA: "Pará", PB: "Paraíba", PR: "Paraná", PE: "Pernambuco", PI: "Piauí",
  RJ: "Rio de Janeiro", RN: "Rio Grande do Norte", RS: "Rio Grande do Sul",
  RO: "Rondônia", RR: "Roraima", SC: "Santa Catarina", SP: "São Paulo",
  SE: "Sergipe", TO: "Tocantins",
};

const REGIONS: Record<string, string> = {
  norte: "Norte",
  nordeste: "Nordeste",
  "centro-oeste": "Centro-Oeste",
  sudeste: "Sudeste",
  sul: "Sul",
};

function buildCatalog() {
  const items: Array<{
    id: string;
    name: string;
    description: string;
    uf: string | null;
    kind: string;
    param: string;
  }> = [];

  for (const [uf, name] of Object.entries(UF_NAMES)) {
    items.push({
      id: `estado-${uf}`,
      name: `Limite estadual — ${name} (${uf})`,
      description: `Contorno oficial do estado do ${name}, via GeoAPI (base IBGE).`,
      uf,
      kind: "estado",
      param: uf,
    });
    items.push({
      id: `municipios-${uf}`,
      name: `Municípios — ${name} (${uf})`,
      description: `Contornos de todos os municípios de ${name}, via GeoAPI (base IBGE).`,
      uf,
      kind: "municipios",
      param: uf,
    });
  }

  for (const [slug, name] of Object.entries(REGIONS)) {
    items.push({
      id: `regiao-${slug}`,
      name: `Região ${name} — contorno`,
      description: `Contorno da região ${name} do Brasil, via GeoAPI (base IBGE).`,
      uf: null,
      kind: "regiao",
      param: slug,
    });
  }

  return items;
}

async function fetchGeoApi(path: string) {
  const key = Deno.env.get("GEOAPI_KEY");
  if (!key) return { error: "GEOAPI_KEY não configurada.", status: 500 as number };

  const res = await fetch(`${API_BASE}${path}`, {
    headers: { Authorization: `Bearer ${key}`, Accept: "application/json" },
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    if (res.status === 401 || res.status === 403) {
      return { error: "Chave da GeoAPI inválida ou sem permissão para este recurso.", status: 502 };
    }
    return {
      error: `A GeoAPI recusou a requisição (HTTP ${res.status}). ${body.slice(0, 200)}`.trim(),
      status: 502,
    };
  }

  const data = await res.json().catch(() => null);
  if (!data) return { error: "Resposta inválida da GeoAPI.", status: 502 };
  return { data };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Não autenticado." }, 401);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: authData } = await supabase.auth.getUser();
    if (!authData?.user?.id) return json({ error: "Não autenticado." }, 401);

    const body = await req.json().catch(() => ({}));
    const action = body?.action;

    if (action === "list") {
      return json({ items: buildCatalog() });
    }

    if (action === "get") {
      const id = typeof body?.id === "string" ? body.id : "";
      const item = buildCatalog().find((i) => i.id === id);
      if (!item) return json({ error: "Camada desconhecida." }, 400);

      let path: string;
      if (item.kind === "estado") path = `/geo/states/${item.param}`;
      else if (item.kind === "municipios") path = `/geo/states/${item.param}/cities`;
      else path = `/geo/regions/${item.param}`;

      const result = await fetchGeoApi(path);
      if ("error" in result) return json({ error: result.error }, result.status);

      const geojson = result.data;
      if (!geojson || geojson.type !== "FeatureCollection") {
        return json({ error: "A GeoAPI não retornou dados geográficos válidos." }, 502);
      }
      return json({ geojson, name: item.name });
    }

    return json({ error: "Ação desconhecida." }, 400);
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
