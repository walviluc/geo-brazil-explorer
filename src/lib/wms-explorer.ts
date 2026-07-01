import { DEFAULT_SOURCE } from './data-sources';

export const WMS_BASE_URL = DEFAULT_SOURCE.url;

export interface Layer {
  name: string;
  title: string;
  abstract: string;
  bbox: BoundingBox | null;
  /** WMS/OWS base URL this layer originates from. */
  sourceUrl: string;
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

export const FREE_LAYERS = [
  "TI_UC_BR:unidade_conservacao_federal",
  "CAR_USO_RESTRITO:car_uso_restrito"
];

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

const PROXIES = [
  (url: string) =>
    `${SUPABASE_URL}/functions/v1/geoserver-proxy?url=${encodeURIComponent(url)}`,
  (url: string) => `https://corsproxy.io/?${encodeURIComponent(url)}`,
  (url: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
];

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
      if (response.ok) return response;
      lastStatus = response.status;
    } catch {
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

export async function fetchLayers(sourceUrl: string = DEFAULT_SOURCE.url): Promise<Layer[]> {
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
    
    if (name && bbox && !/CAR_HIDROGRAFIA/i.test(name)) {
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
    const uf = getUF(layer.name) || getUF(layer.title) || 'OUTROS';
    if (!groups.has(uf)) groups.set(uf, []);
    groups.get(uf)!.push(layer);
  });
  
  return groups;
}

export function isLayerFree(layerName: string): boolean {
  return FREE_LAYERS.some(freeLayer => 
    layerName.toLowerCase().includes(freeLayer.toLowerCase().split(':')[1])
  );
}

export type PlanType = 'gratuito' | 'profissional' | 'completo' | null;

export function canAccessLayer(layerName: string, userPlan: PlanType): boolean {
  // User must be logged in to access any layer
  if (userPlan === null) return false;
  
  // Free layers accessible to all logged-in users
  if (isLayerFree(layerName)) return true;
  
  // Completo plan has access to everything
  if (userPlan === 'completo') return true;
  
  // Profissional plan has access to most layers except premium
  if (userPlan === 'profissional') return true;
  
  // Gratuito only has access to free layers
  return false;
}
