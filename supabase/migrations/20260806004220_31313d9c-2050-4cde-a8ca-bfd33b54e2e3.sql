CREATE TABLE public.public_data_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  label text NOT NULL,
  description text NOT NULL DEFAULT '',
  url text NOT NULL,
  category text NOT NULL DEFAULT 'geral',
  enabled boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.public_data_sources TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.public_data_sources TO authenticated;
GRANT ALL ON public.public_data_sources TO service_role;

ALTER TABLE public.public_data_sources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view enabled public sources"
ON public.public_data_sources FOR SELECT TO authenticated
USING (enabled OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins manage public sources"
ON public.public_data_sources FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_public_data_sources_updated_at
BEFORE UPDATE ON public.public_data_sources
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.public_data_sources (slug, label, description, url, category, sort_order) VALUES
('ibge','IBGE — Geografia e Estatística','Malhas territoriais, limites, cartografia oficial do Brasil.','https://geoservicos.ibge.gov.br/geoserver/ows','territorio',10),
('ibge-censo','IBGE — Censo Demográfico 2022','Setores censitários e indicadores populacionais do Censo 2022.','https://geoservicoscenso2022.ibge.gov.br/geoserver/censo2022/ows','social',20),
('inpe','INPE — TerraBrasilis','Desmatamento, queimadas e monitoramento ambiental via satélite.','https://terrabrasilis.dpi.inpe.br/geoserver/ows','ambiente',30),
('icmbio','ICMBio — Unidades de Conservação','Parques nacionais, reservas e áreas protegidas federais.','https://geoservicos.inde.gov.br/geoserver/ICMBio/ows','ambiente',40),
('mma','MMA — Ministério do Meio Ambiente','Biomas, mata atlântica, cerrado e políticas ambientais.','https://geoservicos.inde.gov.br/geoserver/MMA/ows','ambiente',50),
('anp','ANP — Petróleo e Gás','Blocos, campos e infraestrutura de petróleo e gás natural.','https://gishub.anp.gov.br/geoserver/ows','recursos',60),
('cprm','CPRM/SGB — Serviço Geológico','Cartas geológicas, hidrogeologia e recursos minerais.','https://geoservicos.sgb.gov.br/geoserver/geologia/ows','recursos',70),
('embrapa','EMBRAPA — Pesquisa Agropecuária','Solos, aptidão agrícola e uso e cobertura da terra.','https://geoinfo.dados.embrapa.br/geoserver/ows','ambiente',80),
('mapa','MAPA — Agricultura e Pecuária','Zoneamento agrícola, defesa e produção rural.','https://geoservicos.inde.gov.br/geoserver/MAPA/ows','recursos',90),
('sfb','SFB — Serviço Florestal Brasileiro','Concessões florestais e cadastro nacional de florestas públicas.','https://sistemas.florestal.gov.br/geoserver/ows','ambiente',100),
('dnit','DNIT — Infraestrutura de Transportes','Rodovias federais, pontes e obras de infraestrutura.','https://geoservicos.inde.gov.br/geoserver/DNIT/ows','infraestrutura',110),
('anatel','ANATEL — Telecomunicações','Cobertura de telefonia, antenas e infraestrutura de telecom.','https://sistemas.anatel.gov.br/geoserver/ows','infraestrutura',120),
('iphan','IPHAN — Patrimônio Histórico','Bens tombados e patrimônio cultural brasileiro.','https://geoserver.iphan.gov.br/geoserver/ows','social',130);