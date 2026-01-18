// INDE - Infraestrutura Nacional de Dados Espaciais
// API de Catálogo de Geoserviços

export interface INDEGeoService {
  id: number;
  nome: string;
  descricao: string;
  url: string;
  tipo: string;
  instituicao: string;
  tema: string;
  dataCriacao?: string;
  dataAtualizacao?: string;
}

export interface Layer {
  id: string;
  name: string;
  title: string;
  abstract: string;
  serviceUrl: string;
  serviceType: string;
  institution: string;
  theme: string;
  bbox: BoundingBox | null;
}

export interface BoundingBox {
  minx: number;
  miny: number;
  maxx: number;
  maxy: number;
}

// Temas disponíveis no INDE
export const INDE_THEMES: Record<string, string> = {
  "Agricultura": "Agricultura",
  "Água": "Água",
  "Biodiversidade": "Biodiversidade",
  "Biomas": "Biomas",
  "Cartografia": "Cartografia",
  "Clima": "Clima",
  "Economia": "Economia",
  "Educação": "Educação",
  "Energia": "Energia",
  "Estrutura": "Estrutura",
  "Fronteiras": "Fronteiras",
  "Geodésia": "Geodésia",
  "Geologia": "Geologia",
  "Hidrografia": "Hidrografia",
  "Imagens": "Imagens",
  "Limites": "Limites",
  "Localidades": "Localidades",
  "Meio Ambiente": "Meio Ambiente",
  "Mineração": "Mineração",
  "Planejamento": "Planejamento",
  "População": "População",
  "Relevo": "Relevo",
  "Saúde": "Saúde",
  "Segurança": "Segurança",
  "Sócio-economia": "Sócio-economia",
  "Solos": "Solos",
  "Transporte": "Transporte",
  "Uso do Solo": "Uso do Solo",
  "Vegetação": "Vegetação"
};

// Instituições principais
export const INSTITUTIONS: Record<string, string> = {
  "IBGE": "Instituto Brasileiro de Geografia e Estatística",
  "ANA": "Agência Nacional de Águas",
  "INPE": "Instituto Nacional de Pesquisas Espaciais",
  "ICMBio": "Instituto Chico Mendes de Conservação da Biodiversidade",
  "IBAMA": "Instituto Brasileiro do Meio Ambiente",
  "FUNAI": "Fundação Nacional dos Povos Indígenas",
  "INCRA": "Instituto Nacional de Colonização e Reforma Agrária",
  "MMA": "Ministério do Meio Ambiente",
  "ANM": "Agência Nacional de Mineração",
  "EMBRAPA": "Empresa Brasileira de Pesquisa Agropecuária",
  "CPRM": "Serviço Geológico do Brasil"
};

const CORS_PROXIES = [
  (url: string) => `https://corsproxy.io/?${encodeURIComponent(url)}`,
  (url: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
];

async function fetchWithProxy(url: string, options?: RequestInit): Promise<Response> {
  // Try direct first
  try {
    const response = await fetch(url, {
      ...options,
      mode: 'cors'
    });
    if (response.ok) return response;
  } catch {
    // Fall through to proxies
  }

  // Try proxies
  for (const proxyFn of CORS_PROXIES) {
    try {
      const proxyUrl = proxyFn(url);
      const response = await fetch(proxyUrl, options);
      if (response.ok) return response;
    } catch {
      continue;
    }
  }
  throw new Error('Não foi possível conectar ao servidor INDE');
}

export async function fetchINDECatalog(): Promise<INDEGeoService[]> {
  const url = 'https://inde.gov.br/api/catalogo/get';
  
  const response = await fetchWithProxy(url, {
    headers: { 'Accept': 'application/json' }
  });
  
  const data = await response.json();
  return data as INDEGeoService[];
}

export async function fetchWMSLayers(serviceUrl: string): Promise<Layer[]> {
  const capabilitiesUrl = `${serviceUrl}?service=WMS&version=1.3.0&request=GetCapabilities`;
  
  const response = await fetchWithProxy(capabilitiesUrl, {
    headers: { 'Accept': 'application/xml, text/xml, */*' }
  });
  
  const text = await response.text();
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(text, 'text/xml');
  
  const parseError = xmlDoc.querySelector('parsererror');
  if (parseError) throw new Error('Erro ao parsear GetCapabilities');
  
  const layers: Layer[] = [];
  const layerElements = xmlDoc.querySelectorAll('Layer[queryable="1"]');
  
  layerElements.forEach(layer => {
    const name = layer.querySelector('Name')?.textContent;
    const title = layer.querySelector('Title')?.textContent || name;
    const abstract = layer.querySelector('Abstract')?.textContent || 'Sem descrição disponível';
    const bboxEl = layer.querySelector('BoundingBox, EX_GeographicBoundingBox');
    
    if (name) {
      layers.push({
        id: `${serviceUrl}::${name}`,
        name: name,
        title: title || name,
        abstract,
        serviceUrl,
        serviceType: 'WMS',
        institution: '',
        theme: '',
        bbox: bboxEl ? parseBoundingBox(bboxEl) : null
      });
    }
  });
  
  return layers;
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

export function groupServicesByTheme(services: INDEGeoService[]): Map<string, INDEGeoService[]> {
  const groups = new Map<string, INDEGeoService[]>();
  
  services.forEach(service => {
    const theme = service.tema || 'Outros';
    if (!groups.has(theme)) groups.set(theme, []);
    groups.get(theme)!.push(service);
  });
  
  return groups;
}

export function groupServicesByInstitution(services: INDEGeoService[]): Map<string, INDEGeoService[]> {
  const groups = new Map<string, INDEGeoService[]>();
  
  services.forEach(service => {
    const institution = service.instituicao || 'Outros';
    if (!groups.has(institution)) groups.set(institution, []);
    groups.get(institution)!.push(service);
  });
  
  return groups;
}

// Plan access control
export type PlanType = 'gratuito' | 'completo' | null;

// Services gratuitos - alguns serviços públicos básicos
export const FREE_SERVICES = [
  'IBGE',
  'INPE'
];

export function isServiceFree(institution: string): boolean {
  return FREE_SERVICES.some(free => 
    institution.toUpperCase().includes(free)
  );
}

export function canAccessService(institution: string, userPlan: PlanType): boolean {
  // User must be logged in
  if (userPlan === null) return false;
  
  // Free services accessible to all logged-in users
  if (isServiceFree(institution)) return true;
  
  // Completo plan has access to everything
  if (userPlan === 'completo') return true;
  
  // Gratuito only has access to free services
  return false;
}

export async function downloadLayerAsGeoJSON(
  serviceUrl: string,
  layerName: string, 
  startIndex: number = 0, 
  maxFeatures: number = 100
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
  // Try WFS first
  const wfsUrl = serviceUrl.replace(/\/wms\/?$/i, '/wfs');
  const url = `${wfsUrl}?service=WFS&version=2.0.0&request=GetFeature&typeName=${layerName}&outputFormat=application/json&srsName=EPSG:4326&startIndex=${startIndex}&count=${maxFeatures}`;
  
  const response = await fetchWithProxy(url, {
    headers: { 'Accept': 'application/json, application/geo+json, */*' }
  });
  
  const geoJSON = await response.json() as GeoJSON.FeatureCollection;
  const featuresCount = geoJSON.features?.length || 0;
  
  return {
    metadata: {
      source: 'INDE - Infraestrutura Nacional de Dados Espaciais',
      layer: layerName,
      downloadedAt: new Date().toISOString(),
      totalFeatures: featuresCount,
      startIndex,
      hasMore: featuresCount >= maxFeatures
    },
    geojson: geoJSON
  };
}

export const FEATURES_PER_PAGE = 100;
