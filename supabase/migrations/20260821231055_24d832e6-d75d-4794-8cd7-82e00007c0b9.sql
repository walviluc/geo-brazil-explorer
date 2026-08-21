CREATE TABLE public.plans (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  monthly_price numeric NOT NULL DEFAULT 0,
  yearly_price numeric NOT NULL DEFAULT 0,
  features text[] NOT NULL DEFAULT '{}',
  excluded text[] NOT NULL DEFAULT '{}',
  cta text NOT NULL DEFAULT 'Assinar',
  popular boolean NOT NULL DEFAULT false,
  enabled boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT ON public.plans TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.plans TO authenticated;
GRANT ALL ON public.plans TO service_role;

ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view enabled plans" ON public.plans
FOR SELECT USING (enabled OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins manage plans" ON public.plans
FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_plans_updated_at
BEFORE UPDATE ON public.plans
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.plans (slug, name, description, monthly_price, yearly_price, features, excluded, cta, popular, sort_order) VALUES
('gratuito', 'Gratuito', 'Todos os dados públicos oficiais, sem custo', 0, 0,
 ARRAY['Acesso a TODAS as fontes públicas oficiais (IBGE, INPE, IBAMA, FUNAI, ICMBio, EMBRAPA e mais)','Visualização e download em GeoJSON','Busca por estado e tema','500+ camadas gratuitas'],
 ARRAY['Catálogo Premium interno (shapefiles curados por estado)','Suporte dedicado'],
 'Começar Grátis', false, 1),
('profissional', 'Profissional', 'Catálogo Premium curado + tudo do Gratuito', 29.90, 20,
 ARRAY['Tudo do plano Gratuito','Acesso ao Catálogo Premium interno','Shapefiles curados por estado','Dados exclusivos gerenciados pela plataforma','Suporte por email'],
 ARRAY['Suporte prioritário 24/7'],
 'Assinar Profissional', true, 2),
('completo', 'Completo', 'Premium + suporte dedicado para empresas', 60, 45,
 ARRAY['Tudo do plano Profissional','Acesso completo ao Catálogo Premium','Suporte prioritário 24/7','Atendimento a demandas específicas','Exportação em múltiplos formatos'],
 ARRAY[]::text[],
 'Assinar Completo', false, 3);