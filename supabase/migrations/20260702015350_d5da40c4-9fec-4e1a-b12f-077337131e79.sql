-- Roles
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE POLICY "Users can view their own roles" ON public.user_roles
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all roles" ON public.user_roles
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins manage roles" ON public.user_roles
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Helper: check if user has premium (profissional/completo) subscription
CREATE OR REPLACE FUNCTION public.has_premium_plan(_user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.subscriptions
    WHERE user_id = _user_id
      AND status = 'active'
      AND plan IN ('profissional', 'completo')
  );
$$;

-- Custom data sources catalog
CREATE TABLE public.custom_data_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  uf text,
  layer_name text NOT NULL,
  storage_path text NOT NULL,
  file_format text NOT NULL DEFAULT 'geojson' CHECK (file_format IN ('geojson','shapefile')),
  required_plan text NOT NULL DEFAULT 'profissional' CHECK (required_plan IN ('profissional','completo')),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.custom_data_sources TO authenticated;
GRANT ALL ON public.custom_data_sources TO service_role;

ALTER TABLE public.custom_data_sources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Premium users can view sources" ON public.custom_data_sources
  FOR SELECT TO authenticated
  USING (public.has_premium_plan(auth.uid()) OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins manage sources" ON public.custom_data_sources
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_custom_data_sources_updated_at
  BEFORE UPDATE ON public.custom_data_sources
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_custom_sources_uf ON public.custom_data_sources(uf);
CREATE INDEX idx_custom_sources_plan ON public.custom_data_sources(required_plan);