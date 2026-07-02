// Edge function: list and serve internal/premium geographic data sources.
// - action=list  -> returns metadata rows the caller can access (RLS enforced).
// - action=get&id=<uuid> -> returns { geojson } after downloading the file
//   from the private `custom-geodata` bucket. Shapefile .zip files are
//   converted to GeoJSON with shpjs.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import shp from "https://esm.sh/shpjs@6.1.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
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

    const { action, id } = await req.json().catch(() => ({}));

    if (action === "list") {
      const { data, error } = await supabase
        .from("custom_data_sources")
        .select("id, name, description, uf, layer_name, required_plan, file_format")
        .order("uf", { ascending: true })
        .order("name", { ascending: true });
      if (error) return json({ error: error.message }, 400);
      return json({ items: data ?? [] });
    }

    if (action === "get") {
      if (!id || typeof id !== "string") return json({ error: "id obrigatório." }, 400);

      const { data: row, error: rowErr } = await supabase
        .from("custom_data_sources")
        .select("storage_path, file_format, name")
        .eq("id", id)
        .maybeSingle();
      if (rowErr) return json({ error: rowErr.message }, 400);
      if (!row) return json({ error: "Fonte não encontrada ou acesso negado." }, 404);

      const { data: fileBlob, error: dlErr } = await supabase
        .storage.from("custom-geodata").download(row.storage_path);
      if (dlErr || !fileBlob) {
        return json({ error: dlErr?.message || "Falha ao baixar arquivo." }, 400);
      }

      if (row.file_format === "shapefile") {
        const buf = await fileBlob.arrayBuffer();
        const geojson = await shp(buf);
        return json({ geojson });
      }

      const text = await fileBlob.text();
      const geojson = JSON.parse(text);
      return json({ geojson });
    }

    return json({ error: "Ação desconhecida." }, 400);
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});