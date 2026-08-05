import { DEFAULT_SOURCE, INTERNAL_SOURCE_URL } from './data-sources';
import { supabase } from '@/integrations/supabase/client';

export const WMS_BASE_URL = DEFAULT_SOURCE.url;

export interface Layer {
  name: string;
  title: string;
  abstract: string;
  bbox: BoundingBox | null;
  /** WMS/OWS base URL this layer originates from. */
  sourceUrl: string;
  /** Per-format premium flags (only meaningful for internal catalog). */
  premiumFormats?: { geojson: boolean; kml: boolean; shapefile: boolean };
  /** Stored file format for internal sources (drives shapefile availability). */
  storedFormat?: "geojson" | "shapefile";
  /** Explicit UF assigned by the source (internal catalog). */
  uf?: string | null;
}

export interface BoundingBox {
  minx: number;
  miny: number;
  maxx: number;
  maxy: number;
}

export const UF_NAMES: Record<string, string> = {
  AC: "Acre",
  AL: "Alagoas",
  AP: "Amapá",
  AM: "Amazonas",
  BA: "Bahia",
  CE: "Ceará",
  DF: "Distrito Federal",
  ES: "Espírito Santo",
  GO: "Goiás",
  MA: "Maranhão",
  MT: "Mato Grosso",
  MS: "Mato Grosso do Sul",
  MG: "Minas Gerais",
  PA: "Pará",
  PB: "Paraíba",
  PR: "Paraná",
  PE: "Pernambuco",
  PI: "Piauí",
  RJ: "Rio de Janeiro",
  RN: "Rio Grande do Norte",
  RS: "Rio Grande do Sul",
  RO: "Rondônia",
  RR: "Roraima",
  SC: "Santa Catarina",
  SP: "São Paulo",
  SE: "Sergipe",
  TO: "Tocantins"
};

/** A layer is premium (paid) only when it comes from an internal/managed
 *  source. All external public official sources (IBGE, INPE, IBAMA, etc.)
 *  are free for any authenticated user. */
export function isPremiumSource(sourceUrl: string | undefined | null): boolean {
  return !!sourceUrl && sourceUrl.startsWith('internal://');
}

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

const PROXIES = [
  (url: string) =>
    `${SUPABASE_URL}/functions/v1/geoserver-proxy?url=${encodeURIComponent(url)}`,
  (url: string) => `https://corsproxy.io/?${encodeURIComponent(url)}`,
  (url: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
];

class UpstreamError extends Error {}

async function fetchWithProxy(url: string, options?: RequestInit): Promise<Response> {
  let lastStatus: number | null = null;
  for (let i = 0; i < PROXIES.length; i++) {
    try {
      const proxyUrl = PROXIES[i](url);
      const init: RequestInit = { ...options };
      if (i === 0) {
        init.headers = {
          ...(options?.headers || {}),
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        };
      }
      const response = await fetch(proxyUrl, init);
      if (response.ok) {
        // Edge function returns 200 + JSON envelope for upstream 4xx errors
        // to avoid tripping the runtime error interceptor. Detect and throw.
        if (i === 0) {
          const ct = response.headers.get("content-type") || "";
          if (ct.includes("application/json")) {
            const cloned = response.clone();
            try {
              const data = await cloned.json();
              if (data && data.__proxyError) {
                throw new UpstreamError(data.message || "Camada indisponível.");
              }
            } catch (e) {
              if (e instanceof UpstreamError) throw e;
              // Not JSON we care about — fall through and return original response.
            }
          }
        }
        return response;
      }
      lastStatus = response.status;
      // 4xx = the upstream GeoServer rejected the request (invalid layer,
      // WFS not published, etc). Fallback proxies can't fix that — surface
      // a clear message and stop trying.
      if (response.status >= 400 && response.status < 500) {
        const body = await response.text().catch(() => '');
        const match = body.match(/<ows:ExceptionText[^>]*>([\s\S]*?)<\/ows:ExceptionText>/i);
        const detail = match?.[1]?.trim();
        throw new UpstreamError(
          detail && detail !== '(details omitted)'
            ? `O servidor rejeitou a requisição: ${detail}`
            : 'Esta camada não está disponível para download nesta fonte (WFS não publicado ou camada inválida no servidor de origem).'
        );
      }
    } catch (err) {
      if (err instanceof UpstreamError) throw err;
      continue;
    }
  }
  throw new Error(
    lastStatus === 500 || lastStatus === 502 || lastStatus === 504
      ? 'O servidor de dados está indisponível no momento. Tente outra fonte ou tente novamente mais tarde.'
      : 'Não foi possível acessar o servidor de dados. Verifique sua conexão ou tente novamente mais tarde.'
  );
}

function parseBoundingBox(bboxElement: Element): BoundingBox | null {
  let bbox: BoundingBox;
  
  if (bboxElement.tagName === 'BoundingBox') {
    bbox = {
      minx: parseFloat(bboxElement.getAttribute('minx') || '0'),
      miny: parseFloat(bboxElement.getAttribute('miny') || '0'),
      maxx: parseFloat(bboxElement.getAttribute('maxx') || '0'),
      maxy: parseFloat(bboxElement.getAttribute('maxy') || '0')
    };
  } else {
    bbox = {
      minx: parseFloat(bboxElement.querySelector('westBoundLongitude')?.textContent || '0'),
      miny: parseFloat(bboxElement.querySelector('southBoundLatitude')?.textContent || '0'),
      maxx: parseFloat(bboxElement.querySelector('eastBoundLongitude')?.textContent || '0'),
      maxy: parseFloat(bboxElement.querySelector('northBoundLatitude')?.textContent || '0')
    };
  }
  
  return isBBoxGeographic(bbox) ? bbox : null;
}

function isBBoxGeographic(b: BoundingBox): boolean {
  const { minx, miny, maxx, maxy } = b;
  if (![minx, miny, maxx, maxy].every(v => Number.isFinite(v))) return false;
  if (!(minx < maxx && miny < maxy)) return false;
  return Math.abs(minx) <= 180 && Math.abs(maxx) <= 180 && Math.abs(miny) <= 90 && Math.abs(maxy) <= 90;
}

export function getUF(nameOrTitle: string): string | null {
  const s = nameOrTitle.toUpperCase();
  const m1 = s.match(/:UF[_\-.]?([A-Z]{2})/);
  if (m1) return m1[1];

  const m2 = s.match(/[_\-.]([A-Z]{2})(?:[_\-.]|$)/);
  if (m2 && UF_NAMES[m2[1]]) return m2[1];

  const m3 = s.match(/\b([A-Z]{2})\b/);
  if (m3 && UF_NAMES[m3[1]]) return m3[1];

  return null;
}

/** Keywords that identify raster/coverage layers (imagery, DEM, mosaics...).
 *  The portal only serves vector layers, so these are filtered out. */
const RASTER_PATTERNS = [
  /\braster(s)?\b/i,
  /\bcoverage(s)?\b/i,
  /\bgeotiff?\b/i,
  /\bwcs\b/i,
  /\bmosaic(o|os)?\b/i,
  /\bimage(m|ns|ry|s)?\b/i,
  /\bortofoto|orthophoto|ortoimagem\b/i,
  /\bsat[eé]lite|satellite\b/i,
  /\bland ?sat|sentinel|cbers|modis|rapideye|planet\b/i,
  /\bsrtm|topodata|\bmde\b|\bmdt\b|\bmnt\b|\bdem\b|\bdsm\b/i,
  /\bhillshade|sombreamento|declividade\b/i,
  /\bndvi|nbr|banda(s)?\b/i,
  /\bpixel|tif{1,2}\b/i,
];

export function isRasterLayer(input: {
  name?: string | null;
  title?: string | null;
  abstract?: string | null;
  keywords?: string[];
}): boolean {
  const kw = (input.keywords ?? []).map((k) => k.toLowerCase());
  if (kw.some((k) => ["wcs", "geotiff", "raster", "coverage", "imagemosaic"].includes(k))) {
    return true;
  }
  const haystack = [input.name, input.title, input.abstract].filter(Boolean).join(" ");
  return RASTER_PATTERNS.some((re) => re.test(haystack));
}

export async function fetchLayers(sourceUrl: string = DEFAULT_SOURCE.url): Promise<Layer[]> {
  // Internal (Lovable-managed) sources are served through an edge function.
  if (sourceUrl.startsWith('internal://')) {
    const { data, error } = await supabase.functions.invoke('custom-sources', {
      body: { action: 'list' },
    });
    if (error) throw new Error(error.message || 'Erro ao carregar fontes internas');
    if (data?.error) throw new Error(data.error);
    const items = (data?.items ?? []) as Array<{
      id: string; name: string; description: string | null; layer_name: string; uf: string | null;
      geojson_premium?: boolean; kml_premium?: boolean; shapefile_premium?: boolean;
      file_format?: "geojson" | "shapefile";
    }>;
    return items.map(it => ({
      name: it.layer_name || it.id,
      title: it.name,
      abstract: it.description || 'Fonte interna (arquivo local).',
      bbox: null,
      // Encode the source-record id so downstream calls can fetch its file.
      sourceUrl: `internal://custom-sources/${it.id}`,
      premiumFormats: {
        geojson: !!it.geojson_premium,
        kml: !!it.kml_premium,
        shapefile: !!it.shapefile_premium,
      },
      storedFormat: it.file_format ?? "geojson",
      uf: it.uf ? it.uf.toUpperCase() : null,
    }));
  }

  const url = `${sourceUrl}?service=WMS&version=1.3.0&request=GetCapabilities`;
  
  const response = await fetchWithProxy(url, {
    headers: { 'Accept': 'application/xml, text/xml, */*' }
  });
  
  const text = await response.text();
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(text, 'text/xml');
  
  const parseError = xmlDoc.querySelector('parsererror');
  if (parseError) throw new Error('Erro ao parsear XML');
  
  const layers: Layer[] = [];
  const layerElements = xmlDoc.querySelectorAll('Layer[queryable="1"]');
  
  layerElements.forEach(layer => {
    const name = layer.querySelector('Name')?.textContent;
    const title = layer.querySelector('Title')?.textContent || name;
    const abstract = layer.querySelector('Abstract')?.textContent || 'Sem descrição disponível';
    const bbox = layer.querySelector('BoundingBox, EX_GeographicBoundingBox');
    const keywords = Array.from(layer.querySelectorAll(':scope > KeywordList > Keyword'))
      .map((k) => k.textContent?.trim() || '')
      .filter(Boolean);
    
    if (
      name &&
      bbox &&
      !/CAR_HIDROGRAFIA/i.test(name) &&
      !isRasterLayer({ name, title, abstract, keywords })
    ) {
      layers.push({
        name: name,
        title: title || name,
        abstract,
        bbox: parseBoundingBox(bbox),
        sourceUrl,
      });
    }
  });
  
  return layers;
}

export const FEATURES_PER_PAGE = 100;

export type DownloadFormat = "geojson" | "kml" | "shapefile";

function geojsonToKml(geojson: any, docName = "Layer"): string {
  const esc = (s: unknown) =>
    String(s ?? "").replace(/[&<>'"]/g, (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&apos;", '"': "&quot;" }[c]!),
    );
  const coord = (c: number[]) => `${c[0]},${c[1]}${c[2] !== undefined ? "," + c[2] : ""}`;
  const ring = (r: number[][]) => r.map(coord).join(" ");
  const geom = (g: any): string => {
    if (!g) return "";
    switch (g.type) {
      case "Point": return `<Point><coordinates>${coord(g.coordinates)}</coordinates></Point>`;
      case "MultiPoint": return `<MultiGeometry>${g.coordinates.map((c: number[]) => `<Point><coordinates>${coord(c)}</coordinates></Point>`).join("")}</MultiGeometry>`;
      case "LineString": return `<LineString><coordinates>${ring(g.coordinates)}</coordinates></LineString>`;
      case "MultiLineString": return `<MultiGeometry>${g.coordinates.map((l: number[][]) => `<LineString><coordinates>${ring(l)}</coordinates></LineString>`).join("")}</MultiGeometry>`;
      case "Polygon": {
        const [outer, ...holes] = g.coordinates;
        return `<Polygon><outerBoundaryIs><LinearRing><coordinates>${ring(outer)}</coordinates></LinearRing></outerBoundaryIs>${holes.map((h: number[][]) => `<innerBoundaryIs><LinearRing><coordinates>${ring(h)}</coordinates></LinearRing></innerBoundaryIs>`).join("")}</Polygon>`;
      }
      case "MultiPolygon":
        return `<MultiGeometry>${g.coordinates.map((p: number[][][]) => geom({ type: "Polygon", coordinates: p })).join("")}</MultiGeometry>`;
      default: return "";
    }
  };
  const placemarks = (geojson?.features ?? []).map((f: any, i: number) => {
    const p = f.properties || {};
    const name = esc(p.name || p.NOME || p.nome || `Feature ${i + 1}`);
    const data = Object.entries(p)
      .map(([k, v]) => `<Data name="${esc(k)}"><value>${esc(v)}</value></Data>`).join("");
    return `<Placemark><name>${name}</name><ExtendedData>${data}</ExtendedData>${geom(f.geometry)}</Placemark>`;
  }).join("");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<kml xmlns="http://www.opengis.net/kml/2.2">\n<Document><name>${esc(docName)}</name>${placemarks}</Document>\n</kml>`;
}

function base64ToBlob(b64: string, mime: string): Blob {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

export class PremiumFormatError extends Error {
  constructor(message: string) { super(message); this.name = "PremiumFormatError"; }
}

/** Download a layer in a given format, returning a Blob + filename ready
 *  to trigger a browser save. Handles both internal (edge function) and
 *  external WMS/WFS sources.  */
export async function downloadLayerFile(
  layerName: string,
  sourceUrl: string,
  format: DownloadFormat,
): Promise<{ blob: Blob; filename: string }> {
  const safe = layerName.replace(/[^a-zA-Z0-9._-]/g, "_");

  if (sourceUrl.startsWith("internal://")) {
    const id = sourceUrl.split("/").pop() || "";
    const { data, error } = await supabase.functions.invoke("custom-sources", {
      body: { action: "get", id, format },
    });
    if (error) {
      // supabase.functions.invoke does not surface response body on non-2xx.
      // Best-effort: mark as premium error when hint is present.
      throw new Error(error.message || "Erro ao carregar camada interna");
    }
    if (data?.error) {
      if (data.code === "premium_required") throw new PremiumFormatError(data.error);
      throw new Error(data.error);
    }
    if (format === "shapefile") {
      const blob = base64ToBlob(data.base64, data.mime || "application/zip");
      return { blob, filename: data.filename || `${safe}.zip` };
    }
    if (format === "kml") {
      const blob = new Blob([data.kml], { type: data.mime || "application/vnd.google-earth.kml+xml" });
      return { blob, filename: data.filename || `${safe}.kml` };
    }
    const blob = new Blob([JSON.stringify(data.geojson, null, 2)], { type: "application/geo+json" });
    return { blob, filename: data.filename || `${safe}.geojson` };
  }

  // External WMS/WFS source: use WFS GetFeature with outputFormat.
  const outputFormat =
    format === "kml" ? "application/vnd.google-earth.kml+xml" :
    format === "shapefile" ? "SHAPE-ZIP" :
    "application/json";
  const url = `${sourceUrl}?service=WFS&version=2.0.0&request=GetFeature&typeName=${layerName}&outputFormat=${encodeURIComponent(outputFormat)}&srsName=EPSG:4326&count=${FEATURES_PER_PAGE}`;
  const response = await fetchWithProxy(url, { headers: { Accept: "*/*" } });

  if (format === "geojson") {
    const geo = await response.json();
    const wrapped = {
      metadata: { source: sourceUrl, layer: layerName, downloadedAt: new Date().toISOString() },
      geojson: geo,
    };
    return {
      blob: new Blob([JSON.stringify(wrapped, null, 2)], { type: "application/geo+json" }),
      filename: `${safe}.geojson`,
    };
  }
  if (format === "kml") {
    const text = await response.text();
    return {
      blob: new Blob([text], { type: "application/vnd.google-earth.kml+xml" }),
      filename: `${safe}.kml`,
    };
  }
  const buf = await response.arrayBuffer();
  return { blob: new Blob([buf], { type: "application/zip" }), filename: `${safe}.zip` };
}

export async function downloadLayerAsGeoJSON(
  layerName: string,
  sourceUrl: string = DEFAULT_SOURCE.url,
  startIndex: number = 0, 
  maxFeatures: number = FEATURES_PER_PAGE
): Promise<{
  metadata: {
    source: string;
    layer: string;
    downloadedAt: string;
    totalFeatures: number;
    startIndex: number;
    hasMore: boolean;
  };
  geojson: GeoJSON.FeatureCollection;
}> {
  // Internal source: fetch the stored file via edge function.
  if (sourceUrl.startsWith('internal://')) {
    const id = sourceUrl.split('/').pop() || '';
    const { data, error } = await supabase.functions.invoke('custom-sources', {
      body: { action: 'get', id },
    });
    if (error) throw new Error(error.message || 'Erro ao carregar camada interna');
    if (data?.error) throw new Error(data.error);
    const geojson = data.geojson as GeoJSON.FeatureCollection;
    const all = geojson.features || [];
    const slice = all.slice(startIndex, startIndex + maxFeatures);
    return {
      metadata: {
        source: `GeoData Brasil - Catálogo Interno`,
        layer: layerName,
        downloadedAt: new Date().toISOString(),
        totalFeatures: slice.length,
        startIndex,
        hasMore: startIndex + slice.length < all.length,
      },
      geojson: { type: 'FeatureCollection', features: slice },
    };
  }

  const url = `${sourceUrl}?service=WFS&version=2.0.0&request=GetFeature&typeName=${layerName}&outputFormat=application/json&srsName=EPSG:4326&startIndex=${startIndex}&count=${maxFeatures}`;
  
  const response = await fetchWithProxy(url, {
    headers: { 'Accept': 'application/json, application/geo+json, */*' }
  });
  
  const geoJSON = await response.json() as GeoJSON.FeatureCollection;
  const featuresCount = geoJSON.features?.length || 0;
  
  return {
    metadata: {
      source: `GeoData Brasil - ${sourceUrl}`,
      layer: layerName,
      downloadedAt: new Date().toISOString(),
      totalFeatures: featuresCount,
      startIndex,
      hasMore: featuresCount >= maxFeatures
    },
    geojson: geoJSON
  };
}

export function groupLayersByState(layers: Layer[]): Map<string, Layer[]> {
  const groups = new Map<string, Layer[]>();
  
  layers.forEach(layer => {
    const uf =
      (layer.uf && UF_NAMES[layer.uf.toUpperCase()] ? layer.uf.toUpperCase() : null) ||
      getUF(layer.name) ||
      getUF(layer.title) ||
      'OUTROS';
    if (!groups.has(uf)) groups.set(uf, []);
    groups.get(uf)!.push(layer);
  });
  
  return groups;
}

export type PlanType = 'gratuito' | 'profissional' | 'completo' | null;

/** Public official data (external WMS sources) is free for any logged-in
 *  user. Only the internal premium catalog requires a paid plan. */
export function canAccessLayer(sourceUrl: string, userPlan: PlanType): boolean {
  if (userPlan === null) return false;
  if (!isPremiumSource(sourceUrl)) return true;
  return userPlan === 'profissional' || userPlan === 'completo';
}
