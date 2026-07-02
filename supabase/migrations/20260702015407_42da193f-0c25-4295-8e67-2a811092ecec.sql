CREATE POLICY "Admins upload custom geodata" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'custom-geodata' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins update custom geodata" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'custom-geodata' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins delete custom geodata" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'custom-geodata' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Premium users read custom geodata" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'custom-geodata'
    AND (public.has_premium_plan(auth.uid()) OR public.has_role(auth.uid(), 'admin'))
  );