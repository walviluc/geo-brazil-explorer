// Edge function: list and serve internal/premium geographic data sources.
// - action=list  -> returns metadata rows the caller can access (RLS enforced).
// - action=get&id=<uuid> -> returns { geojson } after downloading the file
//   from the private `custom-geodata` bucket. Shapefile .zip files are
//   converted to GeoJSON with shpjs.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
// Pin to shpjs 4.x — v6 has a broken `but-unzip` re-export on esm.sh/denonext
// that crashes the edge-runtime worker at boot.
import shp from "https://esm.sh/shpjs@4.0.4";

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

type Format = "geojson" | "kml" | "shapefile";

function escapeXml(s: string): string {
  return String(s).replace(/[<>&'"]/g, (c) => (
    { "<": "&lt;", ">": "&gt;", "&": "amp;".replace("amp", "&amp"), "'": "&apos;", '"': "&quot;" } as Record<string, string>
  )[c] || c);
}

// Minimal GeoJSON -> KML converter (Point/LineString/Polygon + Multi variants).
function geojsonToKml(geojson: any, docName = "Layer"): string {
  const coordStr = (c: number[]) => `${c[0]},${c[1]}${c[2] !== undefined ? "," + c[2] : ""}`;
  const ring = (r: number[][]) => r.map(coordStr).join(" ");

  function geom(g: any): string {
    if (!g) return "";
    switch (g.type) {
      case "Point": return `<Point><coordinates>${coordStr(g.coordinates)}</coordinates></Point>`;
      case "MultiPoint": return `<MultiGeometry>${g.coordinates.map((c: number[]) => `<Point><coordinates>${coordStr(c)}</coordinates></Point>`).join("")}</MultiGeometry>`;
      case "LineString": return `<LineString><coordinates>${ring(g.coordinates)}</coordinates></LineString>`;
      case "MultiLineString": return `<MultiGeometry>${g.coordinates.map((l: number[][]) => `<LineString><coordinates>${ring(l)}</coordinates></LineString>`).join("")}</MultiGeometry>`;
      case "Polygon": {
        const [outer, ...holes] = g.coordinates;
        return `<Polygon><outerBoundaryIs><LinearRing><coordinates>${ring(outer)}</coordinates></LinearRing></outerBoundaryIs>${holes.map((h: number[][]) => `<innerBoundaryIs><LinearRing><coordinates>${ring(h)}</coordinates></LinearRing></innerBoundaryIs>`).join("")}</Polygon>`;
      }
      case "MultiPolygon":
        return `<MultiGeometry>${g.coordinates.map((p: number[][][]) => geom({ type: "Polygon", coordinates: p })).join("")}</MultiGeometry>`;
      case "GeometryCollection":
        return `<MultiGeometry>${(g.geometries || []).map(geom).join("")}</MultiGeometry>`;
      default: return "";
    }
  }

  const features = (geojson?.features ?? []) as any[];
  const placemarks = features.map((f, i) => {
    const props = f.properties || {};
    const name = escapeXml(props.name || props.NOME || props.nome || `Feature ${i + 1}`);
    const extended = Object.entries(props)
      .map(([k, v]) => `<Data name="${escapeXml(k)}"><value>${escapeXml(v == null ? "" : String(v))}</value></Data>`)
      .join("");
    return `<Placemark><name>${name}</name><ExtendedData>${extended}</ExtendedData>${geom(f.geometry)}</Placemark>`;
  }).join("");

  return `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
<Document><name>${escapeXml(docName)}</name>${placemarks}</Document>
</kml>`;
}

async function encodeBase64(buf: ArrayBuffer): Promise<string> {
  // btoa handles latin1 only; go via chunks to avoid stack overflow.
  const bytes = new Uint8Array(buf);
  let bin = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    bin += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(bin);
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

    const { action, id, format } = await req.json().catch(() => ({}));

    if (action === "list") {
      const { data, error } = await supabase
        .from("custom_data_sources")
        .select("id, name, description, uf, layer_name, required_plan, file_format, geojson_premium, kml_premium, shapefile_premium")
        .order("uf", { ascending: true })
        .order("name", { ascending: true });
      if (error) return json({ error: error.message }, 400);
      return json({ items: data ?? [] });
    }

    if (action === "get") {
      if (!id || typeof id !== "string") return json({ error: "id obrigatório." }, 400);
      const fmt: Format = (format === "kml" || format === "shapefile") ? format : "geojson";

      const { data: row, error: rowErr } = await supabase
        .from("custom_data_sources")
        .select("storage_path, file_format, name, geojson_premium, kml_premium, shapefile_premium")
        .eq("id", id)
        .maybeSingle();
      if (rowErr) return json({ error: rowErr.message }, 400);
      if (!row) return json({ error: "Fonte não encontrada ou acesso negado." }, 404);

      // Per-format premium enforcement.
      const isPremiumFormat =
        (fmt === "geojson" && row.geojson_premium) ||
        (fmt === "kml" && row.kml_premium) ||
        (fmt === "shapefile" && row.shapefile_premium);

      if (isPremiumFormat) {
        const { data: authData } = await supabase.auth.getUser();
        const uid = authData?.user?.id;
        if (!uid) return json({ error: "Não autenticado." }, 401);
        const [{ data: isPremium }, { data: isAdmin }] = await Promise.all([
          supabase.rpc("has_premium_plan", { _user_id: uid }),
          supabase.rpc("has_role", { _user_id: uid, _role: "admin" }),
        ]);
        if (!isPremium && !isAdmin) {
          return json({ error: "Formato disponível apenas para planos Profissional ou Completo.", code: "premium_required" }, 403);
        }
      }

      const { data: fileBlob, error: dlErr } = await supabase
        .storage.from("custom-geodata").download(row.storage_path);
      if (dlErr || !fileBlob) {
        return json({ error: dlErr?.message || "Falha ao baixar arquivo." }, 400);
      }

      const buf = await fileBlob.arrayBuffer();

      // Shapefile passthrough: only when the stored file is already a shapefile zip.
      if (fmt === "shapefile") {
        if (row.file_format !== "shapefile") {
          return json({ error: "Este dado não está disponível em formato Shapefile." }, 415);
        }
        const base64 = await encodeBase64(buf);
        return json({ format: "shapefile", filename: `${row.name}.zip`, base64, mime: "application/zip" });
      }

      // Load as GeoJSON (converting from shapefile when needed).
      let geojson: any;
      if (row.file_format === "shapefile") {
        geojson = await shp(buf);
      } else {
        geojson = JSON.parse(new TextDecoder().decode(buf));
      }

      if (fmt === "kml") {
        const kml = geojsonToKml(geojson, row.name);
        return json({ format: "kml", filename: `${row.name}.kml`, kml, mime: "application/vnd.google-earth.kml+xml" });
      }

      return json({ format: "geojson", filename: `${row.name}.geojson`, geojson, mime: "application/geo+json" });
    }

    return json({ error: "Ação desconhecida." }, 400);
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});