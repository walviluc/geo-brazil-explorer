DROP POLICY IF EXISTS "Anyone can view enabled plans" ON public.plans;

CREATE POLICY "Public can view enabled plans" ON public.plans
FOR SELECT TO anon
USING (enabled);

CREATE POLICY "Authenticated can view plans" ON public.plans
FOR SELECT TO authenticated
USING (enabled OR has_role(auth.uid(), 'admin'::app_role));