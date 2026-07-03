
ALTER TABLE public.custom_data_sources
  ADD COLUMN IF NOT EXISTS geojson_premium boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS kml_premium boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS shapefile_premium boolean NOT NULL DEFAULT false;

-- Allow every authenticated user to see the catalog; per-format access is
-- enforced on download (edge function) and in the UI.
DROP POLICY IF EXISTS "Premium users can view sources" ON public.custom_data_sources;
CREATE POLICY "Authenticated can view sources"
  ON public.custom_data_sources
  FOR SELECT
  TO authenticated
  USING (true);
