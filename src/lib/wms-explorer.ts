export interface Layer {
  name: string;
  title: string;
  abstract: string;
  bbox: BoundingBox | null;
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

const BASE_URL = 'https://portalmaps.com.br/geoserver/wms';

const PROXIES = [
  (url: string) => `https://corsproxy.io/?${encodeURIComponent(url)}`,
  (url: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
];

async function fetchWithProxy(url: string, options?: RequestInit): Promise<Response> {
  for (const proxyFn of PROXIES) {
    try {
      const proxyUrl = proxyFn(url);
      const response = await fetch(proxyUrl, options);
      if (response.ok) return response;
    } catch {
      continue;
    }
  }
  throw new Error('Todos os proxies falharam');
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

export async function fetchLayers(): Promise<Layer[]> {
  const url = `${BASE_URL}?service=WMS&version=1.3.0&request=GetCapabilities`;
  
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
        bbox: parseBoundingBox(bbox)
      });
    }
  });
  
  return layers;
}

export async function downloadLayerAsGeoJSON(layerName: string): Promise<{
  metadata: {
    source: string;
    layer: string;
    downloadedAt: string;
    totalFeatures: number;
  };
  geojson: unknown;
}> {
  const url = `${BASE_URL}?service=WFS&version=2.0.0&request=GetFeature&typeName=${layerName}&outputFormat=application/json&srsName=EPSG:4326&maxFeatures=1000`;
  
  const response = await fetchWithProxy(url, {
    headers: { 'Accept': 'application/json, application/geo+json, */*' }
  });
  
  const geoJSON = await response.json();
  
  return {
    metadata: {
      source: 'GeoData Brasil - Portal Maps WMS/WFS',
      layer: layerName,
      downloadedAt: new Date().toISOString(),
      totalFeatures: geoJSON.features?.length || 0
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

export type PlanType = 'gratuito' | 'profissional' | 'completo';

export function canAccessLayer(layerName: string, userPlan: PlanType): boolean {
  // Free layers accessible to everyone
  if (isLayerFree(layerName)) return true;
  
  // Completo plan has access to everything
  if (userPlan === 'completo') return true;
  
  // Profissional plan has access to most layers except premium
  if (userPlan === 'profissional') return true;
  
  // Gratuito only has access to free layers
  return false;
}
