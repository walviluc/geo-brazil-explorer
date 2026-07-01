// Curated list of public Brazilian geographic data providers.
// Sourced from INDE (Infraestrutura Nacional de Dados Espaciais) catalog
// at https://inde.gov.br/api/catalogo/get — filtered for diversified,
// well-known GeoServer-based endpoints that support WMS + WFS.

export interface DataSource {
  id: string;
  label: string;
  description: string;
  /** Base OWS/WMS endpoint (no query string). */
  url: string;
  category: 'geral' | 'ambiente' | 'territorio' | 'infraestrutura' | 'recursos' | 'social';
}

export const DATA_SOURCES: DataSource[] = [
  {
    id: 'portalmaps',
    label: 'Portal Maps (Padrão)',
    description: 'Dados agregados por estado — fonte original da plataforma.',
    url: 'https://portalmaps.com.br/geoserver/wms',
    category: 'geral',
  },
  {
    id: 'ibge',
    label: 'IBGE — Geografia e Estatística',
    description: 'Malhas territoriais, limites, cartografia oficial do Brasil.',
    url: 'https://geoservicos.ibge.gov.br/geoserver/ows',
    category: 'territorio',
  },
  {
    id: 'ibge-censo',
    label: 'IBGE — Censo Demográfico 2022',
    description: 'Setores censitários e indicadores populacionais do Censo 2022.',
    url: 'https://geoservicoscenso2022.ibge.gov.br/geoserver/censo2022/ows',
    category: 'social',
  },
  {
    id: 'inpe',
    label: 'INPE — TerraBrasilis',
    description: 'Desmatamento, queimadas e monitoramento ambiental via satélite.',
    url: 'https://terrabrasilis.dpi.inpe.br/geoserver/ows',
    category: 'ambiente',
  },
  {
    id: 'ibama',
    label: 'IBAMA — Meio Ambiente',
    description: 'Áreas embargadas, autuações e fiscalização ambiental.',
    url: 'https://siscom.ibama.gov.br/geoserver/ows',
    category: 'ambiente',
  },
  {
    id: 'icmbio',
    label: 'ICMBio — Unidades de Conservação',
    description: 'Parques nacionais, reservas e áreas protegidas federais.',
    url: 'https://geoservicos.inde.gov.br/geoserver/ICMBio/ows',
    category: 'ambiente',
  },
  {
    id: 'mma',
    label: 'MMA — Ministério do Meio Ambiente',
    description: 'Biomas, mata atlântica, cerrado e políticas ambientais.',
    url: 'https://geoservicos.inde.gov.br/geoserver/MMA/ows',
    category: 'ambiente',
  },
  {
    id: 'funai',
    label: 'FUNAI — Terras Indígenas',
    description: 'Delimitação e situação fundiária das terras indígenas.',
    url: 'https://geoserver.funai.gov.br/geoserver/ows',
    category: 'territorio',
  },
  {
    id: 'anp',
    label: 'ANP — Petróleo e Gás',
    description: 'Blocos, campos e infraestrutura de petróleo e gás natural.',
    url: 'https://gishub.anp.gov.br/geoserver/ows',
    category: 'recursos',
  },
  {
    id: 'anm',
    label: 'ANM — Mineração',
    description: 'Processos, concessões e áreas de mineração no Brasil.',
    url: 'https://geoservicos.inde.gov.br/geoserver/ANM/ows',
    category: 'recursos',
  },
  {
    id: 'cprm',
    label: 'CPRM/SGB — Serviço Geológico',
    description: 'Cartas geológicas, hidrogeologia e recursos minerais.',
    url: 'https://geoservicos.sgb.gov.br/geoserver/geologia/ows',
    category: 'recursos',
  },
  {
    id: 'embrapa',
    label: 'EMBRAPA — Pesquisa Agropecuária',
    description: 'Solos, aptidão agrícola e uso e cobertura da terra.',
    url: 'https://geoinfo.dados.embrapa.br/geoserver/ows',
    category: 'ambiente',
  },
  {
    id: 'mapa',
    label: 'MAPA — Agricultura e Pecuária',
    description: 'Zoneamento agrícola, defesa e produção rural.',
    url: 'https://geoservicos.inde.gov.br/geoserver/MAPA/ows',
    category: 'recursos',
  },
  {
    id: 'sfb',
    label: 'SFB — Serviço Florestal Brasileiro',
    description: 'Concessões florestais e cadastro nacional de florestas públicas.',
    url: 'https://sistemas.florestal.gov.br/geoserver/ows',
    category: 'ambiente',
  },
  {
    id: 'dnit',
    label: 'DNIT — Infraestrutura de Transportes',
    description: 'Rodovias federais, pontes e obras de infraestrutura.',
    url: 'https://geoservicos.inde.gov.br/geoserver/DNIT/ows',
    category: 'infraestrutura',
  },
  {
    id: 'anatel',
    label: 'ANATEL — Telecomunicações',
    description: 'Cobertura de telefonia, antenas e infraestrutura de telecom.',
    url: 'https://sistemas.anatel.gov.br/geoserver/ows',
    category: 'infraestrutura',
  },
  {
    id: 'iphan',
    label: 'IPHAN — Patrimônio Histórico',
    description: 'Bens tombados e patrimônio cultural brasileiro.',
    url: 'https://geoserver.iphan.gov.br/geoserver/ows',
    category: 'social',
  },
];

export const DEFAULT_SOURCE = DATA_SOURCES[0];

export function getSourceById(id: string): DataSource {
  return DATA_SOURCES.find(s => s.id === id) ?? DEFAULT_SOURCE;
}
